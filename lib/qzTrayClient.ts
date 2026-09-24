'use client';

/**
 * QZ Tray Client Bridge for TD Mobile Store
 * Enables direct silent printing to Xprinter XP-A160H connected via USB to MacBook M2
 */

export interface QzClientResult {
  success: boolean;
  message: string;
  printer?: string;
  error?: string;
}

let qzInstance: any = null;
let isConnected = false;

/**
 * Dynamically load qz-tray in browser
 */
async function getQz() {
  if (typeof window === 'undefined') return null;
  if (qzInstance) return qzInstance;

  try {
    const qzModule = await import('qz-tray');
    qzInstance = qzModule.default || qzModule;

    // Configure security overrides to allow seamless silent printing
    qzInstance.security.setCertificatePromise(() => {
      return (resolve: any) => {
        resolve(
          '-----BEGIN CERTIFICATE-----\n' +
          'MIIFAzCCAuugAwIBAgICEAIwDQYJKoZIhvcNAQEFBQAwgZgxCzAJBgNVBAYTAlVT\n' +
          'MQswCQYDVQQIDAJOWTEbMBkGA1UECgwSUVogSW5kdXN0cmllcywgTExDMRswGQYD\n' +
          'VQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMxGTAXBgNVBAMMEHF6aW5kdXN0cmllcy5j\n' +
          'b20xJzAlBgkqhkiG9w0BCQEWGHN1cHBvcnRAcXppbmR1c3RyaWVzLmNvbTAeFw0x\n' +
          'NTAzMTkwMjAxMzhaFw0yNTAzMTkwMjAxMzhaMIGYMQswCQYDVQQGEwJVUzELMAkG\n' +
          'A1UECAwCTlkxGzAZBgNVBAoMElFaIEluZHVzdHJpZXMsIExMQzEbMBkGA1UECwwS\n' +
          'UVogSW5kdXN0cmllcywgTExDMRkwFwYDVQQDDBBxemluZHVzdHJpZXMuY29tMScw\n' +
          'JQYJKoZIhvcNAQkBFhhzdXBwb3J0QHF6aW5kdXN0cmllcy5jb20wggEiMA0GCSqG\n' +
          'SIb3DQEBAQUAA4IBDwAwggEKAoIBAQCxWaivV4vM1fO2Wv9F0k76u9J0bY63J8Q0\n' +
          '-----END CERTIFICATE-----\n'
        );
      };
    });

    qzInstance.security.setSignatureAlgorithm('SHA512');
    qzInstance.security.setSignaturePromise(() => {
      return (resolve: any) => {
        resolve();
      };
    });

    return qzInstance;
  } catch (err) {
    console.warn('Failed to load qz-tray module, falling back to direct WebSocket API:', err);
    return null;
  }
}

/**
 * Connect to QZ Tray WebSocket
 */
export async function connectQzTray(host = 'localhost', port = 8182, secure = true): Promise<boolean> {
  const qz = await getQz();
  if (!qz) return false;

  try {
    if (qz.websocket.isActive()) {
      isConnected = true;
      return true;
    }

    await qz.websocket.connect({
      host,
      port: {
        secure: [8182, 8183],
        insecure: [8181, 8184],
      },
      usingSecure: secure,
      keepAlive: 60,
      retries: 2,
      delay: 1,
    });

    isConnected = true;
    return true;
  } catch (err: any) {
    console.warn('QZ Tray WebSocket connection notice:', err?.message || err);
    // Try fallback on insecure local port
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({
          host,
          usingSecure: false,
          port: { insecure: [8181, 8184] },
          retries: 1,
        });
        isConnected = true;
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }
}

/**
 * List all available printers recognized by QZ Tray
 */
export async function listQzPrinters(host = 'localhost'): Promise<string[]> {
  try {
    const qz = await getQz();
    if (!qz) throw new Error('Thư viện QZ Tray không tải được');

    if (!qz.websocket.isActive()) {
      await connectQzTray(host);
    }

    const printers = await qz.printers.find();
    return Array.isArray(printers) ? printers : [printers];
  } catch (err: any) {
    console.error('Error listing QZ printers:', err);
    return [];
  }
}

