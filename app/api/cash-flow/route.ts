import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canViewSensitiveFinancials(user.role)) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập Sổ Quỹ' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || ''; // 'thu', 'chi', 'all'
    const category = searchParams.get('category') || '';
    const paymentMethod = searchParams.get('payment_method') || '';
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let sql = `
      SELECT 
        cf.*,
        p.name AS partner_name,
        p.phone AS partner_phone,
        u.full_name AS creator_name,
        o.code AS order_code
      FROM cash_flow cf
      LEFT JOIN partners p ON cf.partner_id = p.id
      LEFT JOIN users u ON cf.created_by = u.id
      LEFT JOIN orders o ON cf.order_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type && type !== 'all') {
      params.push(type);
      sql += ` AND cf.type = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND cf.category = $${params.length}`;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      params.push(paymentMethod);
      sql += ` AND cf.payment_method = $${params.length}`;
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (cf.code ILIKE $${params.length} OR cf.note ILIKE $${params.length} OR p.name ILIKE $${params.length})`;
    }

    if (dateFrom) {
      params.push(`${dateFrom} 00:00:00`);
      sql += ` AND cf.created_at >= $${params.length}`;
    }

    if (dateTo) {
      params.push(`${dateTo} 23:59:59`);
      sql += ` AND cf.created_at <= $${params.length}`;
    }

    sql += ` ORDER BY cf.created_at DESC LIMIT ${limit}`;

    const result = await query(sql, params);

    // 1. All-time summary balances
    const summaryRes = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'thu' AND payment_method = 'cash' THEN amount WHEN type = 'chi' AND payment_method = 'cash' THEN -amount ELSE 0 END), 0) AS total_cash,
        COALESCE(SUM(CASE WHEN type = 'thu' AND payment_method = 'transfer' THEN amount WHEN type = 'chi' AND payment_method = 'transfer' THEN -amount ELSE 0 END), 0) AS total_transfer,
        COALESCE(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0) AS all_time_thu,
        COALESCE(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0) AS all_time_chi
      FROM cash_flow
    `);

    const summary = summaryRes.rows[0];
    const totalCash = parseFloat(summary.total_cash);
    const totalTransfer = parseFloat(summary.total_transfer);
    const totalBalance = totalCash + totalTransfer;

    // 2. Periodic balances if dateFrom/dateTo are supplied
    let openingBalance = 0;
    let periodThu = 0;
    let periodChi = 0;
    let closingBalance = totalBalance;
    const isPeriodic = Boolean(dateFrom || dateTo);

    if (dateFrom) {
      const openingRes = await query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'thu' THEN amount WHEN type = 'chi' THEN -amount ELSE 0 END), 0) AS opening
         FROM cash_flow
         WHERE created_at < $1`,
        [`${dateFrom} 00:00:00`]
      );
      openingBalance = parseFloat(openingRes.rows[0].opening || 0);
    }

    if (isPeriodic) {
      const periodConditions: string[] = [];
      const periodParams: any[] = [];
      if (dateFrom) {
        periodParams.push(`${dateFrom} 00:00:00`);
        periodConditions.push(`created_at >= $${periodParams.length}`);
      }
      if (dateTo) {
        periodParams.push(`${dateTo} 23:59:59`);
        periodConditions.push(`created_at <= $${periodParams.length}`);
      }

      const periodRes = await query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'thu' THEN amount ELSE 0 END), 0) AS p_thu,
          COALESCE(SUM(CASE WHEN type = 'chi' THEN amount ELSE 0 END), 0) AS p_chi
         FROM cash_flow
         WHERE ${periodConditions.length > 0 ? periodConditions.join(' AND ') : '1=1'}`,
        periodParams
      );

      periodThu = parseFloat(periodRes.rows[0].p_thu || 0);
      periodChi = parseFloat(periodRes.rows[0].p_chi || 0);
      closingBalance = openingBalance + periodThu - periodChi;
    } else {
      periodThu = parseFloat(summary.all_time_thu);
      periodChi = parseFloat(summary.all_time_chi);
      closingBalance = totalBalance;
    }

    return NextResponse.json({
      cash_flow: result.rows,
      summary: {
        total_cash: totalCash,
        total_transfer: totalTransfer,
        total_balance: totalBalance,
        all_time_thu: parseFloat(summary.all_time_thu),
        all_time_chi: parseFloat(summary.all_time_chi),
        // Periodic stats
        is_periodic: isPeriodic,
        opening_balance: openingBalance,
        period_thu: periodThu,
        period_chi: periodChi,
        closing_balance: closingBalance,
      },
    });
  } catch (error: any) {
    console.error('Cash flow GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canViewSensitiveFinancials(user.role)) {
      return NextResponse.json({ error: 'Không có quyền tạo phiếu thu chi' }, { status: 403 });
    }

    const { type, amount, payment_method, category, partner_id, note } = await request.json();

    const numAmount = parseFloat(amount);
    if (!type || !numAmount || numAmount <= 0 || !category) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp loại phiếu, số tiền và nhóm chi phí hợp lệ' },
        { status: 400 }
      );
    }

    const codePrefix = type === 'thu' ? 'PT' : 'PC';
    const code = `${codePrefix}-${Date.now().toString().slice(-6)}`;

    const result = await query(
      `INSERT INTO cash_flow (code, type, amount, payment_method, category, partner_id, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code,
        type,
        numAmount,
        payment_method || 'cash',
        category,
        partner_id || null,
        note || '',
        user.id,
      ]
    );

    return NextResponse.json({ cash_flow: result.rows[0] });
  } catch (error: any) {
    console.error('Cash flow POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json({ error: 'Chỉ Admin hoặc Chủ cửa hàng mới được xóa phiếu thu/chi' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID phiếu thu chi' }, { status: 400 });
    }

    await query('DELETE FROM cash_flow WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cash flow DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
