import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getClientIp } from '@/lib/ipHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || ''; // 'YYYY-MM-DD'
    const monthParam = searchParams.get('month') || ''; // 'YYYY-MM'
    const targetUserId = searchParams.get('user_id') || (['admin', 'owner', 'manager'].includes(user.role) ? '' : user.id);

    // Get Store Wifi IP Setting & Client IP
    const clientIp = getClientIp(request);
    const settingsRes = await query("SELECT value FROM store_settings WHERE key = 'store_wifi_ip'");
    const storeWifiIp = settingsRes.rows[0]?.value?.trim() || '';

    // If storeWifiIp is set, require exact match (or local loopback). If not set, allow for initial setup.
    const isWifiMatch = !storeWifiIp || storeWifiIp === clientIp || clientIp === '127.0.0.1' || clientIp === '::1';

    // Shifts Configuration
    const shifts = [
      { id: 'morning', name: 'Ca Sáng', startTime: '08:00', endTime: '12:00', standardHours: 4.0 },
      { id: 'afternoon', name: 'Ca Chiều', startTime: '13:00', endTime: '17:00', standardHours: 4.0 },
      { id: 'evening', name: 'Ca Tối', startTime: '17:00', endTime: '21:00', standardHours: 4.0 },
    ];

    // Today's attendance records for current user
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecordsRes = await query(
      `SELECT a.*, u.full_name AS user_name, u.role AS user_role
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = $1 AND a.date = $2
       ORDER BY a.check_in ASC`,
      [user.id, todayStr]
    );

    // Filtered history records
    let historySql = `
      SELECT a.*, u.full_name AS user_name, u.role AS user_role
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetUserId) {
      params.push(targetUserId);
      historySql += ` AND a.user_id = $${params.length}`;
    }

    if (dateParam) {
      params.push(dateParam);
      historySql += ` AND a.date = $${params.length}`;
    } else if (monthParam) {
      params.push(`${monthParam}%`);
      historySql += ` AND TO_CHAR(a.date, 'YYYY-MM') LIKE $${params.length}`;
    }

    historySql += ` ORDER BY a.date DESC, a.check_in DESC LIMIT 200`;
    const historyRes = await query(historySql, params);

    // Monthly summary for user
    const curMonth = monthParam || todayStr.slice(0, 7);
    const summaryRes = await query(
      `SELECT 
        COUNT(DISTINCT a.date) AS active_days,
        COUNT(a.id) AS total_shifts,
        COALESCE(SUM(a.work_hours), 0) AS total_work_hours,
        COALESCE(SUM(a.ot_hours), 0) AS total_ot_hours
       FROM attendance a
       WHERE a.user_id = $1 AND TO_CHAR(a.date, 'YYYY-MM') = $2 AND a.check_out IS NOT NULL`,
      [user.id, curMonth]
    );

    const summary = summaryRes.rows[0] || {
      active_days: 0,
      total_shifts: 0,
      total_work_hours: 0,
      total_ot_hours: 0,
    };

    return NextResponse.json({
      clientIp,
      storeWifiIp,
      isWifiMatch,
      shifts,
      todayRecords: todayRecordsRes.rows,
      history: historyRes.rows,
      summary: {
        active_days: parseInt(summary.active_days || '0', 10),
        total_shifts: parseInt(summary.total_shifts || '0', 10),
        total_work_hours: parseFloat(summary.total_work_hours || '0'),
        total_ot_hours: parseFloat(summary.total_ot_hours || '0'),
        actual_days: Math.round(((parseFloat(summary.total_work_hours || '0') / 8) + Number.EPSILON) * 100) / 100,
      },
    });
  } catch (err: any) {
    console.error('Attendance GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
