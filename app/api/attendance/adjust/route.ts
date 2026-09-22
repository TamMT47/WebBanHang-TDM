import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const isManagerOrAbove = canViewSensitiveFinancials(currentUser.role);
    if (!isManagerOrAbove) {
      return NextResponse.json(
        { error: 'Chỉ Quản lý, Chủ shop hoặc Admin mới có quyền chỉnh sửa/bù công cho nhân viên' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      attendance_id,
      user_id,
      date, // YYYY-MM-DD
      shift = 'shift1',
      session = 'morning',
      check_in_time, // 'HH:mm' e.g. '09:00'
      check_out_time, // 'HH:mm' e.g. '12:00' or '21:00'
      work_hours,
      ot_hours = 0,
      late_minutes = 0,
      early_minutes = 0,
      is_off_day = false,
      reason = '',
    } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Vui lòng chọn nhân viên' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Vui lòng chọn ngày làm việc' }, { status: 400 });
    }

    // Target user info
    const userRes = await query(`SELECT id, full_name, role FROM users WHERE id = $1`, [user_id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 });
    }
    const targetUser = userRes.rows[0];

    // Build timestamp strings
    const inTime = check_in_time ? check_in_time.trim() : '09:00';
    const outTime = check_out_time ? check_out_time.trim() : '21:00';
    const checkInTimestamp = `${date}T${inTime}:00+07:00`;
    const checkOutTimestamp = `${date}T${outTime}:00+07:00`;

    // Compute work hours if not provided
    let finalWorkHours = typeof work_hours === 'number' ? work_hours : parseFloat(work_hours || '0');
    if (finalWorkHours <= 0) {
      const [inH, inM] = inTime.split(':').map((v: string) => parseInt(v, 10));
      const [outH, outM] = outTime.split(':').map((v: string) => parseInt(v, 10));
      const diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMinutes > 0) {
        finalWorkHours = Math.round((diffMinutes / 60) * 10) / 10;
      } else {
        finalWorkHours = session === 'morning' ? 3.0 : session === 'afternoon' ? 8.0 : 11.0;
      }
    }

    const finalOtHours = typeof ot_hours === 'number' ? ot_hours : parseFloat(ot_hours || '0');
    const finalLateMinutes = typeof late_minutes === 'number' ? late_minutes : parseInt(late_minutes || '0', 10);
    const finalEarlyMinutes = typeof early_minutes === 'number' ? early_minutes : parseInt(early_minutes || '0', 10);

    const noteText = `[Quản lý ${currentUser.full_name} bù công]: ${reason.trim() || 'Chỉnh sửa/Bù công nhân sự'}`;

    let savedRecord: any = null;

    if (attendance_id) {
      // Update existing record
      const updateRes = await query(
        `UPDATE attendance
         SET shift = $1,
             session = $2,
             check_in = $3,
             check_out = $4,
             work_hours = $5,
             ot_hours = $6,
             late_minutes = $7,
             early_minutes = $8,
             is_off_day = $9,
             status = 'completed',
             note = $10
         WHERE id = $11
         RETURNING *`,
        [
          shift,
          session,
          checkInTimestamp,
          checkOutTimestamp,
          finalWorkHours,
          finalOtHours,
          finalLateMinutes,
          finalEarlyMinutes,
          Boolean(is_off_day),
          noteText,
          attendance_id,
        ]
      );
      savedRecord = updateRes.rows[0];
    } else {
      // Insert new manual attendance record
      const insertRes = await query(
        `INSERT INTO attendance 
          (user_id, date, shift, session, check_in, check_out, ip_address, status, work_hours, ot_hours, late_minutes, early_minutes, is_off_day, note)
         VALUES ($1, $2, $3, $4, $5, $6, 'MANUAL_OVERRIDE', 'completed', $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          user_id,
          date,
          shift,
          session,
          checkInTimestamp,
          checkOutTimestamp,
          finalWorkHours,
          finalOtHours,
          finalLateMinutes,
          finalEarlyMinutes,
          Boolean(is_off_day),
          noteText,
        ]
      );
      savedRecord = insertRes.rows[0];
    }

    return NextResponse.json({
      success: true,
      message: `Đã lưu bù công cho nhân viên ${targetUser.full_name} (${date}) thành công! Tổng giờ làm: ${finalWorkHours}h • OT: ${finalOtHours}h`,
      attendance: savedRecord,
    });
  } catch (err: any) {
    console.error('Attendance adjust POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const isManagerOrAbove = canViewSensitiveFinancials(currentUser.role);
    if (!isManagerOrAbove) {
      return NextResponse.json(
        { error: 'Chỉ Quản lý, Chủ shop hoặc Admin mới có quyền xóa lượt chấm công' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã lượt chấm công' }, { status: 400 });
    }

    const deleteRes = await query(`DELETE FROM attendance WHERE id = $1 RETURNING *`, [id]);
    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy lượt chấm công để xóa' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa lượt chấm công thành công!',
    });
  } catch (err: any) {
    console.error('Attendance adjust DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
