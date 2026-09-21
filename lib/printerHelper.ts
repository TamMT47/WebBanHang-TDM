import { getInvoiceSettings, InvoiceSettings } from './invoiceSettings';

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

/**
 * Check/Ping Printer connection status (Tunnel or LAN)
 */
export async function pingPrinterStatus(customSettings?: Partial<InvoiceSettings>): Promise<PrinterPingResult> {
  const settings = getInvoiceSettings();
  const merged = { ...settings, ...customSettings };
  const mode = merged.printerConnectionMode || 'tunnel';
  const tunnelUrl = encodeURIComponent(merged.printerTunnelUrl || 'https://cet-step-perfectly-joseph.trycloudflare.com');
  const ip = encodeURIComponent(merged.printerIp || '192.168.1.133');
  const port = merged.printerPort || 9100;

  try {
    const res = await fetch(`/api/print-relay?check=ping&mode=${mode}&tunnelUrl=${tunnelUrl}&ip=${ip}&port=${port}`);
    const data = await res.json();
    return {
      online: Boolean(data.online),
      message: data.message || (data.online ? 'Máy in Xprinter sẵn sàng' : 'Không kết nối được máy in'),
      latencyMs: data.latencyMs,
      mode: data.mode,
      error: data.error,
    };
  } catch (err: any) {
    return {
      online: false,
      message: 'Không thể kết nối dịch vụ kiểm tra',
      error: err.message,
    };
  }
}

/**
 * Send Test Print (5cm bill) directly via Cloudflare Tunnel / Web Print Relay
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
  const connectionMode = merged.printerConnectionMode || 'tunnel';
  const tunnelUrl = merged.printerTunnelUrl || 'https://cet-step-perfectly-joseph.trycloudflare.com';

  try {
    const res = await fetch('/api/print-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        connectionMode,
        tunnelUrl,
        ip: targetIp,
        port: targetPort,
        settings: merged,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Không kết nối được máy in (${targetIp})`);
    }

    return {
      success: true,
      message: `🟢 Đã gửi lệnh in thành công tới máy in Xprinter (${targetIp})`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `🔴 ${err.message || `Không thể kết nối máy in Xprinter (${targetIp}:${targetPort})`}`,
    };
  }
}

/**
 * Print order or warranty slip SILENTLY & DIRECTLY via Cloudflare Tunnel / Web Print Relay
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
  const connectionMode = merged.printerConnectionMode || 'tunnel';
  const tunnelUrl = merged.printerTunnelUrl || 'https://cet-step-perfectly-joseph.trycloudflare.com';

  try {
    const res = await fetch('/api/print-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'print',
        connectionMode,
        tunnelUrl,
        ip: targetIp,
        port: targetPort,
        order,
        docType,
        settings: merged,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Không kết nối được máy in LAN (${targetIp})`);
    }

    return {
      success: true,
      message: `🟢 Đã gửi lệnh in thành công tới máy in Xprinter (${targetIp})`,
    };
  } catch (err: any) {
    const errorMsg = `🔴 Không kết nối được máy in (${targetIp}:${targetPort}). Vui lòng kiểm tra Wifi shop & nguồn máy in.`;
    return {
      success: false,
      error: errorMsg,
    };
  }
}
