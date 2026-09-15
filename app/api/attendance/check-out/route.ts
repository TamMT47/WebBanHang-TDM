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

    const { attendance_id, note } = await request.json();

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

    // Find the active attendance record
    let record: any = null;
    if (attendance_id) {
      const res = await query('SELECT * FROM attendance WHERE id = $1 AND user_id = $2', [attendance_id, user.id]);
      if (res.rows.length > 0) record = res.rows[0];
    } else {
      const now = new Date();
      const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
      const todayStr = new Date(vnTimeStr).toISOString().split('T')[0];

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

    const now = new Date();
    const vnTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnTimeStr);

    const hour = vnDate.getHours();
    const minute = vnDate.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Standard Shift End: 21:00 (1260 minutes)
    // Làm thêm sau giờ ra ca (sau 21:00): Tính OT 150%.
    // Về sớm trước 21:00: ghi nhận số phút về sớm.
    let earlyMinutes = 0;
    let otHours = 0;

    if (totalMinutes < 1260) {
      earlyMinutes = 1260 - totalMinutes;
      otHours = 0;
    } else if (totalMinutes > 1260) {
      earlyMinutes = 0;
      otHours = Math.round(((totalMinutes - 1260) / 60 + Number.EPSILON) * 100) / 100;
    }

    // Standard 11h shift (or legacy 4h/8h if legacy shift)
    const isLegacy4h = ['morning', 'afternoon', 'evening'].includes(record.shift);
    const standardHours = isLegacy4h ? 4.0 : 11.0;

    const lateMin = parseInt(record.late_minutes || 0, 10);
    const totalDeductedHours = (lateMin + earlyMinutes) / 60;
    const workHours = Math.max(0, Math.round((standardHours - totalDeductedHours + Number.EPSILON) * 100) / 100);

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

    const updated = updateRes.rows[0];

    return NextResponse.json({
      success: true,
      message: `Đã chấm công Ra Ca thành công! Thời gian làm chuẩn: ${workHours}h ${otHours > 0 ? `• Tăng ca (OT 150%): ${otHours}h` : ''} ${earlyMinutes > 0 ? `• (Về sớm: ${earlyMinutes} phút)` : ''}`,
      attendance: updated,
      summary: {
        workHours,
        otHours,
        earlyMinutes,
        lateMinutes: lateMin,
      },
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
