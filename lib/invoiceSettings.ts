export interface InvoiceSettings {
  shopName: string;
  shopSlogan: string;
  shopAddress: string;
  shopHotline: string;
  shopLogoUrl: string;
  bankName: string;
  bankAccount: string;
  bankAccountHolder: string;
  warrantyPolicies: string[];
  footerNote: string;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  shopName: 'TD MOBILE STORE',
  shopSlogan: 'Chất lượng tạo niềm tin - Dịch vụ đỉnh cao',
  shopAddress: '06 Nguyễn Trãi, Phường Gò Công, Đồng Tháp',
  shopHotline: '0364848960',
  shopLogoUrl: '/logo.png',
  bankName: 'MB Bank (Ngân hàng Quân Đội)',
  bankAccount: '0364848960',
  bankAccountHolder: 'TRUONG MINH TAM',
  warrantyPolicies: [
    '1. Bảo hành toàn diện phần cứng, nguồn, màn hình & FaceID theo thời hạn cam kết.',
    '2. Bao test đổi mới 1-1 trong 30 ngày đầu tiên nếu máy phát sinh lỗi phần cứng từ NSX.',
    '3. Từ chối bảo hành đối với các trường hợp rơi vỡ, cấn móp, ngấm nước, tự ý tháo mở máy hoặc can thiệp phần mềm.',
    '4. Quý khách vui lòng xuất trình hóa đơn này hoặc cung cấp SĐT đã mua hàng khi cần hỗ trợ kỹ thuật / bảo hành.',
  ],
  footerNote: 'Xin chân thành cảm ơn Quý Khách đã tin tưởng và đồng hành cùng TD Mobile Store!',
};

const STORAGE_KEY = 'tdm_invoice_settings';

export function getInvoiceSettings(): InvoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_INVOICE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INVOICE_SETTINGS;
    return { ...DEFAULT_INVOICE_SETTINGS, ...JSON.parse(raw) };
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
