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
    if (!shift || !['morning', 'afternoon', 'evening', 'full'].includes(shift)) {
      return NextResponse.json({ error: 'Vui lòng chọn ca làm việc hợp lệ' }, { status: 400 });
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

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if user already checked in for this shift today and hasn't checked out
    const existingActive = await query(
      `SELECT id, check_in, check_out FROM attendance 
       WHERE user_id = $1 AND date = $2 AND shift = $3 AND check_out IS NULL`,
      [user.id, todayStr, shift]
    );

    if (existingActive.rows.length > 0) {
      return NextResponse.json(
        { error: 'Bạn đã vào ca này rồi và chưa bấm Ra Ca!' },
        { status: 400 }
      );
    }

    // Create new attendance record
    const insertRes = await query(
      `INSERT INTO attendance (user_id, date, shift, check_in, ip_address, status, note)
       VALUES ($1, $2, $3, NOW(), $4, 'working', $5)
       RETURNING *`,
      [user.id, todayStr, shift, clientIp, note || null]
    );

    return NextResponse.json({
      success: true,
      message: `Đã chấm công Vào Ca (${shift}) thành công! Chúc bạn một ngày làm việc hiệu quả.`,
      attendance: insertRes.rows[0],
    });
  } catch (err: any) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
