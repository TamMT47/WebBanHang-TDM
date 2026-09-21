import { NextRequest, NextResponse } from 'next/server';
import net from 'net';
import { generateOrderReceiptEscpos, generateTestReceiptEscpos } from '@/lib/escpos';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/lib/invoiceSettings';

export const dynamic = 'force-dynamic';

/**
 * Send raw ESC/POS binary data to printer via TCP socket (JetDirect RAW Port 9100)
 */
function sendRawToPrinter(ip: string, port: number, buffer: Buffer, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let isHandled = false;

    const cleanup = () => {
      try {
        if (!client.destroyed) {
          client.destroy();
        }
      } catch (e) {}
    };

    client.setTimeout(timeoutMs);

    client.on('timeout', () => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        reject(new Error(`Timeout: Không thể kết nối tới máy in LAN ${ip}:${port} sau ${timeoutMs / 1000}s`));
      }
    });

    client.on('error', (err: any) => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        const msg =
          err.code === 'ECONNREFUSED'
            ? `Máy in từ chối kết nối tại ${ip}:${port}`
            : err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH'
            ? `Không tìm thấy địa chỉ IP máy in ${ip}:${port} trong mạng LAN`
            : `Lỗi kết nối máy in (${err.message || err.code})`;
        reject(new Error(msg));
      }
    });

    client.connect(port, ip, () => {
      client.write(buffer, (writeErr) => {
        if (writeErr) {
          if (!isHandled) {
            isHandled = true;
            cleanup();
            reject(writeErr);
          }
        } else {
          setTimeout(() => {
            if (!isHandled) {
              isHandled = true;
              try {
                client.end();
              } catch (e) {}
              cleanup();
              resolve();
            }
          }, 300);
        }
      });
    });
  });
}

/**
 * Forward ESC/POS data via Cloudflare Tunnel URL
 */
