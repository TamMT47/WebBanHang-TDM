import { getInvoiceSettings, InvoiceSettings } from './invoiceSettings';

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send Test Print (5cm bill) directly via Web Print Relay (/api/print-relay)
 * Completely silent, no AirPrint / window.print()
 */
export async function testLanPrinter(
  ip?: string,
  port?: number,
  customSettings?: Partial<InvoiceSettings>
): Promise<PrintResult> {
  const settings = getInvoiceSettings();
  const targetIp = (ip || settings.printerIp || '192.168.1.133').trim();
  const targetPort = port || settings.printerPort || 9100;

  try {
    const res = await fetch('/api/print-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        ip: targetIp,
        port: targetPort,
        settings: { ...settings, ...customSettings },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Không kết nối được máy in LAN (${targetIp}:${targetPort})`);
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
 * Print order or warranty slip SILENTLY & DIRECTLY via Web Print Relay (/api/print-relay)
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
  const targetIp = (options?.customSettings?.printerIp || settings.printerIp || '192.168.1.133').trim();
  const targetPort = options?.customSettings?.printerPort || settings.printerPort || 9100;

  try {
    const res = await fetch('/api/print-relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'print',
        ip: targetIp,
        port: targetPort,
        order,
        docType,
        settings: { ...settings, ...options?.customSettings },
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
    const errorMsg = `🔴 Không kết nối được máy in LAN (${targetIp}:${targetPort}). Vui lòng kiểm tra Wifi shop & nguồn máy in.`;
    return {
      success: false,
      error: errorMsg,
    };
  }
}
