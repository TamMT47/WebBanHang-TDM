import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials, canManageUsers } from '@/lib/auth';
import { notifySaleOrder, notifyImportOrder } from '@/lib/telegram';
import { POSSalePayload, ImportOrderPayload } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const hasFinancialAccess = user ? canViewSensitiveFinancials(user.role) : false;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || ''; // 'sell', 'import', 'all'
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let sql = `
      SELECT 
        o.id,
        o.code,
        o.type,
        o.partner_id,
        o.total_amount,
        o.discount,
        o.trade_in_value,
        o.final_payment,
        o.paid_amount,
        o.payment_method,
        o.debt_added,
        o.created_by,
        o.created_at,
        p.name AS partner_name,
        p.phone AS partner_phone,
        p.address AS partner_address,
        p.cccd AS partner_cccd,
        u.full_name AS creator_name
      FROM orders o
      LEFT JOIN partners p ON o.partner_id = p.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type && type !== 'all') {
      params.push(type);
      sql += ` AND o.type = $${params.length}`;
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (o.code ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.phone ILIKE $${params.length})`;
    }

    if (dateFrom) {
      params.push(`${dateFrom} 00:00:00`);
      sql += ` AND o.created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(`${dateTo} 23:59:59`);
      sql += ` AND o.created_at <= $${params.length}`;
    }

    sql += ` ORDER BY o.created_at DESC LIMIT ${limit}`;

    const ordersRes = await query(sql, params);
    const orders = ordersRes.rows;

    // Fetch items for these orders
    if (orders.length > 0) {
      const orderIds = orders.map((o) => `'${o.id}'`).join(',');
      const itemsSql = `
        SELECT 
          oi.id,
          oi.order_id,
          oi.inventory_id,
          oi.price,
          oi.warranty_months,
          oi.warranty_until,
          i.imei,
          ${hasFinancialAccess ? 'i.cost_price,' : '0 AS cost_price,'}
          i.battery_health,
          p.name AS product_name,
          p.category,
          p.condition,
          p.color,
          p.storage
        FROM order_items oi
        LEFT JOIN inventory i ON oi.inventory_id = i.id
        LEFT JOIN products p ON i.product_id = p.id
        WHERE oi.order_id IN (${orderIds})
      `;
      const itemsRes = await query(itemsSql);
      const itemsByOrder: Record<string, any[]> = {};
      for (const item of itemsRes.rows) {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      }

      for (const order of orders) {
        order.items = itemsByOrder[order.id] || [];
      }
    }

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await getClient();
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const { orderType } = body; // 'sell' or 'import'

    await client.query('BEGIN');

    if (orderType === 'sell' || !orderType) {
      // ----------------------------------------------------
      // POS BÁN HÀNG
      // ----------------------------------------------------
      const payload = body as POSSalePayload;
      const { customer, items, discount = 0, trade_in, paid_amount, payment_method, note } = payload;

      if (!items || items.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Đơn hàng không có sản phẩm nào' }, { status: 400 });
      }

      if (!customer || !customer.phone) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Vui lòng cung cấp thông tin số điện thoại khách hàng' }, { status: 400 });
      }

      // 1. Partner handling (Find or Create customer)
      let partnerId = customer.id;
      if (!partnerId) {
        const pRes = await client.query('SELECT id, name, phone, debt FROM partners WHERE phone = $1', [
          customer.phone.trim(),
        ]);
        if (pRes.rows.length > 0) {
          partnerId = pRes.rows[0].id;
          // Update customer name/address/cccd if changed
          await client.query(
            'UPDATE partners SET name = COALESCE($1, name), address = COALESCE($2, address), cccd = COALESCE($3, cccd) WHERE id = $4',
            [customer.name?.trim() || pRes.rows[0].name, customer.address, customer.cccd, partnerId]
          );
        } else {
          const newP = await client.query(
            `INSERT INTO partners (name, phone, address, cccd, type, debt)
             VALUES ($1, $2, $3, $4, 'customer', 0)
             RETURNING id`,
            [customer.name.trim(), customer.phone.trim(), customer.address || '', customer.cccd || '']
          );
          partnerId = newP.rows[0].id;
        }
      }

      // 2. Calculate totals
      let totalAmount = 0;
      const telegramItems: Array<{ name: string; imei: string; price: number; warranty: number }> = [];

      for (const item of items) {
        totalAmount += parseFloat(item.price as any) || 0;
      }

      const tradeInVal = trade_in ? parseFloat(trade_in.trade_in_value as any) || 0 : 0;
      const discountVal = parseFloat(discount as any) || 0;
      const finalPayment = Math.max(0, totalAmount - discountVal - tradeInVal);
      const paidAmount = parseFloat(paid_amount as any) || 0;
      
      const overpaidAction = payload.overpaid_action || 'refund';
      let debtAdded = 0;
      let actualCashFlowAmount = paidAmount;

      if (paidAmount < finalPayment) {
        // Customer underpaid: difference is added to debt
        debtAdded = finalPayment - paidAmount;
        actualCashFlowAmount = paidAmount;
      } else if (paidAmount > finalPayment) {
        if (overpaidAction === 'refund') {
          // Option A: Change returned to customer -> debt added is 0, cash flow is exactly finalPayment
          debtAdded = 0;
          actualCashFlowAmount = finalPayment;
        } else {
          // Option B: Excess credited to customer's account (deduct debt or become store debt to customer)
          debtAdded = finalPayment - paidAmount; // negative value
          actualCashFlowAmount = paidAmount;
        }
      } else {
        debtAdded = 0;
        actualCashFlowAmount = finalPayment;
      }

      // 3. Create Order Code
      const code = `HD${Date.now().toString().slice(-6)}`;

      const orderInsertRes = await client.query(
        `INSERT INTO orders (code, type, partner_id, total_amount, discount, trade_in_value, final_payment, paid_amount, payment_method, debt_added, created_by)
         VALUES ($1, 'sell', $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          code,
          partnerId,
          totalAmount,
          discountVal,
          tradeInVal,
          finalPayment,
          paidAmount,
          payment_method || 'cash',
          debtAdded,
          user.id,
        ]
      );
      const newOrder = orderInsertRes.rows[0];

      // 4. Process sold inventory items
      for (const item of items) {
        // Fetch inventory info
        const invRes = await client.query(
          `SELECT i.id, i.imei, p.name AS product_name
           FROM inventory i
           JOIN products p ON i.product_id = p.id
           WHERE i.id = $1 FOR UPDATE`,
          [item.inventory_id]
        );

        if (invRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `Không tìm thấy sản phẩm tồn kho ID: ${item.inventory_id}` }, { status: 400 });
        }

        const invItem = invRes.rows[0];
        telegramItems.push({
          name: invItem.product_name,
          imei: invItem.imei,
          price: item.price,
          warranty: item.warranty_months || 12,
        });

        // Insert order_item
        const warrantyMonths = item.warranty_months || 12;
        await client.query(
          `INSERT INTO order_items (order_id, inventory_id, price, warranty_months, warranty_until)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${warrantyMonths} months')`,
          [newOrder.id, item.inventory_id, item.price, warrantyMonths]
        );

        // Mark inventory as SOLD
        await client.query(`UPDATE inventory SET status = 'sold' WHERE id = $1`, [item.inventory_id]);
      }

      // 5. Process Trade-in Machine if available
      let tradeInCreatedItem = null;
      if (trade_in && tradeInVal > 0 && trade_in.imei) {
        const cleanImei = trade_in.imei.trim();

        // Check if IMEI is currently active in stock
        const checkActive = await client.query(
          "SELECT id FROM inventory WHERE imei = $1 AND status = 'in_stock'",
          [cleanImei]
        );
        if (checkActive.rows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: `Máy thu cũ có IMEI ${cleanImei} hiện đang có sẵn trong kho (Còn Hàng)! Không thể thu lại máy đang tồn kho.` },
            { status: 400 }
          );
        }

        // Clean product name - prevent creating junk suffixes like [Hàng Trade-in]
        const cleanModelName = (trade_in.name || 'iPhone 11').replace(/\[.*?\]/g, '').trim();
        const tradeInStorage = (trade_in.storage || '').trim();
        const tradeInCondition = (trade_in.condition || '99%').trim();
        const tradeInColor = (trade_in.color || '').trim();

        // 1. Find or create fixed partner "Khách Trade-in"
        let tradeInSupplierId = partnerId;
        const suppCheck = await client.query(
          "SELECT id FROM partners WHERE name = 'Khách Trade-in' LIMIT 1"
        );
        if (suppCheck.rows.length > 0) {
          tradeInSupplierId = suppCheck.rows[0].id;
        } else {
          const newSupp = await client.query(
            "INSERT INTO partners (name, phone, type, debt) VALUES ('Khách Trade-in', '0000000000', 'both', 0) RETURNING id"
          );
          tradeInSupplierId = newSupp.rows[0].id;
        }

        // 2. Find or create clean product in catalog
        let tradeInProdId: string;
        const existingProd = await client.query(
          `SELECT id FROM products 
           WHERE LOWER(name) = LOWER($1) 
             AND (storage = $2 OR ($2 = '' AND (storage IS NULL OR storage = '')))
             AND (condition = $3 OR ($3 = '' AND (condition IS NULL OR condition = '')))
           LIMIT 1`,
          [cleanModelName, tradeInStorage, tradeInCondition]
        );

        if (existingProd.rows.length > 0) {
          tradeInProdId = existingProd.rows[0].id;
        } else {
          const prodRes = await client.query(
            `INSERT INTO products (name, category, condition, color, storage)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              cleanModelName,
              trade_in.category || 'iPhone',
              tradeInCondition,
              tradeInColor,
              tradeInStorage,
            ]
          );
          tradeInProdId = prodRes.rows[0].id;
        }

        // 3. Insert into inventory as in_stock with supplier "Khách Trade-in"
        const tradeInvRes = await client.query(
          `INSERT INTO inventory (product_id, imei, cost_price, selling_price, battery_health, status, supplier_id)
           VALUES ($1, $2, $3, $4, $5, 'in_stock', $6)
           RETURNING *`,
          [
            tradeInProdId,
            cleanImei,
            tradeInVal,
            Math.round(tradeInVal * 1.15), // suggested selling price
            trade_in.battery_health || 85,
            tradeInSupplierId,
          ]
        );
        tradeInCreatedItem = tradeInvRes.rows[0];
      }

      // 6. Update Partner Debt if debt added or deducted
      if (debtAdded !== 0) {
        await client.query('UPDATE partners SET debt = debt + $1 WHERE id = $2', [debtAdded, partnerId]);
      }

      // 7. Cash Flow record (Phiếu Thu)
      if (actualCashFlowAmount > 0) {
        const ptCode = `PT-${Date.now().toString().slice(-6)}`;
        const actualMethod = payment_method === 'both' ? 'cash' : payment_method;
        await client.query(
          `INSERT INTO cash_flow (code, type, amount, payment_method, category, partner_id, order_id, note, created_by)
           VALUES ($1, 'thu', $2, $3, 'ban_hang', $4, $5, $6, $7)`,
          [
            ptCode,
            actualCashFlowAmount,
            actualMethod,
            partnerId,
            newOrder.id,
            note || `Thu tiền bán hàng hóa đơn ${code}`,
            user.id,
          ]
        );
      }

      await client.query('COMMIT');

      // 8. Trigger Telegram notification asynchronously
      notifySaleOrder({
        orderCode: code,
        customerName: customer.name,
        customerPhone: customer.phone,
        sellerName: user.full_name,
        items: telegramItems,
        totalAmount,
        discount: discountVal,
        tradeInValue: tradeInVal,
        finalPayment,
        paidAmount,
        debtAdded,
        paymentMethod: payment_method,
        tradeInItem:
          trade_in && tradeInVal > 0
            ? { name: trade_in.name, imei: trade_in.imei, value: tradeInVal }
            : null,
      }).catch((err) => console.error('Telegram background error:', err));

      return NextResponse.json({
        success: true,
        order: newOrder,
        code,
      });
    } else {
      // ----------------------------------------------------
      // NHẬP HÀNG TỪ NHÀ CUNG CẤP
      // ----------------------------------------------------
      const { supplier, items, paid_amount = 0, payment_method = 'transfer', note } = body;

      if (!items || items.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Đơn nhập không có sản phẩm nào' }, { status: 400 });
      }

      // 1. Supplier handling (Rock-solid resolution)
      let supplierId = supplier?.id;
      let supplierName = supplier?.name?.trim();

      if (!supplierId) {
        if (!supplierName) {
          supplierName = 'Nhà Cung Cấp Tổng';
        }
        const suppPhone = supplier?.phone?.trim() || '';
        
        let sRes;
        if (suppPhone) {
          sRes = await client.query('SELECT id, name, phone, debt FROM partners WHERE phone = $1', [suppPhone]);
        } else {
          sRes = await client.query('SELECT id, name, phone, debt FROM partners WHERE name = $1 AND type = \'supplier\'', [supplierName]);
        }

        if (sRes && sRes.rows.length > 0) {
          supplierId = sRes.rows[0].id;
        } else {
          const newS = await client.query(
            `INSERT INTO partners (name, phone, address, type, debt)
             VALUES ($1, $2, $3, 'supplier', 0)
             RETURNING id, name`,
            [supplierName, suppPhone || `NCC-${Date.now().toString().slice(-4)}`, supplier?.address || '']
          );
          supplierId = newS.rows[0].id;
        }
      } else {
        const checkS = await client.query('SELECT name FROM partners WHERE id = $1', [supplierId]);
        if (checkS.rows.length > 0) {
          supplierName = checkS.rows[0].name;
        }
      }

      // 2. Calculate import total
      let totalImportAmount = 0;
      for (const it of items) {
        totalImportAmount += (parseFloat(it.cost_price as any) || 0);
      }

      const paidAmount = parseFloat(paid_amount as any) || 0;
      const debtAdded = Math.max(0, totalImportAmount - paidAmount);

      const code = `NH${Date.now().toString().slice(-6)}`;

      const orderRes = await client.query(
        `INSERT INTO orders (code, type, partner_id, total_amount, discount, trade_in_value, final_payment, paid_amount, payment_method, debt_added, created_by)
         VALUES ($1, 'import', $2, $3, 0, 0, $3, $4, $5, $6, $7)
         RETURNING *`,
        [code, supplierId, totalImportAmount, paidAmount, payment_method, debtAdded, user.id]
      );
      const newOrder = orderRes.rows[0];

      // 3. Process items into products and inventory
      for (const item of items) {
        const cleanImei = item.imei.trim();

        // Check if IMEI is currently active in stock
        const checkActive = await client.query(
          "SELECT id FROM inventory WHERE imei = $1 AND status = 'in_stock'",
          [cleanImei]
        );
        if (checkActive.rows.length > 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: `Mã IMEI ${cleanImei} hiện đang có trong kho (Trạng thái: Còn Hàng)! Không thể nhập trùng.` },
            { status: 400 }
          );
        }

        let prodId = item.product_id;

        if (!prodId) {
          // If no product_id supplied, create or find product by name
          const pName = item.product_name || 'iPhone';
          const prodRes = await client.query(
            `INSERT INTO products (name, category, condition, color, storage)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              pName.trim(),
              item.category || 'iPhone',
              item.condition || '99%',
              item.color || '',
              item.storage || '',
            ]
          );
          prodId = prodRes.rows[0].id;
        }

        // Insert inventory
        const invRes = await client.query(
          `INSERT INTO inventory (product_id, imei, cost_price, selling_price, battery_health, status, supplier_id)
           VALUES ($1, $2, $3, $4, $5, 'in_stock', $6)
           RETURNING id`,
          [
            prodId,
            cleanImei,
            parseFloat(item.cost_price as any) || 0,
            parseFloat(item.selling_price as any) || 0,
            parseInt(item.battery_health as any, 10) || 100,
            supplierId,
          ]
        );

        // Insert order_item
        await client.query(
          `INSERT INTO order_items (order_id, inventory_id, price, warranty_months)
           VALUES ($1, $2, $3, 0)`,
          [newOrder.id, invRes.rows[0].id, parseFloat(item.cost_price as any) || 0]
        );
      }

      // 4. Update Supplier Debt if debt added (Negative debt means shop owes supplier)
      if (debtAdded > 0) {
        await client.query('UPDATE partners SET debt = debt - $1 WHERE id = $2', [debtAdded, supplierId]);
      }

      // 5. Cash flow record (Phiếu Chi)
      if (paidAmount > 0) {
        const pcCode = `PC-${Date.now().toString().slice(-6)}`;
        await client.query(
          `INSERT INTO cash_flow (code, type, amount, payment_method, category, partner_id, order_id, note, created_by)
           VALUES ($1, 'chi', $2, $3, 'nhap_hang', $4, $5, $6, $7)`,
          [
            pcCode,
            paidAmount,
            payment_method === 'both' ? 'transfer' : payment_method,
            supplierId,
            newOrder.id,
            note || `Thanh toán tiền nhập hàng ${code}`,
            user.id,
          ]
        );
      }

      await client.query('COMMIT');

      // 6. Telegram notification
      notifyImportOrder({
        orderCode: code,
        supplierName: supplierName || 'Nhà Cung Cấp',
        staffName: user.full_name,
        totalAmount: totalImportAmount,
        paidAmount,
        debtAdded,
        itemCount: items.length,
      }).catch((err) => console.error('Telegram background error:', err));

      return NextResponse.json({
        success: true,
        order: newOrder,
        code,
      });
    }
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const client = await getClient();
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Chỉ Admin hoặc Chủ cửa hàng mới có quyền xóa/hủy hóa đơn' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID hóa đơn cần xóa' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Fetch Order details
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }
    const order = orderRes.rows[0];

    // 2. Fetch order items to revert inventory
    const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    if (order.type === 'sell') {
      // Revert sold inventory items back to 'in_stock'
      for (const item of itemsRes.rows) {
        if (item.inventory_id) {
          await client.query('UPDATE inventory SET status = \'in_stock\' WHERE id = $1', [item.inventory_id]);
        }
      }

      // Revert customer debt if debt was added
      if (order.debt_added !== 0 && order.partner_id) {
        await client.query('UPDATE partners SET debt = debt - $1 WHERE id = $2', [order.debt_added, order.partner_id]);
      }
    } else if (order.type === 'import') {
      // Revert supplier debt
      if (order.debt_added > 0 && order.partner_id) {
        await client.query('UPDATE partners SET debt = debt + $1 WHERE id = $2', [order.debt_added, order.partner_id]);
      }

      // Delete the imported inventory if not sold
      for (const item of itemsRes.rows) {
        if (item.inventory_id) {
          await client.query('DELETE FROM inventory WHERE id = $1 AND status = \'in_stock\'', [item.inventory_id]);
        }
      }
    }

    // 3. Delete linked cash flow records
    await client.query('DELETE FROM cash_flow WHERE order_id = $1', [id]);

    // 4. Delete order items & order
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    await client.query('DELETE FROM orders WHERE id = $1', [id]);

    await client.query('COMMIT');

    return NextResponse.json({ success: true, message: `Đã xóa thành công hóa đơn ${order.code}` });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Order DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
