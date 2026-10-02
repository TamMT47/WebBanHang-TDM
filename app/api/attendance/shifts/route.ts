import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getISOWeekNumber(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const vnTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnTimeStr);
    const weekNumber = getISOWeekNumber(vnDate);

    // Get all users
    const usersRes = await query(`
      SELECT u.id, u.username, u.full_name, u.role, u.contract_type,
             sa.id AS assignment_id, sa.assigned_shift, sa.rotation_type, sa.note, sa.updated_at
      FROM users u
      LEFT JOIN user_shift_assignments sa ON u.id = sa.user_id
      ORDER BY u.role ASC, u.full_name ASC
    `);

    const users = usersRes.rows.map((u, index) => {
      let currentShift = u.assigned_shift || (u.role === 'staff' ? (index % 2 === 0 ? 'shift1' : 'shift2') : 'manager');
      const rotType = u.rotation_type || 'auto_weekly';

      if (u.role === 'staff' && rotType === 'auto_weekly') {
        // Compute active shift for current week
        const baseIsShift1 = (u.assigned_shift || (index % 2 === 0 ? 'shift1' : 'shift2')) === 'shift1';
        currentShift = weekNumber % 2 === 0
          ? (baseIsShift1 ? 'shift1' : 'shift2')
          : (baseIsShift1 ? 'shift2' : 'shift1');
      }

      return {
        ...u,
        assigned_shift: u.assigned_shift || (u.role === 'staff' ? (index % 2 === 0 ? 'shift1' : 'shift2') : 'manager'),
        rotation_type: rotType,
        current_effective_shift: currentShift,
      };
    });

    return NextResponse.json({
      weekNumber,
      users,
      shifts: [
        { id: 'shift1', name: 'Ca 1 (09:00 - 12:00 & 13:00 - 21:00)', label: 'Ca 1 (Nghỉ trưa 12:00-13:00)' },
        { id: 'shift2', name: 'Ca 2 (09:00 - 13:00 & 14:00 - 21:00)', label: 'Ca 2 (Nghỉ trưa 13:00-14:00)' },
        { id: 'manager', name: 'Ca Quản Lý (09:00 - 21:00)', label: 'Ca Quản Lý' },
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
    const { action } = payload;

    // Action 1: Gán ca đơn lẻ cho 1 nhân viên
    if (action === 'assign_single' || payload.user_id) {
      const { user_id, assigned_shift, rotation_type, note } = payload;
      if (!user_id || !assigned_shift) {
        return NextResponse.json({ error: 'Thiếu thông tin nhân viên hoặc ca làm việc' }, { status: 400 });
      }

      await query(
        `INSERT INTO user_shift_assignments (user_id, assigned_shift, rotation_type, note, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET assigned_shift = $2, rotation_type = $3, note = $4, updated_at = NOW()`,
        [user_id, assigned_shift, rotation_type || 'auto_weekly', note || null]
      );

      return NextResponse.json({ success: true, message: 'Đã cập nhật ca làm việc của nhân viên thành công!' });
    }

    // Action 2: Đổi ca / Xoay ca giữa 2 nhân viên (Swap Shifts)
    if (action === 'swap_shifts') {
      const { user1_id, user2_id } = payload;
      if (!user1_id || !user2_id || user1_id === user2_id) {
        return NextResponse.json({ error: 'Vui lòng chọn 2 nhân viên khác nhau để đổi ca' }, { status: 400 });
      }

      // Fetch current assignments
      const res1 = await query(`SELECT assigned_shift, rotation_type FROM user_shift_assignments WHERE user_id = $1`, [user1_id]);
      const res2 = await query(`SELECT assigned_shift, rotation_type FROM user_shift_assignments WHERE user_id = $1`, [user2_id]);

      const shift1 = res1.rows[0]?.assigned_shift || 'shift1';
      const rot1 = res1.rows[0]?.rotation_type || 'auto_weekly';
      const shift2 = res2.rows[0]?.assigned_shift || 'shift2';
      const rot2 = res2.rows[0]?.rotation_type || 'auto_weekly';

      // Swap
      await query(
        `INSERT INTO user_shift_assignments (user_id, assigned_shift, rotation_type, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET assigned_shift = $2, rotation_type = $3, updated_at = NOW()`,
        [user1_id, shift2, rot1]
      );

      await query(
        `INSERT INTO user_shift_assignments (user_id, assigned_shift, rotation_type, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET assigned_shift = $2, rotation_type = $3, updated_at = NOW()`,
        [user2_id, shift1, rot2]
      );

      return NextResponse.json({ success: true, message: 'Đã hoán đổi ca làm việc giữa 2 nhân viên thành công!' });
    }

    // Action 3: Tự động đảo ca toàn bộ nhân viên (Rotate All Shifts)
    if (action === 'rotate_all') {
      const staffRes = await query(`SELECT id FROM users WHERE role = 'staff' ORDER BY full_name ASC`);
      for (const st of staffRes.rows) {
        const cur = await query(`SELECT assigned_shift FROM user_shift_assignments WHERE user_id = $1`, [st.id]);
        const current = cur.rows[0]?.assigned_shift || 'shift1';
        const nextShift = current === 'shift1' ? 'shift2' : 'shift1';

        await query(
          `INSERT INTO user_shift_assignments (user_id, assigned_shift, rotation_type, updated_at)
           VALUES ($1, $2, 'auto_weekly', NOW())
           ON CONFLICT (user_id) DO UPDATE SET assigned_shift = $2, updated_at = NOW()`,
          [st.id, nextShift]
        );
      }
      return NextResponse.json({ success: true, message: 'Đã xoay ca toàn bộ nhân viên thành công!' });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Shifts POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
