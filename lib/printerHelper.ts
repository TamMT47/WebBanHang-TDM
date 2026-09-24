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
  activeEndpoint?: string;
}

/**
 * Check/Ping Printer connection status (QZ Tray Print Server on MacBook Host)
 * Prioritizes port 8181 (ws:// direct non-SSL) with automatic fallback
 */
export async function pingPrinterStatus(customSettings?: Partial<InvoiceSettings>): Promise<PrinterPingResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const startTime = Date.now();

  const qzHost = merged.qzHost || (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'MacBook-Air-cua-Truong.local');
  const qzPort = merged.qzPort || 8181;
  const qzSecure = merged.qzSecure ?? false;

  try {
    const res = await fetch(
      `/api/print?mode=qz-tray&qzHost=${encodeURIComponent(qzHost)}&qzPort=${qzPort}&qzSecure=${qzSecure}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return {
      online: Boolean(data.online),
      message: data.message || (data.online ? `🟢 QZ Tray sẵn sàng tại ${qzHost}:${qzPort}` : `🔴 Chưa kết nối QZ Tray tại ${qzHost}:${qzPort}`),
      latencyMs: data.latencyMs || (Date.now() - startTime),
      mode: 'qz-tray',
      printers: data.printers || [],
      error: data.error,
      activeEndpoint: data.activeEndpoint || `${qzSecure ? 'wss' : 'ws'}://${qzHost}:${qzPort}`,
    };
  } catch (err: any) {
    return {
      online: false,
      message: `🔴 Không kết nối được QZ Tray Print Server tại ${qzHost}:${qzPort}: ${err.message}`,
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
  const qzHost = merged.qzHost || (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'MacBook-Air-cua-Truong.local');
  const qzPort = merged.qzPort || 8181;
  const qzSecure = merged.qzSecure ?? false;

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        connectionMode: 'qz-tray',
        qzHost,
        qzPort,
        qzSecure,
        qzPrinterName: merged.qzPrinterName || 'Xprinter USB Printer P',
        settings: {
          ...merged,
          printerConnectionMode: 'qz-tray',
          qzHost,
          qzPort,
          qzSecure,
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
      message: data.message || `🟢 Đã gửi lệnh in thử nghiệm thành công (${merged.qzPrinterName || 'Xprinter USB Printer P'})`,
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
  const qzHost = merged.qzHost || (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'MacBook-Air-cua-Truong.local');
  const qzPort = merged.qzPort || 8181;
  const qzSecure = merged.qzSecure ?? false;

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'print',
        connectionMode: 'qz-tray',
        qzHost,
        qzPort,
        qzSecure,
        qzPrinterName: merged.qzPrinterName || 'Xprinter USB Printer P',
        order,
        docType,
        settings: {
          ...merged,
          printerConnectionMode: 'qz-tray',
          qzHost,
          qzPort,
          qzSecure,
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
      message: data.message || `🟢 Đã in hóa đơn thành công (${data.printer || merged.qzPrinterName || 'Xprinter USB Printer P'})`,
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
