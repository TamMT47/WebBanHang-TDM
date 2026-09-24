import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getClientIp } from '@/lib/ipHelper';
import { DeviceTokenPayload, isIpInWhitelist } from '@/lib/attendanceHelper';

const JWT_SECRET = process.env.JWT_SECRET || 'td_mobile_store_super_secret_key_2026_jwt';

/**
 * Sign a 30-day cryptographically secure Device Token
 */
export function signDeviceToken(userId: string, shopId: string = 'td_mobile_store'): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 30 * 24 * 60 * 60; // 30 days
  return jwt.sign(
    {
      userId,
      type: 'attendance_device_token',
      shopId,
      issuedAt,
      expiresAt,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Verify a Device Token
 */
export function verifyDeviceToken(
  token: string,
  expectedUserId?: string
): { valid: boolean; payload?: DeviceTokenPayload; error?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Thiếu Device Token' };
    }
    const decoded = jwt.verify(token.trim(), JWT_SECRET) as any;
    if (decoded?.type !== 'attendance_device_token') {
      return { valid: false, error: 'Token không đúng định dạng thiết bị chấm công' };
    }
    if (expectedUserId && decoded.userId !== expectedUserId) {
      return { valid: false, error: 'Token thiết bị này thuộc về tài khoản khác' };
    }
    return { valid: true, payload: decoded };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token thiết bị không hợp lệ hoặc đã hết hạn' };
  }
}

/**
 * Get the list of all trusted Store Wi-Fi IPs from store_settings
 */
export async function getStoreWifiIps(): Promise<string[]> {
  try {
    const res = await query(
      "SELECT key, value FROM store_settings WHERE key IN ('store_wifi_ips', 'store_wifi_ip')"
    );
    const ipSet = new Set<string>();

    for (const row of res.rows) {
      if (!row.value) continue;
      const val = row.value.trim();
      if (!val) continue;

      if (row.key === 'store_wifi_ips') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsed.forEach((ip: string) => {
              if (typeof ip === 'string' && ip.trim()) ipSet.add(ip.trim());
            });
            continue;
          }
        } catch {
          // Comma or newline separated
          val.split(/[\n,;]+/).forEach((ip: string) => {
            if (ip.trim()) ipSet.add(ip.trim());
          });
          continue;
        }
      }

      // store_wifi_ip (single or comma list)
      val.split(/[\n,;]+/).forEach((ip: string) => {
        if (ip.trim()) ipSet.add(ip.trim());
      });
    }

    return Array.from(ipSet);
  } catch (err) {
    console.error('Error fetching store wifi IPs:', err);
    return [];
  }
}

/**
 * Combined Access Validation for Attendance
 * Returns true if (IP in Whitelist) OR (Valid 30-day Device Token)
 */
export async function validateAttendanceAccess(params: {
  request: NextRequest;
  userId: string;
  clientPublicIp?: string;
  deviceToken?: string;
}): Promise<{
  allowed: boolean;
  isIpMatched: boolean;
  isDeviceTrusted: boolean;
  newDeviceToken?: string;
  clientIp: string;
  storeWifiIps: string[];
  errorMessage?: string;
}> {
  const { request, userId, clientPublicIp, deviceToken } = params;

  const requestIp = getClientIp(request);
  const effectiveIp = (clientPublicIp || requestIp || '').trim();
  const storeWifiIps = await getStoreWifiIps();

  const isIpMatched = isIpInWhitelist(effectiveIp, storeWifiIps) || isIpInWhitelist(requestIp, storeWifiIps);

  let isDeviceTrusted = false;
  if (deviceToken) {
    const tokenCheck = verifyDeviceToken(deviceToken, userId);
    isDeviceTrusted = tokenCheck.valid;
  }

  const allowed = isIpMatched || isDeviceTrusted;

  let newDeviceToken: string | undefined = undefined;
  if (allowed) {
    // Generate or refresh 30-day token on successful verification
    newDeviceToken = signDeviceToken(userId);
  }

  let errorMessage: string | undefined = undefined;
  if (!allowed) {
    if (storeWifiIps.length === 0) {
      errorMessage = 'Cửa hàng chưa cấu hình IP Wi-Fi chấm công. Vui lòng liên hệ Quản lý / Admin để cài đặt IP hoặc cấp quyền thiết bị!';
    } else {
      errorMessage = `Bạn chưa kết nối đúng mạng Wi-Fi cửa hàng hoặc thiết bị chưa được cấp quyền tin tưởng. (IP hiện tại: ${effectiveIp || 'Không xác định'} | Dải IP Shop: ${storeWifiIps.join(', ')})`;
    }
  }

  return {
    allowed,
    isIpMatched,
    isDeviceTrusted,
    newDeviceToken,
    clientIp: effectiveIp || requestIp,
    storeWifiIps,
    errorMessage,
  };
}
