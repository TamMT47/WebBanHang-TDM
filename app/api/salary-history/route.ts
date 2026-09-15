import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const isFinancialAdmin = canViewSensitiveFinancials(user.role);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || ''; // 'YYYY-MM'
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || ''; // 'all', 'pending', 'paid'

    let sql = `
      SELECT sh.*, u.username
      FROM salary_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!isFinancialAdmin) {
      params.push(user.id);
      sql += ` AND sh.user_id = $${params.length}`;
    }

    if (month && month !== 'all') {
      params.push(month);
      sql += ` AND sh.month = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND sh.status = $${params.length}`;
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (sh.user_name ILIKE $${params.length} OR u.username ILIKE $${params.length})`;
    }

    sql += ` ORDER BY sh.month DESC, sh.final_salary DESC`;

    const res = await query(sql, params);

    // Calculate Summary Statistics
    let totalPayroll = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const row of res.rows) {
      const amount = parseFloat(row.final_salary || '0');
      totalPayroll += amount;
      if (row.status === 'paid') totalPaid += amount;
      else totalPending += amount;
    }

    // List of available months for filter dropdown
    const monthsRes = await query(
      `SELECT DISTINCT month FROM salary_history ORDER BY month DESC`
    );
    const availableMonths = monthsRes.rows.map((r) => r.month);

    return NextResponse.json({
      records: res.rows,
      availableMonths,
      summary: {
        totalPayroll,
        totalPaid,
        totalPending,
        count: res.rows.length,
      },
      isFinancialAdmin,
    });
  } catch (err: any) {
    console.error('Salary History GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Quản lý, Admin hoặc Chủ cửa hàng mới có quyền xóa / mở lại bảng lương lưu trữ' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const month = searchParams.get('month');

    if (id) {
      await query('DELETE FROM salary_history WHERE id = $1', [id]);
      return NextResponse.json({ success: true, message: 'Đã xóa bản ghi lương' });
    }

    if (month) {
      await query('DELETE FROM salary_history WHERE month = $1', [month]);
      return NextResponse.json({ success: true, message: `Đã mở khóa và xóa bảng lương tháng ${month}` });
    }

    return NextResponse.json({ error: 'Thiếu ID hoặc Tháng cần xóa' }, { status: 400 });
  } catch (err: any) {
    console.error('Salary History DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
