import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getUserFromRequest, canManageUsers } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const result = await query(
      `SELECT id, username, full_name, role, created_at,
        (SELECT COUNT(*) FROM orders WHERE created_by = users.id) AS total_orders_created
       FROM users 
       ORDER BY created_at ASC`
    );

    return NextResponse.json({ users: result.rows });
  } catch (error: any) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canManageUsers(user.role)) {
      return NextResponse.json({ error: 'Không có quyền tạo tài khoản' }, { status: 403 });
    }

    const { username, password, full_name, role } = await request.json();

    if (!username || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check duplicate
    const existing = await query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: `Tên đăng nhập "${cleanUsername}" đã tồn tại` }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, full_name, role, created_at`,
      [cleanUsername, passwordHash, full_name.trim(), role]
    );

    return NextResponse.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canManageUsers(user.role)) {
      return NextResponse.json({ error: 'Không có quyền chỉnh sửa tài khoản' }, { status: 403 });
    }

    const { id, full_name, role, password } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
    }

    let updates: string[] = [];
    let params: any[] = [id];

    if (full_name) {
      params.push(full_name.trim());
      updates.push(`full_name = $${params.length}`);
    }

    if (role) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (password && password.trim()) {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      params.push(passwordHash);
      updates.push(`password_hash = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'Không có thông tin thay đổi' });
    }

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING id, username, full_name, role, created_at`;
    const result = await query(sql, params);

    return NextResponse.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error('Users PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canManageUsers(user.role)) {
      return NextResponse.json({ error: 'Không có quyền xóa tài khoản' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'Không thể tự xóa tài khoản đang đăng nhập' }, { status: 400 });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Users DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
