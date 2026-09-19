import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getClientIp } from '@/lib/ipHelper';

export const dynamic = 'force-dynamic';

function getISOWeekNumber(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

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

    // Wifi Match check: MUST have storeWifiIp and match clientIp
    const isWifiMatch = Boolean(storeWifiIp) && (storeWifiIp === clientIp);

    // 2 Fulltime Shifts (11 hours/day) + Manager Shift
    const shifts = [
      {
        id: 'shift1',
        name: 'Ca 1 (Sáng: 08:30 - 11:30 | Chiều: 13:00 - 21:00)',
        timeRange: '08:30 - 21:00',
        lunchBreak: '11:30 - 13:00',
        morning: '08:30 - 11:30',
        afternoon: '13:00 - 21:00',
        standardHours: 11.0,
      },
      {
        id: 'shift2',
        name: 'Ca 2 (Sáng: 08:30 - 13:00 | Chiều: 14:30 - 21:00)',
        timeRange: '08:30 - 21:00',
        lunchBreak: '13:00 - 14:30',
        morning: '08:30 - 13:00',
        afternoon: '14:30 - 21:00',
        standardHours: 11.0,
      },
      {
        id: 'manager',
        name: 'Ca Quản Lý (08:30 - 21:00)',
        timeRange: '08:30 - 21:00',
        lunchBreak: 'Linh hoạt',
        morning: '08:30 - 12:00',
        afternoon: '13:30 - 21:00',
        standardHours: 11.0,
      },
    ];

    // Today's attendance records for current user (Vietnam GMT+7)
    const now = new Date();
    const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnTimeStr);
    const todayStr = vnDate.toISOString().split('T')[0];

    // Weekly Shift Rotation:
    // Calculate ISO Week and rotate staff shifts automatically
    const weekNumber = getISOWeekNumber(vnDate);
    const staffRes = await query(`SELECT id, full_name, created_at FROM users WHERE role = 'staff' ORDER BY created_at ASC`);
    const staffUsers = staffRes.rows;
    const staffIndex = staffUsers.findIndex((s) => s.id === user.id);

    let assignedShift = 'shift1';
    if (user.role === 'staff') {
      const idx = staffIndex >= 0 ? staffIndex : 0;
      assignedShift = (weekNumber + idx) % 2 === 0 ? 'shift1' : 'shift2';
    } else {
      assignedShift = 'manager';
    }

    const todayRecordsRes = await query(
      `SELECT a.*, u.full_name AS user_name, u.role AS user_role
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = $1 AND a.date = $2
       ORDER BY a.check_in ASC`,
      [user.id, todayStr]
    );

    const morningRecord = todayRecordsRes.rows.find((r) => r.session === 'morning') || null;
    const afternoonRecord = todayRecordsRes.rows.find((r) => r.session === 'afternoon') || null;

    // Check if today is registered day off
    const offDayRes = await query(
      `SELECT id FROM employee_off_days WHERE user_id = $1 AND date = $2`,
      [user.id, todayStr]
    );
    const isTodayOff = offDayRes.rows.length > 0;

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
    const actualDaysTotal = activeDaysCount + offDaysWorkedCount;

    return NextResponse.json({
      clientIp,
      storeWifiIp,
      isWifiMatch,
      shifts,
      isManagerOrAbove,
      weekNumber,
      assignedShift,
      todayRecords: todayRecordsRes.rows,
      morningRecord,
      afternoonRecord,
      isTodayOff,
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
