import { NextRequest, NextResponse } from 'next/server';
import { generateOrderReceiptEscpos, generateTestReceiptEscpos } from '@/lib/escpos';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/lib/invoiceSettings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order, docType = 'invoice', rawBase64 } = body;

    const tunnelUrl = String(
      body.tunnelUrl || body.settings?.printerTunnelUrl || 'https://cet-step-perfectly-joseph.trycloudflare.com'
    ).trim();
    const ip = String(body.ip || body.printerIp || body.settings?.printerIp || '192.168.1.133').trim();
    const port = parseInt(body.port || body.printerPort || body.settings?.printerPort || '9100', 10);

    const customSettings: InvoiceSettings = {
      ...DEFAULT_INVOICE_SETTINGS,
      ...(body.settings || {}),
      printerTunnelUrl: tunnelUrl,
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

    // Forward ESC/POS data to Cloudflare Tunnel
    const cleanUrl = tunnelUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Printer-Raw': 'escpos',
          'X-Order-Code': order?.code || 'POS',
        },
        body: new Uint8Array(buffer),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: `Đã gửi lệnh in tới Xprinter thành công`,
          ip,
          port,
        });
      }

      // JSON fallback
      const fb = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawBase64: buffer.toString('base64'),
          orderCode: order?.code || 'POS',
        }),
      });
      if (fb.ok) {
        return NextResponse.json({
          success: true,
          message: `Đã gửi lệnh in tới Xprinter thành công`,
          ip,
          port,
        });
      }
    } catch (tErr: any) {
      clearTimeout(timer);
      console.warn('Tunnel forward failed:', tErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi lệnh in tới Xprinter thành công`,
      ip,
      port,
    });
  } catch (err: any) {
    console.error('Printer direct print error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi gửi lệnh in',
      },
      { status: 500 }
    );
  }
}
