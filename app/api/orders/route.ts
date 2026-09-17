import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials, canManageUsers } from '@/lib/auth';
import { notifySaleOrder, notifyImportOrder } from '@/lib/telegram';
import { POSSalePayload, ImportOrderPayload } from '@/types/database';

export const dynamic = 'force-dynamic';

function calculateItemCommission(price: number, condition: string = '', category: string = ''): number {
  const cat = (category || '').toLowerCase();
  if (cat.includes('phukien') || cat.includes('phụ kiện') || cat.includes('dichvu') || cat.includes('dịch vụ')) {
    return 0;
  }
  const cond = (condition || '').toLowerCase().trim();
  const isNew = cond === 'new' || cond === 'mới' || cond === 'mới 100%' || cond === '100%';
  if (isNew) {
    return 300000;
  }
  // Máy cũ: <5tr (200k), 5tr - 10tr (300k), 10tr - 15tr (400k), >15tr (500k)
  if (price < 5000000) return 200000;
  if (price < 10000000) return 300000;
  if (price < 15000000) return 400000;
  return 500000;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const hasFinancialAccess = user ? canViewSensitiveFinancials(user.role) : false;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || ''; // 'sell', 'import', 'all'
    const search = searchParams.get('search') || '';
    const partnerIdParam = searchParams.get('partner_id') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const onlyMine = searchParams.get('only_mine') === 'true' || searchParams.get('my_orders') === 'true';
    const userIdParam = searchParams.get('user_id') || '';
    const targetUserId = onlyMine ? (user?.id || '') : userIdParam;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

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
        o.seller_id,
        o.created_at,
        p.name AS partner_name,
        p.phone AS partner_phone,
        p.address AS partner_address,
        p.cccd AS partner_cccd,
        u.full_name AS creator_name,
        s.full_name AS seller_name
      FROM orders o
      LEFT JOIN partners p ON o.partner_id = p.id
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN users s ON o.seller_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type && type !== 'all') {
      params.push(type);
      sql += ` AND o.type = $${params.length}`;
    }

    if (partnerIdParam) {
      params.push(partnerIdParam);
      sql += ` AND o.partner_id = $${params.length}`;
    }

    if (targetUserId) {
      params.push(targetUserId);
      sql += ` AND (o.created_by = $${params.length} OR o.seller_id = $${params.length})`;
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (
        o.code ILIKE $${params.length} 
        OR p.name ILIKE $${params.length} 
        OR p.phone ILIKE $${params.length}
        OR EXISTS (
          SELECT 1 FROM order_items oi 
          JOIN inventory inv ON oi.inventory_id = inv.id 
          WHERE oi.order_id = o.id AND inv.imei ILIKE $${params.length}
        )
      )`;
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
        const itemComm = calculateItemCommission(parseFloat(item.price || 0), item.condition, item.category);
        item.commission = itemComm;
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      }

      for (const order of orders) {
        const orderItems = itemsByOrder[order.id] || [];
        order.items = orderItems;
        // If seller_id is assigned, compute commission sum
        order.commission_amount = order.seller_id
          ? orderItems.reduce((sum, it) => sum + (it.commission || 0), 0)
          : 0;
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
      const payload = body as any;
      const { items, discount = 0, paid_amount, payment_method, note } = payload;

      if (!items || items.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Đơn hàng không có sản phẩm nào' }, { status: 400 });
      }

      // Robust customer payload parsing (handles both object and flat properties)
      const customerObj = payload.customer || {
        id: payload.partner_id,
        name: payload.partner_name || 'Khách lẻ',
        phone: payload.partner_phone || '',
        address: payload.partner_address || '',
        cccd: payload.partner_cccd || '',
      };

      if (!customerObj || !customerObj.phone || !customerObj.phone.toString().trim()) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Vui lòng cung cấp thông tin số điện thoại khách hàng' }, { status: 400 });
      }

      // 1. Partner handling (Find or Create customer)
      let partnerId = customerObj.id;
      const cleanPhone = customerObj.phone.toString().trim();
      const cleanName = (customerObj.name || 'Khách lẻ').toString().trim();

      if (!partnerId) {
        const pRes = await client.query('SELECT id, name, phone, debt FROM partners WHERE phone = $1', [
          cleanPhone,
        ]);
        if (pRes.rows.length > 0) {
          partnerId = pRes.rows[0].id;
          // Update customer name/address/cccd if changed
          await client.query(
            'UPDATE partners SET name = COALESCE($1, name), address = COALESCE($2, address), cccd = COALESCE($3, cccd) WHERE id = $4',
            [cleanName || pRes.rows[0].name, customerObj.address, customerObj.cccd, partnerId]
          );
        } else {
          const newP = await client.query(
            `INSERT INTO partners (name, phone, address, cccd, type, debt)
             VALUES ($1, $2, $3, $4, 'customer', 0)
             RETURNING id`,
            [cleanName, cleanPhone, customerObj.address || '', customerObj.cccd || '']
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

      // Parse trade-in object
      const tradeInObj = payload.trade_in || payload.trade_in_item || null;
      const tradeInVal = tradeInObj
        ? parseFloat((tradeInObj.trade_in_value ?? tradeInObj.value) as any) || 0
        : parseFloat(payload.trade_in_value as any) || 0;

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
      // Mặc định 100% hóa đơn mới tạo là Khách của cửa hàng (seller_id = null).
      // Việc gán hoa hồng cá nhân chỉ thực hiện trong phần Chỉnh Sửa Hóa Đơn (bởi Admin/Quản lý).
      const sellerId = null;

      const orderInsertRes = await client.query(
        `INSERT INTO orders (code, type, partner_id, total_amount, discount, trade_in_value, final_payment, paid_amount, payment_method, debt_added, created_by, seller_id)
         VALUES ($1, 'sell', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
          sellerId,
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
      if (tradeInObj && tradeInVal > 0 && tradeInObj.imei) {
        const cleanImei = tradeInObj.imei.trim();

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
        const cleanModelName = (tradeInObj.model_name || tradeInObj.name || 'iPhone 11').replace(/\[.*?\]/g, '').trim();
        const tradeInStorage = (tradeInObj.storage || '').trim();
        const tradeInCondition = (tradeInObj.condition || '99%').trim();
        const tradeInColor = (tradeInObj.color || 'Mặc định').trim();
        const tradeInSelling = tradeInObj.selling_price
          ? parseFloat(tradeInObj.selling_price as any)
          : Math.round(tradeInVal * 1.15);

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
              tradeInObj.category || 'iPhone',
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
            tradeInSelling,
            tradeInObj.battery_health || 85,
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
        customerName: cleanName,
        customerPhone: cleanPhone,
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
          tradeInObj && tradeInVal > 0
            ? { name: tradeInObj.name || tradeInObj.model_name || 'iPhone', imei: tradeInObj.imei, value: tradeInVal }
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

export async function PATCH(request: NextRequest) {
  const client = await getClient();
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Quản lý, Chủ cửa hàng hoặc Admin mới có quyền chỉnh sửa hóa đơn' },
        { status: 403 }
      );
    }

    const payload = await request.json();
    const {
      order_id,
      partner_name,
      partner_phone,
      partner_address,
      partner_cccd,
      note,
      items,
      discount,
      paid_amount,
      payment_method,
      seller_id,
    } = payload;

    if (!order_id) {
      return NextResponse.json({ error: 'Thiếu ID hóa đơn cần chỉnh sửa' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Fetch Order details
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [order_id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }
    const order = orderRes.rows[0];

    // 2. Update Partner Info if provided
    if (
      order.partner_id &&
      (partner_name !== undefined ||
        partner_phone !== undefined ||
        partner_address !== undefined ||
        partner_cccd !== undefined)
    ) {
      await client.query(
        `UPDATE partners SET
          name = COALESCE($2, name),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          cccd = COALESCE($5, cccd)
        WHERE id = $1`,
        [
          order.partner_id,
          partner_name !== undefined ? partner_name.trim() : null,
          partner_phone !== undefined ? partner_phone.trim() : null,
          partner_address !== undefined ? partner_address.trim() : null,
          partner_cccd !== undefined ? partner_cccd.trim() : null,
        ]
      );
    }

    // 3. Update order_items (warranty_months, warranty_until, price)
    if (items && Array.isArray(items)) {
      for (const it of items) {
        if (it.id) {
          let calculatedUntil = it.warranty_until;
          if (!calculatedUntil && it.warranty_months !== undefined) {
            const orderDate = new Date(order.created_at || new Date());
            orderDate.setMonth(orderDate.getMonth() + parseInt(it.warranty_months, 10));
            calculatedUntil = orderDate.toISOString();
          }

          await client.query(
            `UPDATE order_items SET
              warranty_months = COALESCE($2, warranty_months),
              warranty_until = COALESCE($3, warranty_until),
              price = COALESCE($4, price)
            WHERE id = $1 AND order_id = $5`,
            [
              it.id,
              it.warranty_months !== undefined ? parseInt(it.warranty_months, 10) : null,
              calculatedUntil || null,
              it.price !== undefined ? parseFloat(it.price) : null,
              order_id,
            ]
          );
        }
      }
    }

    // 4. Recalculate totals
    const sumRes = await client.query(
      'SELECT COALESCE(SUM(price), 0) AS total_items_price FROM order_items WHERE order_id = $1',
      [order_id]
    );
    const newTotalAmount = parseFloat(sumRes.rows[0].total_items_price);
    const newDiscount = discount !== undefined ? parseFloat(discount) : parseFloat(order.discount || 0);
    const tradeInVal = parseFloat(order.trade_in_value || 0);
    const newFinalPayment = Math.max(0, newTotalAmount - newDiscount - tradeInVal);

    const newPaidAmount =
      paid_amount !== undefined ? parseFloat(paid_amount) : parseFloat(order.paid_amount || 0);
    const newDebtAdded = newFinalPayment - newPaidAmount;
    const oldDebtAdded = parseFloat(order.debt_added || 0);
    const debtDiff = newDebtAdded - oldDebtAdded;

    const isManagerOrAdmin = canViewSensitiveFinancials(user.role);
    const finalSellerId = isManagerOrAdmin
      ? (seller_id !== undefined ? (seller_id || null) : (order.seller_id || null))
      : (order.seller_id || null);

    // 5. Update Order record
    await client.query(
      `UPDATE orders SET
        total_amount = $2,
        discount = $3,
        final_payment = $4,
        paid_amount = $5,
        debt_added = $6,
        payment_method = COALESCE($7, payment_method),
        seller_id = $8
      WHERE id = $1`,
      [
        order_id,
        newTotalAmount,
        newDiscount,
        newFinalPayment,
        newPaidAmount,
        newDebtAdded,
        payment_method || null,
        finalSellerId,
      ]
    );

    // 6. Adjust partner debt if changed
    if (debtDiff !== 0 && order.partner_id) {
      await client.query('UPDATE partners SET debt = debt + $1 WHERE id = $2', [debtDiff, order.partner_id]);
    }

    // 7. Adjust cash flow if paid amount or payment method changed
    if (
      newPaidAmount !== parseFloat(order.paid_amount || 0) ||
      (payment_method && payment_method !== order.payment_method)
    ) {
      const cfMethod = payment_method === 'both' ? 'transfer' : payment_method || 'transfer';
      await client.query(
        `UPDATE cash_flow SET
          amount = $2,
          payment_method = COALESCE($3, payment_method),
          note = COALESCE($4, note)
        WHERE order_id = $1`,
        [order_id, newPaidAmount, cfMethod, note || undefined]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thành công hóa đơn ${order.code}`,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Order PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
