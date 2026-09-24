export interface InvoiceSettings {
  shopName: string;
  shopSlogan: string;
  shopAddress: string;
  shopHotline: string;
  warrantyHotline: string;
  footerNote: string;
  shopLogoUrl: string;
  paperSize: 'k80' | 'a4';
  showImei: boolean;
  showBatteryHealth: boolean;
  showWarrantyTerms: boolean;
  bankName: string;
  bankAccount: string;
  bankAccountHolder: string;
  warrantyPolicies: string[];

  // Print Mode & Server Settings (QZ Tray / Tunnel / Direct LAN)
  printerConnectionMode: 'qz-tray' | 'tunnel' | 'lan';

  // QZ Tray Settings (Print Server on MacBook M2 via USB)
  qzHost: string;
  qzPort: number;
  qzSecure: boolean;
  qzPrinterName: string;

  // Cloudflare Tunnel / LAN Socket Settings (Xprinter XP-A160H / XP-Q80BS)
  printerTunnelUrl: string;
  printerIp: string;
  printerPort: number;
  printerPaperSize: 'k80' | 'k57' | 'a4';
  printerAutoCut: boolean;
  printerOpenDrawer: boolean;
  directPrintEnabled: boolean;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  shopName: 'TD MOBILE STORE',
  shopSlogan: 'Chất lượng tạo niềm tin - Dịch vụ đỉnh cao',
  shopAddress: '06 Nguyễn Trãi, Phường Gò Công, Đồng Tháp',
  shopHotline: '0364848960',
  warrantyHotline: '0364848960',
  footerNote: 'Xin chân thành cảm ơn Quý Khách đã tin tưởng và đồng hành cùng TD Mobile Store!',
  shopLogoUrl: '/logo.png',
  paperSize: 'k80',
  showImei: true,
  showBatteryHealth: true,
  showWarrantyTerms: true,
  bankName: 'MB Bank (Ngân hàng Quân Đội)',
  bankAccount: '0364848960',
  bankAccountHolder: 'TRUONG MINH TAM',
  warrantyPolicies: [
    '1. Bảo hành toàn diện phần cứng, nguồn, màn hình & FaceID theo thời hạn cam kết.',
    '2. Bao test đổi mới 1-1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi phần cứng từ NSX.',
    '3. Từ chối bảo hành đối với các trường hợp rơi vỡ, cấn móp, ngấm nước, tự ý tháo mở máy hoặc can thiệp phần mềm.',
    '4. Quý khách vui lòng xuất trình hóa đơn này hoặc cung cấp SĐT đã mua hàng khi cần hỗ trợ kỹ thuật / bảo hành.',
  ],

  // QZ Tray Defaults (MacBook M2 USB Xprinter XP-A160H)
  printerConnectionMode: 'qz-tray',
  qzHost: 'localhost',
  qzPort: 8182,
  qzSecure: true,
  qzPrinterName: 'XP-A160H',

  // Fallback Tunnel & LAN Printer defaults
  printerTunnelUrl: 'https://cet-step-perfectly-joseph.trycloudflare.com',
  printerIp: '192.168.1.133',
  printerPort: 9100,
  printerPaperSize: 'k80',
  printerAutoCut: true,
  printerOpenDrawer: true,
  directPrintEnabled: true,
};

const STORAGE_KEY = 'tdm_invoice_settings';

export function getInvoiceSettings(): InvoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_INVOICE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INVOICE_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_INVOICE_SETTINGS,
      ...parsed,
      printerConnectionMode: parsed.printerConnectionMode || 'qz-tray',
      qzHost: parsed.qzHost || 'localhost',
      qzPort: parsed.qzPort || 8182,
      qzSecure: parsed.qzSecure !== undefined ? parsed.qzSecure : true,
      qzPrinterName: parsed.qzPrinterName || 'XP-A160H',
      printerTunnelUrl: parsed.printerTunnelUrl || DEFAULT_INVOICE_SETTINGS.printerTunnelUrl,
      printerIp: parsed.printerIp || '192.168.1.133',
      printerPort: parsed.printerPort || 9100,
    };
  } catch (err) {
    console.error('Error reading invoice settings:', err);
    return DEFAULT_INVOICE_SETTINGS;
  }
}

export function saveInvoiceSettings(settings: Partial<InvoiceSettings>): InvoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_INVOICE_SETTINGS;
  try {
    const current = getInvoiceSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving invoice settings:', err);
    return DEFAULT_INVOICE_SETTINGS;
  }
}
