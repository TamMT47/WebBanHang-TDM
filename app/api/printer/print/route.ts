import { NextRequest, NextResponse } from 'next/server';
import net from 'net';
import { generateOrderReceiptEscpos, generateTestReceiptEscpos } from '@/lib/escpos';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/lib/invoiceSettings';

export const dynamic = 'force-dynamic';

function sendRawToPrinter(ip: string, port: number, buffer: Buffer, timeoutMs = 3500): Promise<void> {
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
          setTimeout(() => {
            if (!isHandled) {
              isHandled = true;
              try {
                client.end();
              } catch (e) {}
              cleanup();
              resolve();
            }
          }, 250);
        }
      });
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order, docType = 'invoice', rawBase64 } = body;

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
    } else if (order) {
      buffer = generateOrderReceiptEscpos(order, customSettings, docType);
    } else {
      buffer = generateTestReceiptEscpos(customSettings);
    }

    // Send ESC/POS bytes directly over TCP JetDirect Socket 9100
    await sendRawToPrinter(ip, port, buffer);

    return NextResponse.json({
      success: true,
      message: `Đã in ${docType === 'warranty' ? 'phiếu bảo hành' : 'hóa đơn'} thành công tới máy in (${ip}:${port})!`,
      ip,
      port,
    });
  } catch (err: any) {
    console.error('Printer direct print error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Không thể gửi lệnh in tới máy in LAN',
      },
      { status: 500 }
    );
  }
}
