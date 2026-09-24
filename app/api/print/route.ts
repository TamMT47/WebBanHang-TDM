import { NextRequest, NextResponse } from 'next/server';
import { generateOrderReceiptEscpos, generateTestReceiptEscpos } from '@/lib/escpos';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/lib/invoiceSettings';
import { QzTrayServerBridge } from '@/lib/qzTrayServerBridge';

export const dynamic = 'force-dynamic';

/**
 * GET: Ping & Check Status / Discover Printers from QZ Tray
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qzHost = searchParams.get('qzHost') || '127.0.0.1';
    const qzPort = parseInt(searchParams.get('qzPort') || '8182', 10);
    const qzSecure = searchParams.get('qzSecure') === 'true';

    const qzBridge = new QzTrayServerBridge({
      host: qzHost,
      port: qzPort,
      secure: qzSecure,
    });
    const pingResult = await qzBridge.ping();
    return NextResponse.json(pingResult);
  } catch (err: any) {
    return NextResponse.json({ online: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST: Execute Silent Print Job via QZ Tray Print Server (MacBook USB Xprinter USB Printer P)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'print', order, docType = 'invoice', rawBase64 } = body;

    const qzHost = body.qzHost || body.settings?.qzHost || '127.0.0.1';
    const qzPort = parseInt(body.qzPort || body.settings?.qzPort || '8182', 10);
    const qzSecure = body.qzSecure !== undefined ? Boolean(body.qzSecure) : body.settings?.qzSecure ?? true;
    const targetPrinter = (body.qzPrinterName || body.settings?.qzPrinterName || 'Xprinter USB Printer P').trim();

    const customSettings: InvoiceSettings = {
      ...DEFAULT_INVOICE_SETTINGS,
      ...(body.settings || {}),
      printerConnectionMode: 'qz-tray',
      qzHost,
      qzPort,
      qzSecure,
      qzPrinterName: targetPrinter,
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

    // 2. Mode: QZ TRAY PRINT SERVER (MacBook USB Xprinter USB Printer P)
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

    // Return informative error if QZ Tray failed
    return NextResponse.json(
      {
        success: false,
        error: qzResult.error || qzResult.message,
        mode: 'qz-tray',
        printer: targetPrinter,
      },
      { status: 502 }
    );
  } catch (err: any) {
    console.error('API /api/print error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Lỗi xử lý gửi lệnh in ESC/POS qua QZ Tray',
      },
      { status: 500 }
    );
  }
}
