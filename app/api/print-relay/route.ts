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
      } catch (e) {
        // ignore
      }
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
          // Give printer time to receive and process
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'print', order, docType = 'invoice', rawBase64 } = body;

    const ip = String(body.ip || body.printerIp || '192.168.1.133').trim();
    const port = parseInt(body.port || body.printerPort || '9100', 10);

    const customSettings: InvoiceSettings = {
      ...DEFAULT_INVOICE_SETTINGS,
      ...(body.settings || {}),
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

    // Try TCP JetDirect Socket 9100 connection
    try {
      await sendRawToPrinter(ip, port, buffer, 3500);

      return NextResponse.json({
        success: true,
        message: `Đã gửi lệnh in thành công tới máy in Xprinter (${ip})`,
        ip,
        port,
        action,
        docType,
      });
    } catch (socketErr: any) {
      console.warn(`Print relay direct TCP socket failed for ${ip}:${port}:`, socketErr.message);

      // Return status along with base64 buffer for any local bridge
      return NextResponse.json(
        {
          success: false,
          error: socketErr.message || `Không thể kết nối máy in ${ip}:${port}`,
          ip,
          port,
          escposBase64: buffer.toString('base64'),
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

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'TD Mobile Store Web Print Relay Bridge',
    targetDefaultIp: '192.168.1.133',
    targetDefaultPort: 9100,
    escposProtocol: 'RAW TCP JetDirect 9100 / K80 Thermal',
  });
}
