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

const DEFAULT_TUNNEL_URL = 'https://cet-step-perfectly-joseph.trycloudflare.com';

/**
 * Check/Ping Printer connection status (QZ Tray / Cloudflare Tunnel / LAN Socket)
 */
export async function pingPrinterStatus(customSettings?: Partial<InvoiceSettings>): Promise<PrinterPingResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const mode = merged.printerConnectionMode || 'qz-tray';
  const startTime = Date.now();

  // 1. QZ Tray Status Check
  if (mode === 'qz-tray') {
    const qzHost = merged.qzHost || '127.0.0.1';
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
        message: data.message || (data.online ? '🟢 QZ Tray sẵn sàng trên MacBook M2' : '🔴 Chưa kết nối QZ Tray'),
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

  // 2. Cloudflare Tunnel Status Check
  if (mode === 'tunnel') {
    const tunnelUrl = merged.printerTunnelUrl || DEFAULT_TUNNEL_URL;
    const ip = merged.printerIp || '192.168.1.133';
    const port = merged.printerPort || 9100;

    try {
      const res = await fetch(
        `/api/print?mode=tunnel&tunnelUrl=${encodeURIComponent(tunnelUrl)}&ip=${encodeURIComponent(ip)}&port=${port}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      return {
        online: Boolean(data.online),
        message: data.message || (data.online ? '🟢 Máy in sẵn sàng qua Cloudflare Tunnel' : '🔴 Chưa kết nối Cloudflare Tunnel'),
        latencyMs: data.latencyMs || (Date.now() - startTime),
        mode: 'tunnel',
        error: data.error,
      };
    } catch (err: any) {
      return {
        online: false,
        message: '🔴 Không thể kết nối Cloudflare Tunnel',
        mode: 'tunnel',
        error: err.message,
      };
    }
  }

  // 3. Direct LAN Socket
  return {
    online: true,
    message: `🟢 Cấu hình in LAN Socket (${merged.printerIp}:${merged.printerPort})`,
    mode: 'lan',
  };
}

/**
 * Send Test Print (K80 bill) directly via /api/print (QZ Tray / Cloudflare Tunnel / RAW TCP Socket)
 * Completely silent, no AirPrint / window.print()
 */
export async function testLanPrinter(
  ip?: string,
  port?: number,
  customSettings?: Partial<InvoiceSettings>
): Promise<PrintResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const connectionMode = merged.printerConnectionMode || 'qz-tray';
  const targetIp = (ip || merged.printerIp || '192.168.1.133').trim();
  const targetPort = port || merged.printerPort || 9100;
  const tunnelUrl = (merged.printerTunnelUrl || DEFAULT_TUNNEL_URL).trim();

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        connectionMode,
        qzHost: merged.qzHost || '127.0.0.1',
        qzPort: merged.qzPort || 8182,
        qzSecure: merged.qzSecure ?? true,
        qzPrinterName: merged.qzPrinterName || 'XP-A160H',
        tunnelUrl,
        ip: targetIp,
        port: targetPort,
        settings: {
          ...merged,
          printerConnectionMode: connectionMode,
          printerTunnelUrl: tunnelUrl,
          printerIp: targetIp,
          printerPort: targetPort,
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
      mode: data.mode,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `🔴 ${err.message || 'Không thể gửi lệnh in qua Print Server'}`,
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
  const connectionMode = merged.printerConnectionMode || 'qz-tray';
  const targetIp = (options?.customSettings?.printerIp || merged.printerIp || '192.168.1.133').trim();
  const targetPort = options?.customSettings?.printerPort || merged.printerPort || 9100;
  const tunnelUrl = (merged.printerTunnelUrl || DEFAULT_TUNNEL_URL).trim();

  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'print',
        connectionMode,
        qzHost: merged.qzHost || '127.0.0.1',
        qzPort: merged.qzPort || 8182,
        qzSecure: merged.qzSecure ?? true,
        qzPrinterName: merged.qzPrinterName || 'XP-A160H',
        tunnelUrl,
        ip: targetIp,
        port: targetPort,
        order,
        docType,
        settings: {
          ...merged,
          printerConnectionMode: connectionMode,
          printerTunnelUrl: tunnelUrl,
          printerIp: targetIp,
          printerPort: targetPort,
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
      mode: data.mode,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `🔴 ${err.message || 'Không thể gửi lệnh in tới máy in'}`,
    };
  }
}
