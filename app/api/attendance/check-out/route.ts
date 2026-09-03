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
      const todayStr = new Date().toISOString().split('T')[0];
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

    const checkInTime = new Date(record.check_in).getTime();
    const checkOutTime = Date.now();
    const durationHours = Math.max(0, (checkOutTime - checkInTime) / (1000 * 60 * 60));

    // Standard Shift Durations (4 hours per standard shift)
    const standardShiftHours = record.shift === 'full' ? 8.0 : 4.0;
    
    let workHours = 0;
    let otHours = 0;

    if (durationHours > standardShiftHours) {
      workHours = standardShiftHours;
      otHours = Math.round((durationHours - standardShiftHours + Number.EPSILON) * 100) / 100;
    } else {
      workHours = Math.round((durationHours + Number.EPSILON) * 100) / 100;
      otHours = 0;
    }

    const updateRes = await query(
      `UPDATE attendance
       SET check_out = NOW(),
           work_hours = $1,
           ot_hours = $2,
           status = 'completed',
           note = COALESCE($3, note)
       WHERE id = $4
       RETURNING *`,
      [workHours, otHours, note || null, record.id]
    );

    const updated = updateRes.rows[0];

    return NextResponse.json({
      success: true,
      message: `Đã chấm công Ra Ca thành công! Thời gian làm: ${workHours}h ${otHours > 0 ? `(Tăng ca OT: ${otHours}h)` : ''}`,
      attendance: updated,
      summary: {
        workHours,
        otHours,
        totalDuration: Math.round((durationHours + Number.EPSILON) * 100) / 100,
      }
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
