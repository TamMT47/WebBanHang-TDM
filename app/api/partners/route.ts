import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || ''; // 'customer', 'supplier', 'both', 'all'
    const debtStatus = searchParams.get('debt_status') || 'all'; // 'all', 'has_debt', 'no_debt'
    const debtDays = searchParams.get('debt_days') || 'all'; // 'all', 'gt30', 'gt60', 'gt90'
    const sortBy = searchParams.get('sort_by') || 'debt_desc'; // 'debt_desc', 'debt_asc', 'days_desc', 'days_asc', 'created_desc', 'name_asc'

    let sql = `
      SELECT 
        p.*,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(o.final_payment), 0) AS total_spent,
        MAX(o.created_at) AS last_order_date,
        COALESCE(MIN(CASE WHEN o.debt_added != 0 THEN o.created_at END), p.created_at) AS oldest_debt_date,
        CASE 
          WHEN p.debt != 0 THEN 
            GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(MIN(CASE WHEN o.debt_added != 0 THEN o.created_at END), p.created_at)))::int)
          ELSE 0 
        END AS days_in_debt
      FROM partners p
      LEFT JOIN orders o ON p.id = o.partner_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Search filter
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.cccd ILIKE $${params.length})`;
    }

    // Type filter
    if (type && type !== 'all') {
      if (type === 'customer') {
        sql += ` AND (p.type = 'customer' OR p.type = 'both')`;
      } else if (type === 'supplier') {
        sql += ` AND (p.type = 'supplier' OR p.type = 'both')`;
      } else {
        params.push(type);
        sql += ` AND p.type = $${params.length}`;
      }
    }

    // Debt Status Filter
    if (debtStatus === 'has_debt') {
      sql += ` AND p.debt != 0`;
    } else if (debtStatus === 'no_debt') {
      sql += ` AND p.debt = 0`;
    }

    sql += ` GROUP BY p.id`;

    // Having clause for Debt Days filter if needed
    if (debtDays === 'gt30') {
      sql += ` HAVING CASE WHEN p.debt != 0 THEN GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(MIN(CASE WHEN o.debt_added != 0 THEN o.created_at END), p.created_at)))::int) ELSE 0 END >= 30`;
    } else if (debtDays === 'gt60') {
      sql += ` HAVING CASE WHEN p.debt != 0 THEN GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(MIN(CASE WHEN o.debt_added != 0 THEN o.created_at END), p.created_at)))::int) ELSE 0 END >= 60`;
    } else if (debtDays === 'gt90') {
      sql += ` HAVING CASE WHEN p.debt != 0 THEN GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(MIN(CASE WHEN o.debt_added != 0 THEN o.created_at END), p.created_at)))::int) ELSE 0 END >= 90`;
    }

    // Order By
    switch (sortBy) {
      case 'debt_desc':
        sql += ` ORDER BY ABS(p.debt) DESC, p.name ASC`;
        break;
      case 'debt_asc':
        sql += ` ORDER BY ABS(p.debt) ASC, p.name ASC`;
        break;
      case 'days_desc':
        sql += ` ORDER BY days_in_debt DESC, ABS(p.debt) DESC`;
        break;
      case 'days_asc':
        sql += ` ORDER BY days_in_debt ASC, ABS(p.debt) DESC`;
        break;
      case 'name_asc':
        sql += ` ORDER BY p.name ASC`;
        break;
      case 'created_desc':
      default:
        sql += ` ORDER BY p.created_at DESC`;
        break;
    }

    const result = await query(sql, params);

    // Calculate Overall Debt Statistics
    const statsRes = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN debt > 0 THEN debt ELSE 0 END), 0) AS total_customer_debt,
        COALESCE(SUM(CASE WHEN debt < 0 THEN ABS(debt) ELSE 0 END), 0) AS total_supplier_debt,
        COUNT(CASE WHEN debt > 0 THEN 1 END) AS customer_debtors_count,
        COUNT(CASE WHEN debt < 0 THEN 1 END) AS supplier_debtors_count,
        COUNT(CASE WHEN debt != 0 THEN 1 END) AS total_debtors_count
      FROM partners
    `);
    const stats = statsRes.rows[0];

    return NextResponse.json({
      partners: result.rows,
      stats: {
        total_customer_debt: parseFloat(stats.total_customer_debt),
        total_supplier_debt: parseFloat(stats.total_supplier_debt),
        customer_debtors_count: parseInt(stats.customer_debtors_count, 10),
        supplier_debtors_count: parseInt(stats.supplier_debtors_count, 10),
        total_debtors_count: parseInt(stats.total_debtors_count, 10),
      },
    });
  } catch (error: any) {
    console.error('Partners GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { name, phone, address, cccd, type, initial_debt, debt } = await request.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Vui lòng nhập tên và số điện thoại' }, { status: 400 });
    }

    // Check if phone exists
    const existing = await query('SELECT id, name, phone FROM partners WHERE phone = $1', [
      phone.trim(),
    ]);

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          error: `Số điện thoại ${phone} đã tồn tại với đối tác "${existing.rows[0].name}"`,
          partner: existing.rows[0],
        },
        { status: 409 }
      );
    }

    const startDebt = parseFloat(initial_debt || debt || 0);

    const result = await query(
      `INSERT INTO partners (name, phone, address, cccd, type, debt)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        phone.trim(),
        address || '',
        cccd || '',
        type || 'customer',
        startDebt,
      ]
    );

    return NextResponse.json({ partner: result.rows[0] });
  } catch (error: any) {
    console.error('Partners POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { id, name, phone, address, cccd, type } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID đối tác' }, { status: 400 });
    }

    const result = await query(
      `UPDATE partners
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           cccd = COALESCE($5, cccd),
           type = COALESCE($6, type)
       WHERE id = $1
       RETURNING *`,
      [id, name?.trim(), phone?.trim(), address, cccd, type]
    );

    return NextResponse.json({ partner: result.rows[0] });
  } catch (error: any) {
    console.error('Partners PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
