import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện xóa dữ liệu hệ thống (Chỉ dành cho Admin / Chủ cửa hàng).' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password, confirmationText, wipeCustomers } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mật khẩu tài khoản hiện tại để xác thực bảo mật.' },
        { status: 400 }
      );
    }

    if (confirmationText !== 'XAC NHAN XOA' && confirmationText !== 'RESET') {
      return NextResponse.json(
        { error: 'Chuỗi xác nhận không chính xác. Vui lòng gõ đúng: XAC NHAN XOA' },
        { status: 400 }
      );
    }

    // Verify user password
    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Mật khẩu xác thực không đúng. Thao tác xóa dữ liệu bị hủy bỏ!' },
        { status: 401 }
      );
    }

    // Execute atomic factory wipe
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Delete all cash flow transaction entries
      await client.query('DELETE FROM cash_flow');

      // 2. Delete all order items & orders
      await client.query('DELETE FROM order_items');
      await client.query('DELETE FROM orders');

      // 3. Delete all inventory items
      await client.query('DELETE FROM inventory');

      // 4. Delete all products catalog (fresh start for product models)
      await client.query('DELETE FROM products');

      // 5. Handle partners / customers
      if (wipeCustomers) {
        // Delete all customers except system partner 'Khách Trade-in'
        await client.query("DELETE FROM partners WHERE name != 'Khách Trade-in'");
        await client.query("UPDATE partners SET debt = 0 WHERE name = 'Khách Trade-in'");
      } else {
        // Keep partners but reset all debts to 0
        await client.query('UPDATE partners SET debt = 0');
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Đã xóa sạch toàn bộ kho hàng, hóa đơn, sổ quỹ và công nợ thành công! Hệ thống sẵn sàng hoạt động chính thức.',
      });
    } catch (dbErr: any) {
      await client.query('ROLLBACK');
      console.error('System reset error:', dbErr);
      return NextResponse.json(
        { error: `Lỗi khi thực hiện xóa dữ liệu CSDL: ${dbErr.message}` },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('System reset request error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
