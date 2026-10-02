import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Get all users and their monthly fixed shift assignments
    const usersRes = await query(`
      SELECT u.id, u.username, u.full_name, u.role, u.contract_type,
             sa.id AS assignment_id, sa.assigned_shift, sa.note, sa.updated_at
      FROM users u
      LEFT JOIN user_shift_assignments sa ON u.id = sa.user_id
      ORDER BY u.role ASC, u.full_name ASC
    `);

    const users = usersRes.rows.map((u, index) => {
      const defaultShift = u.role === 'staff' ? (index % 2 === 0 ? 'shift1' : 'shift2') : 'manager';
      const assigned = u.assigned_shift || defaultShift;

      return {
        ...u,
        assigned_shift: assigned,
        rotation_type: 'fixed',
        current_effective_shift: assigned,
      };
    });

    return NextResponse.json({
      users,
      shifts: [
        { id: 'shift1', name: 'Ca 1 (09:00 - 21:00 • Nghỉ trưa 12:00-13:00)', label: 'Ca 1' },
        { id: 'shift2', name: 'Ca 2 (09:00 - 21:00 • Nghỉ trưa 13:00-14:00)', label: 'Ca 2' },
        { id: 'hanh_chinh', name: 'Ca Hành Chính (08:30 - 17:30)', label: 'Ca Hành Chính' },
        { id: 'manager', name: 'Ca Quản Lý (09:00 - 21:00)', label: 'Ca Quản Lý' },
        { id: 'part_time_sang', name: 'Ca Sáng (08:30 - 13:00)', label: 'Part-time Sáng' },
        { id: 'part_time_toi', name: 'Ca Tối (17:00 - 21:30)', label: 'Part-time Tối' },
      ],
    });
  } catch (error: any) {
    console.error('Shifts GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Không có quyền thay đổi ca làm việc' }, { status: 403 });
    }

    const payload = await request.json();
    const { user_id, assigned_shift, note } = payload;

    if (!user_id || !assigned_shift) {
      return NextResponse.json({ error: 'Thiếu thông tin nhân viên hoặc ca làm việc' }, { status: 400 });
    }

    // Gán ca cố định cho nhân viên trong cả tháng (không xoay ca)
    await query(
      `INSERT INTO user_shift_assignments (user_id, assigned_shift, rotation_type, note, updated_at)
       VALUES ($1, $2, 'fixed', $3, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET assigned_shift = $2, rotation_type = 'fixed', note = $3, updated_at = NOW()`,
      [user_id, assigned_shift, note || null]
    );

    return NextResponse.json({ success: true, message: 'Đã cập nhật ca làm việc cố định của nhân viên thành công!' });
  } catch (error: any) {
    console.error('Shifts POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
