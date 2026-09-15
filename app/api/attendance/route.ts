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

    const isManagerOrAbove = ['admin', 'owner', 'manager'].includes(user.role);
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || ''; // 'YYYY-MM-DD'
    const monthParam = searchParams.get('month') || ''; // 'YYYY-MM'
    const targetUserId = searchParams.get('user_id') || (isManagerOrAbove ? '' : user.id);

    // Get Store Wifi IP Setting & Client IP
    const clientIp = getClientIp(request);
    const settingsRes = await query("SELECT value FROM store_settings WHERE key = 'store_wifi_ip'");
    const storeWifiIp = settingsRes.rows[0]?.value?.trim() || '';

    // Wifi Match check
    const isWifiMatch = !storeWifiIp || storeWifiIp === clientIp || clientIp === '127.0.0.1' || clientIp === '::1';

    // 2 Fulltime Shifts (11 hours/day) + Manager Shift
    const shifts = [
      {
        id: 'shift1',
        name: 'Ca 1 (Fulltime 11h)',
        timeRange: '08:30 - 21:00',
        lunchBreak: 'Nghỉ trưa: 11:30 - 13:00 (1.5h)',
        morning: 'Sáng: 08:30 - 11:30 (3h)',
        afternoon: 'Chiều: 13:00 - 21:00 (8h)',
        standardHours: 11.0,
        isStaffShift: true,
      },
      {
        id: 'shift2',
        name: 'Ca 2 (Fulltime 11h)',
        timeRange: '08:30 - 21:00',
        lunchBreak: 'Nghỉ trưa: 13:00 - 14:30 (1.5h)',
        morning: 'Sáng: 08:30 - 13:00 (4.5h)',
        afternoon: 'Chiều: 14:30 - 21:00 (6.5h)',
        standardHours: 11.0,
        isStaffShift: true,
      },
      {
        id: 'manager',
        name: 'Ca Quản Lý (11h)',
        timeRange: '08:30 - 21:00',
        lunchBreak: 'Linh hoạt',
        morning: '08:30 - 21:00 (11h)',
        afternoon: '',
        standardHours: 11.0,
        isStaffShift: false,
      },
    ];

    // Today's attendance records for current user (Vietnam GMT+7)
    const now = new Date();
    const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const todayStr = new Date(vnTimeStr).toISOString().split('T')[0];

    const todayRecordsRes = await query(
      `SELECT a.*, u.full_name AS user_name, u.role AS user_role
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = $1 AND a.date = $2
       ORDER BY a.check_in ASC`,
      [user.id, todayStr]
    );

    // Filtered history records:
    // If staff: only see own history.
    // If admin/owner/manager: see all employees or filtered user.
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
    } else if (!isManagerOrAbove) {
      params.push(user.id);
      historySql += ` AND a.user_id = $${params.length}`;
    }

    if (dateParam) {
      params.push(dateParam);
      historySql += ` AND a.date = $${params.length}`;
    } else if (monthParam) {
      params.push(`${monthParam}%`);
      historySql += ` AND TO_CHAR(a.date, 'YYYY-MM') LIKE $${params.length}`;
    }

    historySql += ` ORDER BY a.date DESC, a.check_in DESC LIMIT 250`;
    const historyRes = await query(historySql, params);

    // Monthly summary for user
    const curMonth = monthParam || todayStr.slice(0, 7);
    const summaryRes = await query(
      `SELECT 
        COUNT(DISTINCT a.date) AS active_days,
        COUNT(a.id) AS total_shifts,
        COALESCE(SUM(a.work_hours), 0) AS total_work_hours,
        COALESCE(SUM(a.ot_hours), 0) AS total_ot_hours,
        COUNT(CASE WHEN a.is_off_day = true THEN 1 END) AS off_days_worked
       FROM attendance a
       WHERE a.user_id = $1 AND TO_CHAR(a.date, 'YYYY-MM') = $2 AND a.check_out IS NOT NULL`,
      [user.id, curMonth]
    );

    const summary = summaryRes.rows[0] || {
      active_days: 0,
      total_shifts: 0,
      total_work_hours: 0,
      total_ot_hours: 0,
      off_days_worked: 0,
    };

    const activeDaysCount = parseInt(summary.active_days || '0', 10);
    const offDaysWorkedCount = parseInt(summary.off_days_worked || '0', 10);
    // Working on registered day off counts as +1 extra workday
    const actualDaysTotal = activeDaysCount + offDaysWorkedCount;

    return NextResponse.json({
      clientIp,
      storeWifiIp,
      isWifiMatch,
      shifts,
      isManagerOrAbove,
      todayRecords: todayRecordsRes.rows,
      history: historyRes.rows,
      summary: {
        active_days: activeDaysCount,
        off_days_worked: offDaysWorkedCount,
        total_shifts: parseInt(summary.total_shifts || '0', 10),
        total_work_hours: parseFloat(summary.total_work_hours || '0'),
        total_ot_hours: parseFloat(summary.total_ot_hours || '0'),
        actual_days: actualDaysTotal,
      },
    });
  } catch (err: any) {
    console.error('Attendance GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
