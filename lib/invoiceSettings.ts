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
  showBankQR?: boolean;
  bankName: string;
  bankAccount: string;
  bankAccountHolder: string;
  warrantyPolicies: string[];

  // Print Mode & Server Settings (Single unified QZ Tray USB Host on MacBook)
  printerConnectionMode: 'qz-tray';

  // QZ Tray Settings (Print Server on MacBook via USB Xprinter USB Printer P)
  qzHost: string;
  qzPort: number;
  qzSecure: boolean;
  qzPrinterName: string;

  // ESC/POS Print Preferences
  printerPaperSize: 'k80' | 'k57' | 'a4';
  printerAutoCut: boolean;
  printerOpenDrawer: boolean;
  directPrintEnabled: boolean;

  // Legacy fallback optional fields
  printerTunnelUrl?: string;
  printerIp?: string;
  printerPort?: number;
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
  showBankQR: true,
  bankName: 'MB Bank (Ngân hàng Quân Đội)',
  bankAccount: '0364848960',
  bankAccountHolder: 'TRUONG MINH TAM',
  warrantyPolicies: [
    '1. Bảo hành toàn diện phần cứng, nguồn, màn hình & FaceID theo thời hạn cam kết.',
    '2. Bao test đổi mới 1-1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi phần cứng từ NSX.',
    '3. Từ chối bảo hành đối với các trường hợp rơi vỡ, cấn móp, ngấm nước, tự ý tháo mở máy hoặc can thiệp phần mềm.',
    '4. Quý khách vui lòng xuất trình hóa đơn này hoặc cung cấp SĐT đã mua hàng khi cần hỗ trợ kỹ thuật / bảo hành.',
  ],

  // QZ Tray Defaults (MacBook USB Xprinter USB Printer P - Port 8181 WS Direct Non-SSL)
  printerConnectionMode: 'qz-tray',
  qzHost: 'MacBook-Air-cua-Truong.local',
  qzPort: 8181,
  qzSecure: false,
  qzPrinterName: 'Xprinter USB Printer P',

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
    const hostname = window.location.hostname;
    const detectedHost = hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' ? hostname : 'MacBook-Air-cua-Truong.local';

    if (!raw) {
      return {
        ...DEFAULT_INVOICE_SETTINGS,
        qzHost: detectedHost,
      };
    }
    const parsed = JSON.parse(raw);
    const host = parsed.qzHost || detectedHost;
    
    return {
      ...DEFAULT_INVOICE_SETTINGS,
      ...parsed,
      printerConnectionMode: 'qz-tray',
      qzHost: host,
      qzPort: parsed.qzPort && parsed.qzPort !== 8182 ? parsed.qzPort : 8181,
      qzSecure: parsed.qzSecure !== undefined ? parsed.qzSecure : false,
      qzPrinterName: parsed.qzPrinterName && parsed.qzPrinterName !== 'XP-A160H' ? parsed.qzPrinterName : 'Xprinter USB Printer P',
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
    const updated: InvoiceSettings = {
      ...current,
      ...settings,
      printerConnectionMode: 'qz-tray',
      qzPort: settings.qzPort || current.qzPort || 8181,
      qzSecure: settings.qzSecure !== undefined ? settings.qzSecure : false,
      qzPrinterName: settings.qzPrinterName || current.qzPrinterName || 'Xprinter USB Printer P',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving invoice settings:', err);
    return DEFAULT_INVOICE_SETTINGS;
  }
}
