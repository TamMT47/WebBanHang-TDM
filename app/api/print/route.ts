import { NextRequest, NextResponse } from 'next/server';
import net from 'net';
import { generateOrderReceiptEscpos, generateTestReceiptEscpos } from '@/lib/escpos';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/lib/invoiceSettings';

export const dynamic = 'force-dynamic';

/**
 * Send RAW binary ESC/POS buffer to printer via Node.js TCP Socket (Port 9100)
 */
function sendRawSocket(host: string, port: number, buffer: Buffer, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let isHandled = false;

    const cleanup = () => {
      try {
        if (!socket.destroyed) {
          socket.destroy();
        }
      } catch (e) {}
    };

    socket.setTimeout(timeoutMs);

    socket.on('timeout', () => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        reject(new Error(`Timeout: Không thể kết nối tới Socket ${host}:${port} sau ${timeoutMs / 1000}s`));
      }
    });

    socket.on('error', (err: any) => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        const errorMsg =
          err.code === 'ECONNREFUSED'
            ? `Máy in từ chối kết nối Socket tại ${host}:${port}`
            : err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH'
            ? `Không tìm thấy địa chỉ máy in ${host}:${port}`
            : `Lỗi kết nối Socket máy in (${err.message || err.code})`;
        reject(new Error(errorMsg));
      }
    });

    socket.connect(port, host, () => {
      socket.write(buffer, (writeErr) => {
        if (writeErr) {
          if (!isHandled) {
            isHandled = true;
            cleanup();
            reject(writeErr);
          }
        } else {
          // Ensure all buffer is drained before closing socket
          socket.end(() => {
            if (!isHandled) {
              isHandled = true;
              cleanup();
              resolve();
            }
          });
        }
      });
    });
  });
}

/**
 * Forward ESC/POS raw binary to Cloudflare Tunnel Endpoint
 */
async function sendTunnelPayload(
  tunnelUrl: string,
  buffer: Buffer,
  orderCode?: string,
  timeoutMs = 6000
): Promise<{ success: boolean; message?: string }> {
  const cleanUrl = tunnelUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. Try sending raw octet-stream binary
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

    if (response.ok) {
      clearTimeout(timer);
      return { success: true, message: 'Đã gửi lệnh in thành công qua Cloudflare Tunnel' };
    }

    // 2. Try JSON Base64 payload
    const jsonRes = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawBase64: buffer.toString('base64'),
        orderCode: orderCode || 'TEST',
        action: 'print',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (jsonRes.ok) {
      return { success: true, message: 'Đã gửi lệnh in thành công qua Cloudflare Tunnel Relay' };
    }

    throw new Error(`Cloudflare Tunnel trả về status ${response.status}`);
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Timeout kết nối Cloudflare Tunnel sau ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'print', order, docType = 'invoice', rawBase64 } = body;

    const rawTunnel = String(
      body.tunnelUrl || body.settings?.printerTunnelUrl || 'https://cet-step-perfectly-joseph.trycloudflare.com'
    ).trim();
    const rawIp = String(body.ip || body.printerIp || body.settings?.printerIp || '192.168.1.133').trim();
    const port = parseInt(body.port || body.printerPort || body.settings?.printerPort || '9100', 10);
    const connectionMode = body.connectionMode || body.settings?.printerConnectionMode || 'tunnel';

    const customSettings: InvoiceSettings = {
      ...DEFAULT_INVOICE_SETTINGS,
      ...(body.settings || {}),
      printerTunnelUrl: rawTunnel,
      printerIp: rawIp,
      printerPort: port,
      printerPaperSize: body.printerPaperSize || body.paperSize || 'k80',
    };

    // 1. Build Standard ESC/POS binary buffer
    let buffer: Buffer;
    if (rawBase64) {
      buffer = Buffer.from(rawBase64, 'base64');
    } else if (action === 'test' || !order) {
      buffer = generateTestReceiptEscpos(customSettings);
    } else {
      buffer = generateOrderReceiptEscpos(order, customSettings, docType);
    }

    // 2. Parse Host / Cloudflare Tunnel
    let targetHost = rawIp;
    let isTunnelUrl = false;

    if (rawTunnel) {
      try {
        const parsed = new URL(rawTunnel.startsWith('http') ? rawTunnel : `https://${rawTunnel}`);
        targetHost = parsed.hostname;
        isTunnelUrl = true;
      } catch (e) {
        targetHost = rawTunnel;
      }
    }

    // 3. Deliver via Cloudflare Tunnel Gateway or RAW TCP Socket
    if (connectionMode === 'tunnel' && rawTunnel) {
      try {
        await sendTunnelPayload(rawTunnel, buffer, order?.code);
        return NextResponse.json({
          success: true,
          message: '🟢 Đã gửi lệnh in tới Xprinter thành công',
          mode: 'tunnel',
          host: targetHost,
          port,
        });
      } catch (tunnelErr: any) {
        console.warn('Tunnel HTTP failed, attempting direct RAW TCP socket to host:', tunnelErr.message);
        
        // Attempt RAW TCP Socket to parsed tunnel host / LAN IP
        try {
          await sendRawSocket(targetHost, port, buffer, 3000);
          return NextResponse.json({
            success: true,
            message: '🟢 Đã gửi lệnh in tới Xprinter thành công',
            mode: 'socket',
            host: targetHost,
            port,
          });
        } catch (socketErr: any) {
          // If socket also unreachable, return friendly message
          return NextResponse.json(
            {
              success: false,
              error: `Không thể kết nối máy in: ${tunnelErr.message || socketErr.message}`,
              mode: 'tunnel',
              host: targetHost,
              port,
            },
            { status: 502 }
          );
        }
      }
    }

    // Direct RAW TCP Socket delivery
    try {
      await sendRawSocket(rawIp, port, buffer, 3500);
      return NextResponse.json({
        success: true,
        message: '🟢 Đã gửi lệnh in tới Xprinter thành công',
        mode: 'socket',
        host: rawIp,
        port,
      });
    } catch (socketErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: socketErr.message || `Không thể kết nối máy in Socket ${rawIp}:${port}`,
          mode: 'socket',
          host: rawIp,
          port,
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error('API /api/print error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi xử lý gửi lệnh in ESC/POS',
      },
      { status: 500 }
    );
  }
}
