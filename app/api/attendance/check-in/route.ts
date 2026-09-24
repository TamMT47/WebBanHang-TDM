import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { validateAttendanceAccess } from '@/lib/attendanceServerHelper';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { shift, session, note, client_public_ip, device_token } = body;
    const validShifts = ['shift1', 'shift2', 'manager', 'morning', 'afternoon', 'evening', 'full'];
    const chosenShift = shift && validShifts.includes(shift) ? shift : 'shift1';

    // IP Whitelist & Device Token Validation
    const access = await validateAttendanceAccess({
      request,
      userId: user.id,
      clientPublicIp: client_public_ip,
      deviceToken: device_token,
    });

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.errorMessage || 'Không thể chấm công. Vui lòng kết nối đúng Wi-Fi cửa hàng hoặc yêu cầu Quản lý cấp quyền thiết bị!',
          isWifiMatch: false,
          isDeviceTrusted: false,
          clientIp: access.clientIp,
          storeWifiIps: access.storeWifiIps,
        },
        { status: 403 }
      );
    }

    const now = new Date();
    const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnTimeStr);
    const todayStr = vnDate.toISOString().split('T')[0];

    const hour = vnDate.getHours();
    const minute = vnDate.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Determine session: 'morning' or 'afternoon'
    const targetSession: 'morning' | 'afternoon' =
      session === 'afternoon' || (session !== 'morning' && totalMinutes >= 750) ? 'afternoon' : 'morning';

    // Calculate Late Minutes based on shift & session:
    // Ca 1: Sáng (09:00 - 12:00), Chiều (13:00 - 21:00)
    // Ca 2: Sáng (09:00 - 13:00), Chiều (14:00 - 21:00)
    // Manager: Sáng (09:00 - 12:00), Chiều (13:00 - 21:00)
    let lateMinutes = 0;
    if (targetSession === 'morning') {
      const scheduledStart = 540; // 09:00
      if (totalMinutes > scheduledStart) {
        lateMinutes = totalMinutes - scheduledStart;
      }
    } else {
      // Afternoon session
      let scheduledStart = 780; // 13:00 for Ca 1 & Manager
      if (chosenShift === 'shift2') scheduledStart = 840; // 14:00 for Ca 2

      if (totalMinutes > scheduledStart) {
        lateMinutes = totalMinutes - scheduledStart;
      }
    }

    // Check if already checked in for this session today
    const existingSession = await query(
      `SELECT id, check_in, check_out FROM attendance 
       WHERE user_id = $1 AND date = $2 AND session = $3`,
      [user.id, todayStr, targetSession]
    );

    if (existingSession.rows.length > 0) {
      const rec = existingSession.rows[0];
      if (rec.check_out) {
        return NextResponse.json(
          { error: `Bạn đã chấm công và hoàn thành ca ${targetSession === 'morning' ? 'Sáng' : 'Chiều'} hôm nay rồi!` },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: `Bạn đang trong ca ${targetSession === 'morning' ? 'Sáng' : 'Chiều'} rồi và chưa bấm Ra Ca!` },
          { status: 400 }
        );
      }
    }

    // Check if today is user's registered day off
    const offDayRes = await query(
      `SELECT id FROM employee_off_days WHERE user_id = $1 AND date = $2`,
      [user.id, todayStr]
    );
    const isOffDay = offDayRes.rows.length > 0;

    // Shift label
    const sessionLabel = targetSession === 'morning' ? 'Ca Sáng' : 'Ca Chiều';

    // Insert attendance record
    const insertRes = await query(
      `INSERT INTO attendance (user_id, date, shift, session, check_in, ip_address, status, late_minutes, is_off_day, note)
       VALUES ($1, $2, $3, $4, NOW(), $5, 'working', $6, $7, $8)
       RETURNING *`,
      [user.id, todayStr, chosenShift, targetSession, access.clientIp, lateMinutes, isOffDay, note || null]
    );

    return NextResponse.json({
      success: true,
      message: `Đã chấm Vào ${sessionLabel} thành công! ${lateMinutes > 0 ? `(Vào muộn: ${lateMinutes} phút)` : 'Đúng giờ chuẩn'}${isOffDay ? ' • (Đi làm ngày Off: +1 ngày công)' : ''}`,
      attendance: insertRes.rows[0],
      lateMinutes,
      isOffDay,
      deviceToken: access.newDeviceToken,
      isDeviceTrusted: access.isDeviceTrusted,
      isWifiMatch: access.isIpMatched,
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
