import { getInvoiceSettings, InvoiceSettings } from './invoiceSettings';

export interface PrintResult {
  success: boolean;
  message?: string;
  error?: string;
  fallbackTriggered?: boolean;
}

/**
 * Send Test Print directly to LAN / Wifi Printer
 */
export async function testLanPrinter(
  ip?: string,
  port?: number,
  customSettings?: Partial<InvoiceSettings>
): Promise<PrintResult> {
  const settings = getInvoiceSettings();
  const targetIp = ip || settings.printerIp || '192.168.1.133';
  const targetPort = port || settings.printerPort || 9100;

  try {
    const res = await fetch('/api/printer/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: targetIp,
        port: targetPort,
        settings: { ...settings, ...customSettings },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Lỗi khi gửi lệnh in kiểm tra');
    }

    return {
      success: true,
      message: data.message || `Đã gửi mẫu in kiểm tra tới ${targetIp}:${targetPort}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || `Không kết nối được máy in LAN (${targetIp}:${targetPort})`,
    };
  }
}

/**
 * Print order or warranty slip directly to LAN / Wifi Printer (ESC/POS)
 * With automatic Fallback to Web Print if connection fails.
 */
export async function printToLanPrinter(
  order: any,
  docType: 'invoice' | 'warranty' = 'invoice',
  options?: {
    customSettings?: Partial<InvoiceSettings>;
    fallbackToWebPrint?: boolean;
    onFallback?: (errorMsg: string) => void;
  }
): Promise<PrintResult> {
  const settings = getInvoiceSettings();
  const targetIp = options?.customSettings?.printerIp || settings.printerIp || '192.168.1.133';
  const targetPort = options?.customSettings?.printerPort || settings.printerPort || 9100;
  const shouldFallback = options?.fallbackToWebPrint !== false;

  try {
    const res = await fetch('/api/printer/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      message: data.message || `Đã in hóa đơn trực tiếp thành công tới máy in (${targetIp})!`,
    };
  } catch (err: any) {
    const errorMsg = `Không kết nối được máy in LAN (${targetIp}), chuyển sang in giao diện Web`;
    
    if (options?.onFallback) {
      options.onFallback(errorMsg);
    }

    if (shouldFallback && typeof window !== 'undefined') {
      // Automatic trigger web print
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error('Web print fallback error:', e);
        }
      }, 300);
    }

    return {
      success: false,
      error: errorMsg,
      fallbackTriggered: shouldFallback,
    };
  }
}
