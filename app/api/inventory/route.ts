import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const hasFinancialAccess = user ? canViewSensitiveFinancials(user.role) : false;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const productId = searchParams.get('productId') || '';

    let sql = `
      SELECT 
        i.id,
        i.product_id,
        i.imei,
        i.selling_price,
        i.battery_health,
        i.status,
        i.supplier_id,
        i.created_at,
        ${hasFinancialAccess ? 'i.cost_price,' : '0 AS cost_price,'}
        p.name AS product_name,
        p.category,
        p.condition,
        p.color,
        p.storage,
        part.name AS supplier_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN partners part ON i.supplier_id = part.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (i.imei ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.color ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND i.status = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND p.category = $${params.length}`;
    }

    if (productId) {
      params.push(productId);
      sql += ` AND i.product_id = $${params.length}`;
    }

    // Sort inventory items alphabetically A-Z by Product Name, then newest items
    sql += ` ORDER BY p.name ASC, i.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json({ inventory: result.rows });
  } catch (error: any) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const {
      product_id,
      imei,
      cost_price,
      selling_price,
      battery_health,
      status,
      supplier_id,
    } = await request.json();

    if (!product_id || !imei) {
      return NextResponse.json(
        { error: 'Vui lòng chọn sản phẩm và nhập mã IMEI' },
        { status: 400 }
      );
    }

    // Check if IMEI is currently active in stock
    const existing = await query(
      "SELECT id, imei, status FROM inventory WHERE imei = $1 AND status = 'in_stock'",
      [imei.trim()]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Mã IMEI ${imei} hiện đang có trong kho (Trạng thái: Còn Hàng)! Không thể nhập trùng.` },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO inventory (product_id, imei, cost_price, selling_price, battery_health, status, supplier_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        product_id,
        imei.trim(),
        parseFloat(cost_price) || 0,
        parseFloat(selling_price) || 0,
        parseInt(battery_health) || 100,
        status || 'in_stock',
        supplier_id || null,
      ]
    );

    return NextResponse.json({ item: result.rows[0] });
  } catch (error: any) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { id, selling_price, cost_price, battery_health, status, imei } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID kho' }, { status: 400 });
    }

    // If imei is updated, verify it is not duplicated with another in_stock item
    if (imei !== undefined) {
      const checkDup = await query(
        "SELECT id FROM inventory WHERE imei = $1 AND status = 'in_stock' AND id != $2",
        [imei.trim(), id]
      );
      if (checkDup.rows.length > 0) {
        return NextResponse.json(
          { error: `Mã IMEI ${imei} đã có một máy khác đang Còn Hàng trong kho!` },
          { status: 400 }
        );
      }
    }

    const hasFinancialAccess = canViewSensitiveFinancials(user.role);

    let updateFields: string[] = [];
    let params: any[] = [id];

    if (selling_price !== undefined) {
      params.push(parseFloat(selling_price));
      updateFields.push(`selling_price = $${params.length}`);
    }

    if (cost_price !== undefined && hasFinancialAccess) {
      params.push(parseFloat(cost_price));
      updateFields.push(`cost_price = $${params.length}`);
    }

    if (battery_health !== undefined) {
      params.push(parseInt(battery_health, 10));
      updateFields.push(`battery_health = $${params.length}`);
    }

    if (status !== undefined) {
      params.push(status);
      updateFields.push(`status = $${params.length}`);
    }

    if (imei !== undefined) {
      params.push(imei.trim());
      updateFields.push(`imei = $${params.length}`);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'Không có thay đổi nào' });
    }

    const sql = `UPDATE inventory SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await query(sql, params);

    return NextResponse.json({ item: result.rows[0] });
  } catch (error: any) {
    console.error('Inventory PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canViewSensitiveFinancials(user.role)) {
      return NextResponse.json({ error: 'Không có quyền xóa sản phẩm tồn kho' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID kho' }, { status: 400 });
    }

    await query('DELETE FROM inventory WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Inventory DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
