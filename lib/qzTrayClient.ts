'use client';

/**
 * QZ Tray Client Bridge for TD Mobile Store
 * Enables direct silent printing to Xprinter USB Printer P connected via USB to MacBook Host
 * Default: Port 8181 (ws:// non-SSL) with automatic fallback to Port 8182 (wss://)
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
 * Direct WebSocket probe from browser within timeoutMs (default: 2000ms)
 * Tests ws://<host>:8181 and falls back to wss://<host>:8182
 */
export function probeWebSocket(host: string, port = 8181, timeoutMs = 2000): Promise<{ ok: boolean; protocol: string; url: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('WebSocket' in window)) {
      return resolve({ ok: false, protocol: 'ws', url: `ws://${host}:${port}` });
    }

    const cleanHost = host.trim() || 'MacBook-Air-cua-Truong.local';
    const isSsl = port === 8182 || port === 8183;
    const protocol = isSsl ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${cleanHost}:${port}`;

    let socket: WebSocket;
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          socket.close();
        } catch (e) {}
        resolve({ ok: false, protocol, url: wsUrl });
      }
    }, timeoutMs);

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          try {
            socket.close();
          } catch (e) {}
          resolve({ ok: true, protocol, url: wsUrl });
        }
      };

      socket.onerror = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          try {
            socket.close();
          } catch (e) {}
          resolve({ ok: false, protocol, url: wsUrl });
        }
      };
    } catch (err) {
      clearTimeout(timer);
      resolve({ ok: false, protocol, url: wsUrl });
    }
  });
}

/**
 * Connect to QZ Tray WebSocket
 * Priority 1: Direct Non-SSL Port 8181 (ws://)
 * Priority 2: SSL Port 8182 (wss://)
 */
export async function connectQzTray(host = 'MacBook-Air-cua-Truong.local', port = 8181, secure = false): Promise<boolean> {
  const qz = await getQz();
  if (!qz) return false;

  const cleanHost = host.trim() || 'MacBook-Air-cua-Truong.local';

  try {
    if (qz.websocket.isActive()) {
      isConnected = true;
      return true;
    }

    // 1. Primary: ws:// on port 8181 (or custom port)
    await qz.websocket.connect({
      host: cleanHost,
      port: {
        insecure: [port, 8181, 8184],
        secure: [8182, 8183],
      },
      usingSecure: secure,
      keepAlive: 60,
      retries: 1,
      delay: 0.5,
    });

    isConnected = true;
    return true;
  } catch (err: any) {
    console.warn('QZ Tray direct ws connect failed, trying fallback:', err?.message || err);
    
    // 2. Fallback: try inverted secure setting
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({
          host: cleanHost,
          usingSecure: !secure,
          port: {
            insecure: [8181, 8184],
            secure: [8182, 8183],
          },
          retries: 1,
          delay: 0.5,
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
export async function listQzPrinters(host = 'MacBook-Air-cua-Truong.local', port = 8181, secure = false): Promise<string[]> {
  try {
    const qz = await getQz();
    if (!qz) throw new Error('Thư viện QZ Tray không tải được');

    if (!qz.websocket.isActive()) {
      await connectQzTray(host, port, secure);
    }

    // Call find with Xprinter/USB filter first, or list all
    try {
      const specific = await qz.printers.find('Xprinter');
      if (specific) {
        const arr = Array.isArray(specific) ? specific : [specific];
        if (arr.length > 0) return arr;
      }
    } catch (e) {}

    try {
      const usbFound = await qz.printers.find('USB');
      if (usbFound) {
        const arr = Array.isArray(usbFound) ? usbFound : [usbFound];
        if (arr.length > 0) return arr;
      }
    } catch (e) {}

    const printers = await qz.printers.find();
    return Array.isArray(printers) ? printers : [printers];
  } catch (err: any) {
    console.error('Error listing QZ printers:', err);
    return [];
  }
}

/**
 * Find matched Xprinter or specified printer (e.g. "Xprinter USB Printer P")
 */
export async function findQzPrinter(
  targetName = 'Xprinter USB Printer P',
  host = 'MacBook-Air-cua-Truong.local',
  port = 8181,
  secure = false
): Promise<string> {
  const qz = await getQz();
  if (!qz) throw new Error('Thư viện QZ Tray không sẵn sàng');

  if (!qz.websocket.isActive()) {
    await connectQzTray(host, port, secure);
  }

  try {
    // 1. Try finding exact target name (e.g. "Xprinter USB Printer P")
    const found = await qz.printers.find(targetName);
    if (found) return typeof found === 'string' ? found : found[0];
  } catch (e) {
    // If exact name find fails, try finding "Xprinter" or "USB"
  }

  try {
    const foundXp = await qz.printers.find('Xprinter');
    if (foundXp) return typeof foundXp === 'string' ? foundXp : foundXp[0];
  } catch (e) {}

  try {
    const foundUsb = await qz.printers.find('USB');
    if (foundUsb) return typeof foundUsb === 'string' ? foundUsb : foundUsb[0];
  } catch (e) {}

  // 2. Search list for Xprinter or fallback
  const allPrinters = await qz.printers.find();
  const list = Array.isArray(allPrinters) ? allPrinters : [allPrinters];

  if (list.length === 0) {
    throw new Error('Không tìm thấy máy in nào trên MacBook qua QZ Tray.');
  }

  const clean = targetName.toLowerCase().trim();
  const match =
    list.find((p: string) => p.toLowerCase().includes(clean)) ||
    list.find((p: string) => p.toLowerCase().includes('xprinter usb printer p')) ||
    list.find(
      (p: string) =>
        p.toLowerCase().includes('xprinter') ||
        p.toLowerCase().includes('xp-') ||
        p.toLowerCase().includes('usb') ||
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
  printerName = 'Xprinter USB Printer P',
  host = 'MacBook-Air-cua-Truong.local',
  port = 8181,
  secure = false
): Promise<QzClientResult> {
  try {
    const qz = await getQz();
    if (!qz) throw new Error('Thư viện QZ Tray không thể tải.');

    if (!qz.websocket.isActive()) {
      const ok = await connectQzTray(host, port, secure);
      if (!ok) {
        throw new Error(`Không thể kết nối QZ Tray Print Server trên MacBook Host (${host}:${port}).`);
      }
    }

    const matchedPrinter = await findQzPrinter(printerName, host, port, secure);
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
 * Ping QZ Tray status on client (checks both direct WebSocket probe and QZ Tray API)
 */
export async function pingQzClient(
  host = 'MacBook-Air-cua-Truong.local',
  port = 8181,
  secure = false
): Promise<{ online: boolean; message: string; printers: string[]; activeUrl?: string }> {
  try {
    const cleanHost = host.trim() || 'MacBook-Air-cua-Truong.local';

    // 1. Quick probe WebSocket on port 8181 (and 8182 fallback)
    const probe = await probeWebSocket(cleanHost, port, 1500);
    let activePort = port;
    let activeSecure = secure;

    if (!probe.ok && port === 8181) {
      // try probing 8182
      const probeSsl = await probeWebSocket(cleanHost, 8182, 1500);
      if (probeSsl.ok) {
        activePort = 8182;
        activeSecure = true;
      }
    }

    const qz = await getQz();
    if (!qz) {
      return { online: false, message: 'Chưa nạp được thư viện QZ Tray', printers: [] };
    }

    const connected = await connectQzTray(cleanHost, activePort, activeSecure);
    if (!connected) {
      return {
        online: false,
        message: `🔴 Không kết nối được QZ Tray tại ${cleanHost}:${activePort}. Hãy kiểm tra QZ Tray đang chạy trên MacBook.`,
        printers: [],
      };
    }

    const printers = await listQzPrinters(cleanHost, activePort, activeSecure);
    const xprinter = printers.find(
      (p) =>
        p.toLowerCase().includes('xprinter usb printer p') ||
        p.toLowerCase().includes('xprinter') ||
        p.toLowerCase().includes('usb')
    );

    return {
      online: true,
      message: xprinter
        ? `🟢 QZ Tray sẵn sàng tại ${cleanHost}:${activePort} (Máy in: ${xprinter})`
        : `🟢 QZ Tray đã kết nối tại ${cleanHost}:${activePort} (${printers.length} máy in)`,
      printers,
      activeUrl: `${activeSecure ? 'wss' : 'ws'}://${cleanHost}:${activePort}`,
    };
  } catch (err: any) {
    return {
      online: false,
      message: `🔴 Lỗi kết nối QZ Tray: ${err.message || err}`,
      printers: [],
    };
  }
}
