import { NextRequest, NextResponse } from 'next/server';
import net from 'net';
import { generateOrderReceiptEscpos, generateTestReceiptEscpos } from '@/lib/escpos';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/lib/invoiceSettings';
import { QzTrayServerBridge } from '@/lib/qzTrayServerBridge';

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

/**
 * GET: Ping & Check Status (QZ Tray / Tunnel / Socket)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'qz-tray';
    const qzHost = searchParams.get('qzHost') || '127.0.0.1';
    const qzPort = parseInt(searchParams.get('qzPort') || '8182', 10);
    const qzSecure = searchParams.get('qzSecure') === 'true';

    if (mode === 'qz-tray') {
      const qzBridge = new QzTrayServerBridge({
        host: qzHost,
        port: qzPort,
        secure: qzSecure,
      });
      const pingResult = await qzBridge.ping();
      return NextResponse.json(pingResult);
    }

    if (mode === 'tunnel') {
      const tunnelUrl = searchParams.get('tunnelUrl');
      if (!tunnelUrl) {
        return NextResponse.json({ online: false, message: 'Chưa cấu hình URL Cloudflare Tunnel' });
      }
      try {
        const res = await fetch(tunnelUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        return NextResponse.json({
          online: res.ok,
          message: res.ok ? '🟢 Cloudflare Tunnel hoạt động' : `🔴 Tunnel trả về mã ${res.status}`,
        });
      } catch (err: any) {
        return NextResponse.json({ online: false, message: `🔴 Lỗi kết nối Tunnel: ${err.message}` });
      }
    }

    return NextResponse.json({ online: true, message: '🟢 Sẵn sàng in' });
  } catch (err: any) {
    return NextResponse.json({ online: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST: Execute Silent Print Job (K80 ESC/POS Payload)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'print', order, docType = 'invoice', rawBase64 } = body;

    const connectionMode = body.connectionMode || body.settings?.printerConnectionMode || 'qz-tray';
    const qzHost = body.qzHost || body.settings?.qzHost || '127.0.0.1';
    const qzPort = parseInt(body.qzPort || body.settings?.qzPort || '8182', 10);
    const qzSecure = body.qzSecure !== undefined ? Boolean(body.qzSecure) : body.settings?.qzSecure ?? true;
    const targetPrinter = (body.qzPrinterName || body.settings?.qzPrinterName || 'XP-A160H').trim();

    const rawTunnel = String(
      body.tunnelUrl || body.settings?.printerTunnelUrl || 'https://cet-step-perfectly-joseph.trycloudflare.com'
    ).trim();
    const rawIp = String(body.ip || body.printerIp || body.settings?.printerIp || '192.168.1.133').trim();
    const port = parseInt(body.port || body.printerPort || body.settings?.printerPort || '9100', 10);

    const customSettings: InvoiceSettings = {
      ...DEFAULT_INVOICE_SETTINGS,
      ...(body.settings || {}),
      printerConnectionMode: connectionMode,
      qzHost,
      qzPort,
      qzSecure,
      qzPrinterName: targetPrinter,
      printerTunnelUrl: rawTunnel,
      printerIp: rawIp,
      printerPort: port,
      printerPaperSize: body.printerPaperSize || body.paperSize || 'k80',
    };

    // 1. Build Standard ESC/POS binary buffer (K80, 48 cols, VietQR, Cut GS V 0, Drawer DLE DC4)
    let buffer: Buffer;
    if (rawBase64) {
      buffer = Buffer.from(rawBase64, 'base64');
    } else if (action === 'test' || !order) {
      buffer = generateTestReceiptEscpos(customSettings);
    } else {
      buffer = generateOrderReceiptEscpos(order, customSettings, docType);
    }

    const base64Data = buffer.toString('base64');

    // 2. Mode: QZ TRAY PRINT SERVER (MacBook M2 USB Xprinter XP-A160H)
    if (connectionMode === 'qz-tray') {
      const qzBridge = new QzTrayServerBridge({
        host: qzHost,
        port: qzPort,
        secure: qzSecure,
      });

      const qzResult = await qzBridge.printRaw(base64Data, targetPrinter);

      if (qzResult.success) {
        return NextResponse.json({
          success: true,
          message: qzResult.message,
          mode: 'qz-tray',
          printer: qzResult.printer,
        });
      }

      // If QZ Tray failed, return informative error
      return NextResponse.json(
        {
          success: false,
          error: qzResult.error || qzResult.message,
          mode: 'qz-tray',
          printer: targetPrinter,
        },
        { status: 502 }
      );
    }

    // 3. Mode: Cloudflare Tunnel Gateway
    if (connectionMode === 'tunnel' && rawTunnel) {
      try {
        await sendTunnelPayload(rawTunnel, buffer, order?.code);
        return NextResponse.json({
          success: true,
          message: '🟢 Đã gửi lệnh in tới Xprinter thành công qua Cloudflare Tunnel',
          mode: 'tunnel',
        });
      } catch (tunnelErr: any) {
        console.warn('Tunnel HTTP failed, attempting fallback to local QZ Tray:', tunnelErr.message);

        // Auto fallback to local QZ Tray
        try {
          const qzBridge = new QzTrayServerBridge({ host: '127.0.0.1', port: 8181, secure: false });
          const qzResult = await qzBridge.printRaw(base64Data, targetPrinter);
          if (qzResult.success) {
            return NextResponse.json({
              success: true,
              message: `🟢 Đã in tự động qua QZ Tray dự phòng (${qzResult.printer})`,
              mode: 'qz-tray-fallback',
            });
          }
        } catch (e) {}

        return NextResponse.json(
          {
            success: false,
            error: `Không thể kết nối máy in qua Tunnel: ${tunnelErr.message}`,
            mode: 'tunnel',
          },
          { status: 502 }
        );
      }
    }

    // 4. Mode: Direct RAW TCP Socket delivery (LAN IP:9100)
    try {
      await sendRawSocket(rawIp, port, buffer, 3500);
      return NextResponse.json({
        success: true,
        message: `🟢 Đã gửi lệnh in tới Xprinter thành công (Socket ${rawIp}:${port})`,
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