async function sendToCloudflareTunnel(
  tunnelUrl: string,
  buffer: Buffer,
  orderCode?: string,
  timeoutMs = 6000
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanUrl = tunnelUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try sending to Tunnel endpoint: raw body, or JSON with base64
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Printer-Raw': 'escpos',
        'X-Order-Code': orderCode || 'TEST',
      },
      body: new Uint8Array(buffer),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) {
      return {
        success: true,
        message: `Đã bắn dữ liệu in thành công qua Cloudflare Tunnel Gateway`,
      };
    }

    // Try fallback JSON payload if octet-stream wasn't handled by custom web relay
    const fallbackResponse = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawBase64: buffer.toString('base64'),
        orderCode: orderCode || 'TEST',
      }),
    });

    if (fallbackResponse.ok) {
      return {
        success: true,
        message: `Đã gửi lệnh in thành công qua Cloudflare Tunnel Relay`,
      };
    }

    throw new Error(`Cloudflare Tunnel trả về mã lỗi HTTP ${response.status}`);
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Hết thời gian chờ (${timeoutMs / 1000}s) khi kết nối Cloudflare Tunnel`);
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'print', order, docType = 'invoice', rawBase64 } = body;

    const connectionMode = body.connectionMode || body.settings?.printerConnectionMode || 'tunnel';
    const tunnelUrl = String(
      body.tunnelUrl || body.settings?.printerTunnelUrl || 'https://cet-step-perfectly-joseph.trycloudflare.com'
    ).trim();
    const ip = String(body.ip || body.printerIp || body.settings?.printerIp || '192.168.1.133').trim();
    const port = parseInt(body.port || body.printerPort || body.settings?.printerPort || '9100', 10);

    const customSettings: InvoiceSettings = {
      ...DEFAULT_INVOICE_SETTINGS,
      ...(body.settings || {}),
      printerConnectionMode: connectionMode,
      printerTunnelUrl: tunnelUrl,
      printerIp: ip,
      printerPort: port,
      printerPaperSize: body.printerPaperSize || body.paperSize || 'k80',
    };

    let buffer: Buffer;
    if (rawBase64) {
      buffer = Buffer.from(rawBase64, 'base64');
    } else if (action === 'test' || !order) {
      buffer = generateTestReceiptEscpos(customSettings);
    } else {
      buffer = generateOrderReceiptEscpos(order, customSettings, docType);
    }

    // MODE 1: CLOUDFLARE TUNNEL (Recommended)
    if (connectionMode === 'tunnel' && tunnelUrl) {
      try {
        const tunnelRes = await sendToCloudflareTunnel(tunnelUrl, buffer, order?.code);
        return NextResponse.json({
          success: true,
          message: `Đã gửi lệnh in thành công tới máy in Xprinter (${ip} qua Tunnel)`,
          mode: 'tunnel',
          tunnelUrl,
          ip,
          port,
        });
      } catch (tunnelErr: any) {
        console.warn('Tunnel relay failed, attempting local TCP socket fallback:', tunnelErr.message);
        
        // If tunnel fails, attempt direct TCP fallback
        try {
          await sendRawToPrinter(ip, port, buffer, 3000);
          return NextResponse.json({
            success: true,
            message: `Đã gửi lệnh in thành công tới máy in (${ip}:${port})`,
            mode: 'lan-fallback',
            ip,
            port,
          });
        } catch (socketErr: any) {
          return NextResponse.json(
            {
              success: false,
              error: `Lỗi Tunnel: ${tunnelErr.message}. Socket LAN: ${socketErr.message}`,
              escposBase64: buffer.toString('base64'),
              mode: 'tunnel',
              ip,
              port,
            },
            { status: 502 }
          );
        }
      }
    }

    // MODE 2: DIRECT TCP LAN SOCKET
    try {
      await sendRawToPrinter(ip, port, buffer, 3500);

      return NextResponse.json({
        success: true,
        message: `Đã gửi lệnh in thành công tới máy in Xprinter (${ip})`,
        mode: 'lan',
        ip,
        port,
      });
    } catch (socketErr: any) {
      console.warn(`Direct TCP LAN socket failed for ${ip}:${port}:`, socketErr.message);

      return NextResponse.json(
        {
          success: false,
          error: socketErr.message || `Không thể kết nối máy in ${ip}:${port}`,
          escposBase64: buffer.toString('base64'),
          mode: 'lan',
          ip,
          port,
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('Print relay error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi xử lý Web Print Relay',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const check = searchParams.get('check');

  if (check === 'ping') {
    const mode = searchParams.get('mode') || 'tunnel';
    const tunnelUrl = searchParams.get('tunnelUrl') || 'https://cet-step-perfectly-joseph.trycloudflare.com';
    const ip = searchParams.get('ip') || '192.168.1.133';
    const port = parseInt(searchParams.get('port') || '9100', 10);

    const startTime = Date.now();

    if (mode === 'tunnel' && tunnelUrl) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(tunnelUrl.replace(/\/+$/, ''), {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timer);
        const latencyMs = Date.now() - startTime;

        return NextResponse.json({
          online: true,
          mode: 'tunnel',
          target: tunnelUrl,
          ip,
          port,
          latencyMs,
          status: res.status,
          message: `Máy in sẵn sàng (Cloudflare Tunnel: ${latencyMs}ms)`,
        });
      } catch (err: any) {
        return NextResponse.json({
          online: false,
          mode: 'tunnel',
          target: tunnelUrl,
          ip,
          port,
          error: err.message || 'Không thể ping Cloudflare Tunnel',
          message: `Không phản hồi từ Cloudflare Tunnel (${tunnelUrl})`,
        });
      }
    }

    // Ping LAN socket
    try {
      const client = new net.Socket();
      await new Promise<void>((resolve, reject) => {
        client.setTimeout(2500);
        client.on('timeout', () => {
          client.destroy();
          reject(new Error('Socket Ping Timeout'));
        });
        client.on('error', (e) => {
          client.destroy();
          reject(e);
        });
        client.connect(port, ip, () => {
          client.end();
          resolve();
        });
      });

      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        online: true,
        mode: 'lan',
        target: `${ip}:${port}`,
        ip,
        port,
        latencyMs,
        message: `Máy in LAN sẵn sàng (${ip}:${port} - ${latencyMs}ms)`,
      });
    } catch (err: any) {
      return NextResponse.json({
        online: false,
        mode: 'lan',
        target: `${ip}:${port}`,
        ip,
        port,
        error: err.message || 'Socket không phản hồi',
        message: `Không kết nối được máy in LAN (${ip}:${port})`,
      });
    }
  }

  return NextResponse.json({
    status: 'ok',
    service: 'TD Mobile Store Web Print Relay Bridge',
    modes: ['tunnel', 'lan'],
    defaultTunnelUrl: 'https://cet-step-perfectly-joseph.trycloudflare.com',
    targetDefaultIp: '192.168.1.133',
    targetDefaultPort: 9100,
  });
}