/**
 * Find matched Xprinter or specified printer
 */
export async function findQzPrinter(targetName = 'XP-A160H', host = 'localhost'): Promise<string> {
  const qz = await getQz();
  if (!qz) throw new Error('Thư viện QZ Tray không sẵn sàng');

  if (!qz.websocket.isActive()) {
    await connectQzTray(host);
  }

  try {
    // 1. Try finding exact/partial target name
    const found = await qz.printers.find(targetName);
    if (found) return typeof found === 'string' ? found : found[0];
  } catch (e) {
    // If exact name find fails, search list
  }

  // 2. Search list for Xprinter or fallback
  const allPrinters = await qz.printers.find();
  const list = Array.isArray(allPrinters) ? allPrinters : [allPrinters];

  if (list.length === 0) {
    throw new Error('Không tìm thấy máy in nào trên MacBook qua QZ Tray.');
  }

  const clean = targetName.toLowerCase().trim();
  const match =
    list.find((p: string) => p.toLowerCase().includes(clean)) ||
    list.find(
      (p: string) =>
        p.toLowerCase().includes('xp-a160h') ||
        p.toLowerCase().includes('xprinter') ||
        p.toLowerCase().includes('xp-q80bs') ||
        p.toLowerCase().includes('pos') ||
        p.toLowerCase().includes('receipt')
    ) ||
    list[0];

  return match;
}

/**
 * Print RAW ESC/POS Base64 buffer silently via QZ Tray
 */
export async function printQzRaw(
  base64Data: string,
  printerName = 'XP-A160H',
  host = 'localhost'
): Promise<QzClientResult> {
  try {
    const qz = await getQz();
    if (!qz) throw new Error('Thư viện QZ Tray không thể tải.');

    if (!qz.websocket.isActive()) {
      const ok = await connectQzTray(host);
      if (!ok) {
        throw new Error('Không thể kết nối QZ Tray Print Server trên MacBook M2 (Cổng 8182/8181).');
      }
    }

    const matchedPrinter = await findQzPrinter(printerName, host);
    const config = qz.configs.create(matchedPrinter, {
      encoding: 'UTF-8',
      altPrinting: false,
    });

    const data = [
      {
        type: 'raw',
        format: 'base64',
        data: base64Data,
      },
    ];

    await qz.print(config, data);

    return {
      success: true,
      message: `🟢 Đã in hóa đơn thành công qua QZ Tray (${matchedPrinter})`,
      printer: matchedPrinter,
    };
  } catch (err: any) {
    console.error('Client QZ Tray print error:', err);
    return {
      success: false,
      message: `🔴 Lỗi in QZ Tray: ${err.message || err}`,
      error: err.message || String(err),
    };
  }
}

/**
 * Ping QZ Tray status on client
 */
export async function pingQzClient(host = 'localhost'): Promise<{ online: boolean; message: string; printers: string[] }> {
  try {
    const qz = await getQz();
    if (!qz) {
      return { online: false, message: 'Chưa nạp được thư viện QZ Tray', printers: [] };
    }

    const connected = await connectQzTray(host);
    if (!connected) {
      return {
        online: false,
        message: '🔴 Không kết nối được QZ Tray. Hãy khởi chạy ứng dụng QZ Tray trên MacBook M2.',
        printers: [],
      };
    }

    const printers = await listQzPrinters(host);
    const xprinter = printers.find(
      (p) => p.toLowerCase().includes('xp-a160h') || p.toLowerCase().includes('xprinter')
    );

    return {
      online: true,
      message: xprinter
        ? `🟢 QZ Tray sẵn sàng! Nhận diện máy in: ${xprinter}`
        : `🟢 QZ Tray đã kết nối (${printers.length} máy in)`,
      printers,
    };
  } catch (err: any) {
    return {
      online: false,
      message: `🔴 Lỗi kết nối QZ Tray: ${err.message || err}`,
      printers: [],
    };
  }
}
