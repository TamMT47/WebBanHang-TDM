import WebSocket from 'ws';

export interface QzPrintOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  printerName?: string;
  timeoutMs?: number;
}

export interface QzBridgeResult {
  success: boolean;
  message: string;
  printer?: string;
  error?: string;
  availablePrinters?: string[];
}

/**
 * Server-Side WebSocket Bridge to QZ Tray running on MacBook Host
 * Directly communicates with QZ Tray daemon (ws://host:8181 / wss://host:8182)
 */
export class QzTrayServerBridge {
  private host: string;
  private port: number;
  private secure: boolean;
  private timeoutMs: number;

  constructor(options?: QzPrintOptions) {
    this.host = (options?.host || '127.0.0.1').trim();
    if (this.host === 'localhost') this.host = '127.0.0.1';
    this.port = options?.port || (options?.secure ? 8182 : 8181);
    this.secure = options?.secure ?? (this.port === 8182 || this.port === 8183);
    this.timeoutMs = options?.timeoutMs || 5000;
  }

  /**
   * Connect to QZ Tray WebSocket with fallbacks (ws on 8181, wss on 8182)
   */
  private connectSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const endpoints: { url: string; secure: boolean }[] = [];

      // Add preferred endpoint first
      const protocol = this.secure ? 'wss' : 'ws';
      endpoints.push({ url: `${protocol}://${this.host}:${this.port}`, secure: this.secure });

      // Add fallback endpoints
      if (this.secure) {
        endpoints.push({ url: `ws://${this.host}:8181`, secure: false });
        endpoints.push({ url: `wss://${this.host}:8183`, secure: true });
      } else {
        endpoints.push({ url: `wss://${this.host}:8182`, secure: true });
        endpoints.push({ url: `ws://${this.host}:8184`, secure: false });
      }

      let attemptIdx = 0;

      const tryNext = () => {
        if (attemptIdx >= endpoints.length) {
          return reject(
            new Error(
              `Không thể kết nối QZ Tray tại ${this.host}:${this.port}. Hãy đảm bảo ứng dụng QZ Tray đang chạy trên MacBook Host.`
            )
          );
        }

        const endpoint = endpoints[attemptIdx++];
        let socket: WebSocket;

        try {
          socket = new WebSocket(endpoint.url, {
            rejectUnauthorized: false,
            handshakeTimeout: 2500,
          });
        } catch (e: any) {
          return tryNext();
        }

        const timer = setTimeout(() => {
          try {
            socket.terminate();
          } catch (e) {}
          tryNext();
        }, 2500);

        socket.on('open', () => {
          clearTimeout(timer);
          resolve(socket);
        });

        socket.on('error', () => {
          clearTimeout(timer);
          try {
            socket.terminate();
          } catch (e) {}
          tryNext();
        });
      };

