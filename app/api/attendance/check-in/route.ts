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

    const body = await request.json().catch(() => ({}));
    const { shift, session, note, client_public_ip } = body;
    const validShifts = ['shift1', 'shift2', 'manager', 'morning', 'afternoon', 'evening', 'full'];
    const chosenShift = shift && validShifts.includes(shift) ? shift : 'shift1';

    // IP Wifi Validation
    const requestIp = getClientIp(request);
    const effectiveIp = (client_public_ip || requestIp || '').trim();
    const settingsRes = await query("SELECT value FROM store_settings WHERE key = 'store_wifi_ip'");
    const storeWifiIp = settingsRes.rows[0]?.value?.trim() || '';

    if (storeWifiIp) {
      const isMatched = effectiveIp === storeWifiIp || requestIp === storeWifiIp;
      if (!isMatched) {
        return NextResponse.json(
          {
            error: `Bạn chưa kết nối đúng mạng Wifi của cửa hàng (IP hiện tại: ${effectiveIp || requestIp} != IP Shop: ${storeWifiIp})`,
            isWifiMatch: false,
            clientIp: effectiveIp || requestIp,
            storeWifiIp,
          },
          { status: 403 }
        );
      }
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
    // Ca 1: Sáng (08:30 - 11:30), Chiều (13:00 - 21:00)
    // Ca 2: Sáng (08:30 - 13:00), Chiều (14:30 - 21:00)
    // Manager: Sáng (08:30 - 12:00), Chiều (13:30 - 21:00)
    let lateMinutes = 0;
    if (targetSession === 'morning') {
      const scheduledStart = 510; // 08:30
      if (totalMinutes > scheduledStart) {
        lateMinutes = totalMinutes - scheduledStart;
      }
    } else {
      // Afternoon session
      let scheduledStart = 780; // 13:00 for Ca 1
      if (chosenShift === 'shift2') scheduledStart = 870; // 14:30 for Ca 2
      else if (chosenShift === 'manager') scheduledStart = 810; // 13:30 for Manager

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
      [user.id, todayStr, chosenShift, targetSession, effectiveIp || requestIp, lateMinutes, isOffDay, note || null]
    );

    return NextResponse.json({
      success: true,
      message: `Đã chấm Vào ${sessionLabel} thành công! ${lateMinutes > 0 ? `(Vào muộn: ${lateMinutes} phút)` : 'Đúng giờ chuẩn'}${isOffDay ? ' • (Đi làm ngày Off: +1 ngày công)' : ''}`,
      attendance: insertRes.rows[0],
      lateMinutes,
      isOffDay,
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
