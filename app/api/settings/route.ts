import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getClientIp } from '@/lib/ipHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const res = await query('SELECT key, value, description FROM store_settings');
    const settings: Record<string, string> = {};
    for (const row of res.rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({
      settings,
      clientIp,
      storeWifiIp: settings['store_wifi_ip'] || '',
      isWifiMatch: !settings['store_wifi_ip'] || settings['store_wifi_ip'] === clientIp || clientIp === '127.0.0.1' || clientIp === '::1',
    });
  } catch (err: any) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Admin hoặc Chủ cửa hàng mới có quyền thay đổi cài đặt hệ thống' },
        { status: 403 }
      );
    }

    const { key, value, description } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'Thiếu key cài đặt' }, { status: 400 });
    }

    await query(
      `INSERT INTO store_settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = $2, description = COALESCE($3, store_settings.description), updated_at = NOW()`,
      [key, String(value ?? '').trim(), description || null]
    );

    return NextResponse.json({
      success: true,
      message: `Đã lưu cài đặt "${key}" thành công!`,
      key,
      value: String(value ?? '').trim(),
    });
  } catch (err: any) {
    console.error('Settings POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
