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
    const { attendance_id, session, note, client_public_ip } = body;

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

    // Find the active attendance record
    let record: any = null;
    if (attendance_id) {
      const res = await query('SELECT * FROM attendance WHERE id = $1 AND user_id = $2', [attendance_id, user.id]);
      if (res.rows.length > 0) record = res.rows[0];
    } else if (session) {
      const res = await query(
        `SELECT * FROM attendance 
         WHERE user_id = $1 AND date = $2 AND session = $3 AND check_out IS NULL 
         ORDER BY check_in DESC LIMIT 1`,
        [user.id, todayStr, session]
      );
      if (res.rows.length > 0) record = res.rows[0];
    } else {
      const res = await query(
        `SELECT * FROM attendance 
         WHERE user_id = $1 AND date = $2 AND check_out IS NULL 
         ORDER BY check_in DESC LIMIT 1`,
        [user.id, todayStr]
      );
      if (res.rows.length > 0) record = res.rows[0];
    }

    if (!record) {
      return NextResponse.json(
        { error: 'Không tìm thấy ca làm việc đang mở để Ra Ca' },
        { status: 404 }
      );
    }

    if (record.check_out) {
      return NextResponse.json(
        { error: 'Ca làm việc này đã được chấm Ra Ca trước đó rồi!' },
        { status: 400 }
      );
    }

    const hour = vnDate.getHours();
    const minute = vnDate.getMinutes();
    const totalMinutes = hour * 60 + minute;

    const isMorning = record.session === 'morning';
    const shift = record.shift;

    let earlyMinutes = 0;
    let otHours = 0;
    let standardDuration = 5.5;

    if (isMorning) {
      // Morning end times:
      // Ca 1: 11:30 (690 min) -> 3.0 hours
      // Ca 2: 13:00 (780 min) -> 4.5 hours
      // Manager: 12:00 (720 min) -> 3.5 hours
      let scheduledEnd = 690;
      standardDuration = 3.0;
      if (shift === 'shift2') {
        scheduledEnd = 780;
        standardDuration = 4.5;
      } else if (shift === 'manager') {
        scheduledEnd = 720;
        standardDuration = 3.5;
      }

      if (totalMinutes < scheduledEnd) {
        earlyMinutes = scheduledEnd - totalMinutes;
      }
      otHours = 0; // Morning does not generate OT
    } else {
      // Afternoon end times:
      // Standard end: 21:00 (1260 min)
      // Ca 1: 13:00 - 21:00 -> 8.0 hours
      // Ca 2: 14:30 - 21:00 -> 6.5 hours
      // Manager: 13:30 - 21:00 -> 7.5 hours
      const scheduledEnd = 1260;
      standardDuration = 8.0;
      if (shift === 'shift2') {
        standardDuration = 6.5;
      } else if (shift === 'manager') {
        standardDuration = 7.5;
      }

      if (totalMinutes < scheduledEnd) {
        earlyMinutes = scheduledEnd - totalMinutes;
        otHours = 0;
      } else if (totalMinutes > scheduledEnd) {
        earlyMinutes = 0;
        otHours = Math.round(((totalMinutes - scheduledEnd) / 60 + Number.EPSILON) * 100) / 100;
      }
    }

    const lateMin = parseInt(record.late_minutes || 0, 10);
    const totalDeductedHours = (lateMin + earlyMinutes) / 60;
    const workHours = Math.max(0, Math.round((standardDuration - totalDeductedHours + Number.EPSILON) * 100) / 100);

    const updateRes = await query(
      `UPDATE attendance
       SET check_out = NOW(),
           work_hours = $1,
           ot_hours = $2,
           early_minutes = $3,
           status = 'completed',
           note = COALESCE($4, note)
       WHERE id = $5
       RETURNING *`,
      [workHours, otHours, earlyMinutes, note || null, record.id]
    );

    const sessionName = isMorning ? 'Ca Sáng (nghỉ trưa)' : 'Ca Chiều (hết ngày)';

    return NextResponse.json({
      success: true,
      message: `Đã chấm Ra ${sessionName} thành công! ${earlyMinutes > 0 ? `(Về sớm: ${earlyMinutes} phút)` : ''} ${otHours > 0 ? `• OT sau 21h: +${otHours} giờ (150%)` : ''}`,
      attendance: updateRes.rows[0],
      workHours,
      otHours,
      earlyMinutes,
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
