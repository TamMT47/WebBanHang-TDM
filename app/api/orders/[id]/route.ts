import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    const hasFinancialAccess = user ? canViewSensitiveFinancials(user.role) : false;

    const { id } = params;

    const orderRes = await query(
      `SELECT o.*, p.name AS partner_name, p.phone AS partner_phone, p.address AS partner_address, p.cccd AS partner_cccd, u.full_name AS creator_name, s.full_name AS seller_name
       FROM orders o
       LEFT JOIN partners p ON o.partner_id = p.id
       LEFT JOIN users u ON o.created_by = u.id
       LEFT JOIN users s ON o.seller_id = s.id
       WHERE o.id = $1 OR o.code = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    const order = orderRes.rows[0];

    const itemsRes = await query(
      `SELECT 
        oi.*,
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
       WHERE oi.order_id = $1`,
      [order.id]
    );

    order.items = itemsRes.rows;

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Order GET by ID error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
