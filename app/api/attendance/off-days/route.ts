import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getWeekInfo(offsetWeeks: number = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetWeeks * 7);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  const diffToMon = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);

  const days: Array<{
    date: string;
    dateStr: string;
    dayName: string;
    dayIndex: number;
    formatted: string;
    formattedDate: string;
  }> = [];

  const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  for (let i = 0; i < 7; i++) {
    const curr = new Date(monday);
    curr.setDate(monday.getDate() + i);
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const formatted = `${curr.getDate()}/${curr.getMonth() + 1}`;
    const formattedDate = `${curr.getDate()}/${curr.getMonth() + 1}/${yyyy}`;

    days.push({
      date: dateStr,
      dateStr: dateStr,
      dayName: dayNames[curr.getDay()],
      dayIndex: curr.getDay() === 0 ? 7 : curr.getDay(),
      formatted: formatted,
      formattedDate: formattedDate,
    });
  }

  // Calculate ISO week string
  const temp = new Date(monday.getTime());
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const week1 = new Date(temp.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((temp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  const weekStr = `${temp.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  return {
    weekStr,
    mondayStr: days[0].dateStr,
    sundayStr: days[6].dateStr,
    days,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const currentWeek = getWeekInfo(0);
    const nextWeek = getWeekInfo(1);

    // Fetch off days for current and next week
    const offDaysRes = await query(
      `SELECT o.*, u.full_name AS user_name, u.role AS user_role
       FROM employee_off_days o
       JOIN users u ON o.user_id = u.id
       WHERE o.week_str IN ($1, $2)
       ORDER BY o.date ASC`,
      [currentWeek.weekStr, nextWeek.weekStr]
    );

    // Also get all employees for admin management
    const usersRes = await query(
      `SELECT id, username, full_name, role FROM users 
       WHERE role IN ('staff', 'manager', 'owner', 'admin')
       ORDER BY role = 'owner' DESC, role = 'manager' DESC, full_name ASC`
    );

    return NextResponse.json({
      currentWeek,
      nextWeek,
      offDays: offDaysRes.rows,
      users: usersRes.rows,
      canEditCurrentWeek: ['admin', 'owner', 'manager'].includes(user.role),
    });
  } catch (err: any) {
    console.error('Off-days GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const isManagerOrAbove = ['admin', 'owner', 'manager'].includes(user.role);
    const { user_id, date, week_str } = await request.json();

    if (!date || !week_str) {
      return NextResponse.json({ error: 'Thiếu thông tin ngày hoặc tuần cần đăng ký' }, { status: 400 });
    }

    // Validate ISO date format YYYY-MM-DD
    const isoDateMatch = String(date).trim().match(/^\d{4}-\d{2}-\d{2}$/);
    if (!isoDateMatch) {
      return NextResponse.json(
        { error: `Định dạng ngày không hợp lệ ("${date}"). Bắt buộc phải là YYYY-MM-DD.` },
        { status: 400 }
      );
    }
    const cleanDate = isoDateMatch[0];

    const targetUserId = user_id || user.id;

    const currentWeek = getWeekInfo(0);
    const nextWeek = getWeekInfo(1);

    // Staff can ONLY register for NEXT WEEK, NOT current week
    if (!isManagerOrAbove) {
      if (targetUserId !== user.id) {
        return NextResponse.json({ error: 'Bạn chỉ có quyền đăng ký ngày Off cho chính mình' }, { status: 403 });
      }
      if (week_str === currentWeek.weekStr) {
        return NextResponse.json(
          { error: 'Tuần hiện tại đã bị khóa! Nhân viên chỉ được đăng ký ngày Off cho TUẦN TIẾP THEO.' },
          { status: 403 }
        );
      }
      if (week_str !== nextWeek.weekStr) {
        return NextResponse.json(
          { error: 'Chỉ được phép đăng ký ngày Off cho tuần tiếp theo.' },
          { status: 400 }
        );
      }
    }

    // Insert or update off day for user and week
    await query(
      `INSERT INTO employee_off_days (user_id, date, week_str, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, week_str) DO UPDATE
       SET date = $2, created_at = NOW()`,
      [targetUserId, cleanDate, week_str]
    );

    return NextResponse.json({
      success: true,
      message: `Đã lưu ngày Off (${cleanDate}) cho tuần ${week_str} thành công!`,
    });
  } catch (err: any) {
    console.error('Off-days POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