      tryNext();
    });
  }

  /**
   * Send JSON RPC call to QZ Tray over open WebSocket
   */
  private callRpc(ws: WebSocket, method: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const callUid = Math.random().toString(36).substring(2, 9);
      const payload = {
        call: method,
        params,
        timestamp: Date.now(),
        uid: callUid,
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout (${this.timeoutMs}ms) khi gọi lệnh QZ Tray: ${method}`));
      }, this.timeoutMs);

      const messageHandler = (data: any) => {
        try {
          const str = data.toString();
          const parsed = JSON.parse(str);

          // Check if response matches this call or returns result
          if (parsed.call === method || parsed.uid === callUid || parsed.result !== undefined || parsed.error !== undefined) {
            cleanup();
            if (parsed.error) {
              reject(new Error(parsed.error?.message || parsed.error || `Lỗi từ QZ Tray khi thực hiện ${method}`));
            } else {
              resolve(parsed.result ?? parsed);
            }
          }
        } catch (e) {
          // continue listening
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        ws.removeListener('message', messageHandler);
      };

      ws.on('message', messageHandler);
      ws.send(JSON.stringify(payload), (err) => {
        if (err) {
          cleanup();
          reject(err);
        }
      });
    });
  }

  /**
   * List all available printers recognized by QZ Tray on MacBook Host
   */
  public async listPrinters(): Promise<string[]> {
    let ws: WebSocket | null = null;
    try {
      ws = await this.connectSocket();
      
      // Try finding specific Xprinter/USB first
      try {
        const foundXp = await this.callRpc(ws, 'printers.find', ['Xprinter']);
        if (Array.isArray(foundXp) && foundXp.length > 0) return foundXp;
        if (typeof foundXp === 'string') return [foundXp];
      } catch (e) {}

      try {
        const foundUsb = await this.callRpc(ws, 'printers.find', ['USB']);
        if (Array.isArray(foundUsb) && foundUsb.length > 0) return foundUsb;
        if (typeof foundUsb === 'string') return [foundUsb];
      } catch (e) {}

      const result = await this.callRpc(ws, 'printers.find', []);
      if (Array.isArray(result)) return result;
      if (typeof result === 'string') return [result];
      return [];
    } catch (err) {
      console.error('QzTrayServerBridge listPrinters error:', err);
      throw err;
    } finally {
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
    }
  }

  /**
   * Find specific printer (e.g. "Xprinter USB Printer P", Xprinter, or default)
   */
  public async findPrinter(targetQuery = 'Xprinter USB Printer P'): Promise<string> {
    const list = await this.listPrinters();
    if (list.length === 0) {
      throw new Error('QZ Tray không tìm thấy máy in nào được cài đặt trên MacBook.');
    }

    const cleanQuery = targetQuery.toLowerCase().trim();

    // 1. Exact or Substring match
    const match = list.find((p) => p.toLowerCase().includes(cleanQuery));
    if (match) return match;

    // 2. Exact "Xprinter USB Printer P"
    const exactXp = list.find((p) => p.toLowerCase().includes('xprinter usb printer p'));
    if (exactXp) return exactXp;

    // 3. Generic Xprinter match
    const xprinterMatch = list.find(
      (p) =>
        p.toLowerCase().includes('xprinter') ||
        p.toLowerCase().includes('xp-') ||
        p.toLowerCase().includes('usb') ||
        p.toLowerCase().includes('pos') ||
        p.toLowerCase().includes('receipt') ||
        p.toLowerCase().includes('thermal') ||
        p.toLowerCase().includes('80')
    );
    if (xprinterMatch) return xprinterMatch;

    // 4. Fallback to first available printer
    return list[0];
  }

  /**
   * Send Raw ESC/POS Base64 Data to Printer via QZ Tray
   */
  public async printRaw(
    base64Data: string,
    targetPrinter = 'Xprinter USB Printer P'
  ): Promise<QzBridgeResult> {
    let ws: WebSocket | null = null;
    try {
      ws = await this.connectSocket();

      // 1. Find Printer
      let chosenPrinter = targetPrinter;
      try {
        const listResult = await this.callRpc(ws, 'printers.find', []);
        const list: string[] = Array.isArray(listResult)
          ? listResult
          : typeof listResult === 'string'
          ? [listResult]
          : [];

        if (list.length > 0) {
          const match =
            list.find((p) => p.toLowerCase() === targetPrinter.toLowerCase()) ||
            list.find((p) => p.toLowerCase().includes(targetPrinter.toLowerCase())) ||
            list.find((p) => p.toLowerCase().includes('xprinter usb printer p')) ||
            list.find(
              (p) =>
                p.toLowerCase().includes('xprinter') ||
                p.toLowerCase().includes('xp-') ||
                p.toLowerCase().includes('usb') ||
                p.toLowerCase().includes('pos')
            ) ||
            list[0];
          chosenPrinter = match;
        }
      } catch (findErr) {
        console.warn('Could not list printers before print, using target name:', targetPrinter);
      }

      // 2. Send Print Job
      const printConfig = {
        printer: chosenPrinter,
        options: {
          encoding: 'UTF-8',
          altPrinting: false,
          raw: true,
        },
        data: [
          {
            type: 'raw',
            format: 'base64',
            data: base64Data,
          },
        ],
      };

      await this.callRpc(ws, 'print', [printConfig]);

      return {
        success: true,
        message: `🟢 Đã in hóa đơn thành công qua QZ Tray (Máy in: ${chosenPrinter})`,
        printer: chosenPrinter,
      };
    } catch (err: any) {
      console.error('QzTrayServerBridge printRaw error:', err);
      return {
        success: false,
        message: `🔴 Lỗi in QZ Tray: ${err.message || 'Không thể gửi lệnh in'}`,
        error: err.message,
      };
    } finally {
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
    }
  }

  /**
   * Ping / Check QZ Tray Status
   */
  public async ping(): Promise<{ online: boolean; message: string; printers?: string[]; latencyMs?: number }> {
    const start = Date.now();
    try {
      const printers = await this.listPrinters();
      const latencyMs = Date.now() - start;
      const xprinter = printers.find(
        (p) =>
          p.toLowerCase().includes('xprinter usb printer p') ||
          p.toLowerCase().includes('xprinter') ||
          p.toLowerCase().includes('usb')
      );

      return {
        online: true,
        message: xprinter
          ? `🟢 QZ Tray sẵn sàng trên MacBook Host (Đã nhận diện: ${xprinter})`
          : `🟢 QZ Tray sẵn sàng trên MacBook Host (${printers.length} máy in)`,
        printers,
        latencyMs,
      };
    } catch (err: any) {
      return {
        online: false,
        message: `🔴 Chưa kết nối được QZ Tray: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }
}
