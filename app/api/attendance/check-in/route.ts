import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getClientIp } from '@/lib/ipHelper';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { shift, note } = await request.json();
    const validShifts = ['shift1', 'shift2', 'manager', 'morning', 'afternoon', 'evening', 'full'];
    if (!shift || !validShifts.includes(shift)) {
      return NextResponse.json({ error: 'Vui lòng chọn ca làm việc hợp lệ (Ca 1 hoặc Ca 2)' }, { status: 400 });
    }

    // IP Wifi Validation
    const clientIp = getClientIp(request);
    const settingsRes = await query("SELECT value FROM store_settings WHERE key = 'store_wifi_ip'");
    const storeWifiIp = settingsRes.rows[0]?.value?.trim() || '';

    if (storeWifiIp && storeWifiIp !== clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      return NextResponse.json(
        {
          error: `Vui lòng kết nối Wifi cửa hàng để chấm công! (IP của bạn: ${clientIp} - Yêu cầu: ${storeWifiIp})`,
          isWifiMatch: false,
          clientIp,
          storeWifiIp,
        },
        { status: 403 }
      );
    }

    const now = new Date();
    // Use GMT+7 for Vietnam time
    const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnTimeStr);
    const todayStr = vnDate.toISOString().split('T')[0];

    const hour = vnDate.getHours();
    const minute = vnDate.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Standard Shift Start: 08:30 (510 minutes)
    // Đi sớm hơn giờ vào ca: KHÔNG tính lương.
    // Đi muộn hơn 08:30: tính số phút vào muộn.
    let lateMinutes = 0;
    if (totalMinutes > 510) {
      lateMinutes = totalMinutes - 510;
    }

    // Check if user already checked in for today and hasn't checked out
    const existingActive = await query(
      `SELECT id, check_in, check_out FROM attendance 
       WHERE user_id = $1 AND date = $2 AND check_out IS NULL`,
      [user.id, todayStr]
    );

    if (existingActive.rows.length > 0) {
      return NextResponse.json(
        { error: 'Bạn đã bấm Vào Ca hôm nay rồi và chưa bấm Ra Ca!' },
        { status: 400 }
      );
    }

    // Check if today is user's registered day off
    const offDayRes = await query(
      `SELECT id FROM employee_off_days WHERE user_id = $1 AND date = $2`,
      [user.id, todayStr]
    );
    const isOffDay = offDayRes.rows.length > 0;

    // Shift name label
    const shiftLabel =
      shift === 'shift1' ? 'Ca 1 (11 tiếng)' :
      shift === 'shift2' ? 'Ca 2 (11 tiếng)' :
      shift === 'manager' ? 'Ca Quản Lý' : shift;

    // Insert attendance record
    const insertRes = await query(
      `INSERT INTO attendance (user_id, date, shift, check_in, ip_address, status, late_minutes, is_off_day, note)
       VALUES ($1, $2, $3, NOW(), $4, 'working', $5, $6, $7)
       RETURNING *`,
      [user.id, todayStr, shift, clientIp, lateMinutes, isOffDay, note || null]
    );

    return NextResponse.json({
      success: true,
      message: `Đã chấm công Vào ${shiftLabel} thành công! ${lateMinutes > 0 ? `(Vào muộn: ${lateMinutes} phút)` : 'Đúng giờ chuẩn'}${isOffDay ? ' • (Đi làm ngày Off đăng ký: +1 ngày công)' : ''}`,
      attendance: insertRes.rows[0],
      lateMinutes,
      isOffDay,
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
