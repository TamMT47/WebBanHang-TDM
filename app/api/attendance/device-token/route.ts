import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';
import { signDeviceToken, verifyDeviceToken, validateAttendanceAccess } from '@/lib/attendanceServerHelper';

export const dynamic = 'force-dynamic';

/**
 * GET: Verify a Device Token
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || '';

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Thiếu token cần kiểm tra' }, { status: 400 });
    }

    const result = verifyDeviceToken(token, user.id);

    return NextResponse.json({
      valid: result.valid,
      payload: result.payload || null,
      error: result.error || null,
    });
  } catch (err: any) {
    console.error('Device token GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Issue a Device Token
 * - Allowed if current user has matched IP OR is Manager/Admin/Owner.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { target_user_id, client_public_ip } = body;

    const isManagerOrAdmin = canViewSensitiveFinancials(user.role);
    const targetUserId = (isManagerOrAdmin && target_user_id) ? target_user_id : user.id;

    // Check if requester has authority or current IP is in whitelist
    const access = await validateAttendanceAccess({
      request,
      userId: targetUserId,
      clientPublicIp: client_public_ip,
    });

    if (!isManagerOrAdmin && !access.isIpMatched) {
      return NextResponse.json(
        {
          error: 'Chỉ có thể tự động cấp Token khi đang kết nối đúng Wi-Fi Cửa Hàng, hoặc do Quản lý/Admin cấp quyền.',
          isIpMatched: false,
        },
        { status: 403 }
      );
    }

    const deviceToken = signDeviceToken(targetUserId);

    return NextResponse.json({
      success: true,
      message: `Đã cấp quyền tin tưởng thiết bị thành công (Hạn 30 ngày)!`,
      deviceToken,
      userId: targetUserId,
      expiresInDays: 30,
    });
  } catch (err: any) {
    console.error('Device token POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
