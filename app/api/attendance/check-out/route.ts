import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { calculateWorkHours } from '@/lib/attendanceHelper';
import { validateAttendanceAccess } from '@/lib/attendanceServerHelper';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { attendance_id, session, note, client_public_ip, device_token } = body;

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
          error: access.errorMessage || 'Không thể ra ca. Vui lòng kết nối đúng Wi-Fi cửa hàng hoặc yêu cầu Quản lý cấp quyền thiết bị!',
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

    const isMorning = record.session === 'morning';
    const shift = record.shift;

    // Calculate work hours, OT hours, early minutes using standardized helper
    const calcResult = calculateWorkHours(record.check_in, now, {
      shift,
      session: isMorning ? 'morning' : 'afternoon',
    });

    const workHours = calcResult.workHours;
    const otHours = calcResult.otHours;
    const earlyMinutes = calcResult.earlyMinutes;

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
      message: `Đã chấm Ra ${sessionName} thành công! (${workHours}h làm việc${otHours > 0 ? ` • +${otHours}h OT` : ''}) ${earlyMinutes > 0 ? `• Về sớm: ${earlyMinutes} phút` : ''}`,
      attendance: updateRes.rows[0],
      workHours,
      otHours,
      earlyMinutes,
      deviceToken: access.newDeviceToken,
      isDeviceTrusted: access.isDeviceTrusted,
      isWifiMatch: access.isIpMatched,
    });
  } catch (err: any) {
    console.error('Check-out error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
