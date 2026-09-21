import { getInvoiceSettings, InvoiceSettings, DEFAULT_INVOICE_SETTINGS } from './invoiceSettings';

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PrinterPingResult {
  online: boolean;
  message: string;
  latencyMs?: number;
  mode?: string;
  error?: string;
}

const DEFAULT_TUNNEL_URL = 'https://cet-step-perfectly-joseph.trycloudflare.com';

/**
 * Check/Ping Printer connection status via Cloudflare Tunnel Gateway
 */
export async function pingPrinterStatus(customSettings?: Partial<InvoiceSettings>): Promise<PrinterPingResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const tunnelUrl = merged.printerTunnelUrl || DEFAULT_TUNNEL_URL;
  const ip = merged.printerIp || '192.168.1.133';
  const port = merged.printerPort || 9100;
  const startTime = Date.now();

  try {
    const res = await fetch(`/api/print-relay?check=ping&mode=tunnel&tunnelUrl=${encodeURIComponent(tunnelUrl)}&ip=${encodeURIComponent(ip)}&port=${port}`);
    const data = await res.json();
    return {
      online: Boolean(data.online),
      message: data.message || (data.online ? 'Máy in Xprinter sẵn sàng qua Cloudflare Tunnel' : 'Chưa kết nối Cloudflare Tunnel'),
      latencyMs: data.latencyMs || (Date.now() - startTime),
      mode: 'tunnel',
      error: data.error,
    };
  } catch (err: any) {
    return {
      online: false,
      message: 'Không thể kết nối Cloudflare Tunnel',
      error: err.message,
    };
  }
}

/**
 * Send Test Print (K80 bill) directly via Cloudflare Tunnel
 * Completely silent, no AirPrint / window.print()
 */
export async function testLanPrinter(
  ip?: string,
  port?: number,
  customSettings?: Partial<InvoiceSettings>
): Promise<PrintResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const targetIp = (ip || merged.printerIp || '192.168.1.133').trim();
  const targetPort = port || merged.printerPort || 9100;
  const tunnelUrl = (merged.printerTunnelUrl || DEFAULT_TUNNEL_URL).trim();

  try {
    const res = await fetch('/api/print-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        connectionMode: 'tunnel',
        tunnelUrl,
        ip: targetIp,
        port: targetPort,
        settings: {
          ...merged,
          printerConnectionMode: 'tunnel',
          printerTunnelUrl: tunnelUrl,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi gửi lệnh in tới máy in');
    }

    return {
      success: true,
      message: '🟢 Đã gửi lệnh in tới Xprinter thành công',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `🔴 ${err.message || 'Không thể gửi lệnh in tới máy in qua Cloudflare Tunnel'}`,
    };
  }
}

/**
 * Print order or warranty slip SILENTLY & DIRECTLY via Cloudflare Tunnel
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
  const targetIp = (options?.customSettings?.printerIp || merged.printerIp || '192.168.1.133').trim();
  const targetPort = options?.customSettings?.printerPort || merged.printerPort || 9100;
  const tunnelUrl = (merged.printerTunnelUrl || DEFAULT_TUNNEL_URL).trim();

  try {
    const res = await fetch('/api/print-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'print',
        connectionMode: 'tunnel',
        tunnelUrl,
        ip: targetIp,
        port: targetPort,
        order,
        docType,
        settings: {
          ...merged,
          printerConnectionMode: 'tunnel',
          printerTunnelUrl: tunnelUrl,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi gửi lệnh in hóa đơn');
    }

    return {
      success: true,
      message: '🟢 Đã gửi lệnh in tới Xprinter thành công',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `🔴 ${err.message || 'Không thể kết nối máy in qua Cloudflare Tunnel'}`,
    };
  }
}

