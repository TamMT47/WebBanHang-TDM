import { getInvoiceSettings, InvoiceSettings, DEFAULT_INVOICE_SETTINGS } from './invoiceSettings';

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
  printer?: string;
  mode?: string;
}

export interface PrinterPingResult {
  online: boolean;
  message: string;
  latencyMs?: number;
  mode?: string;
  printers?: string[];
  error?: string;
}

/**
 * Check/Ping Printer connection status (QZ Tray Print Server on MacBook Host)
 */
export async function pingPrinterStatus(customSettings?: Partial<InvoiceSettings>): Promise<PrinterPingResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const startTime = Date.now();

  const qzHost = merged.qzHost || (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1');
  const qzPort = merged.qzPort || 8182;
  const qzSecure = merged.qzSecure ?? true;

  try {
    const res = await fetch(
      `/api/print?mode=qz-tray&qzHost=${encodeURIComponent(qzHost)}&qzPort=${qzPort}&qzSecure=${qzSecure}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return {
      online: Boolean(data.online),
      message: data.message || (data.online ? '🟢 QZ Tray sẵn sàng trên MacBook Host' : '🔴 Chưa kết nối QZ Tray'),
      latencyMs: data.latencyMs || (Date.now() - startTime),
      mode: 'qz-tray',
      printers: data.printers || [],
      error: data.error,
    };
  } catch (err: any) {
    return {
      online: false,
      message: `🔴 Không kết nối được QZ Tray Print Server: ${err.message}`,
      mode: 'qz-tray',
      error: err.message,
    };
  }
}

/**
 * Send Test Print (K80 bill) directly via /api/print (QZ Tray USB Print Server)
 * Completely silent, no AirPrint / window.print()
 */
export async function testLanPrinter(
  ip?: string,
  port?: number,
  customSettings?: Partial<InvoiceSettings>
): Promise<PrintResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const qzHost = merged.qzHost || (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1');

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        connectionMode: 'qz-tray',
        qzHost,
        qzPort: merged.qzPort || 8182,
        qzSecure: merged.qzSecure ?? true,
        qzPrinterName: merged.qzPrinterName || 'Xprinter USB Printer P',
        settings: {
          ...merged,
          printerConnectionMode: 'qz-tray',
          qzHost,
          qzPrinterName: merged.qzPrinterName || 'Xprinter USB Printer P',
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi gửi lệnh in tới máy in');
    }

    return {
      success: true,
      message: data.message || '🟢 Đã gửi lệnh in thử nghiệm thành công',
      printer: data.printer,
      mode: 'qz-tray',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `🔴 ${err.message || 'Không thể gửi lệnh in qua QZ Tray Print Server'}`,
    };
  }
}

/**
 * Print order or warranty slip SILENTLY & DIRECTLY via /api/print
 * Completely bypasses and prevents iOS AirPrint popup & window.print() dialog.
 */
export async function printToLanPrinter(
  order: any,
  docType: 'invoice' | 'warranty' = 'invoice',
  options?: {
    customSettings?: Partial<InvoiceSettings>;
  }
): Promise<PrintResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...options?.customSettings };
  const qzHost = merged.qzHost || (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1');

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'print',
        connectionMode: 'qz-tray',
        qzHost,
        qzPort: merged.qzPort || 8182,
        qzSecure: merged.qzSecure ?? true,
        qzPrinterName: merged.qzPrinterName || 'Xprinter USB Printer P',
        order,
        docType,
        settings: {
          ...merged,
          printerConnectionMode: 'qz-tray',
          qzHost,
          qzPrinterName: merged.qzPrinterName || 'Xprinter USB Printer P',
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi gửi lệnh in hóa đơn');
    }

    return {
      success: true,
      message: data.message || '🟢 Đã in hóa đơn thành công',
      printer: data.printer,
      mode: 'qz-tray',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `🔴 ${err.message || 'Không thể gửi lệnh in tới máy in QZ Tray'}`,
    };
  }
}
