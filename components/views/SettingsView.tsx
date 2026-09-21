'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Printer,
  Check,
  Save,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  FileText,
  Sliders,
  Phone,
  MapPin,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';
import {
  THEME_OPTIONS,
  ThemeId,
  getSavedTheme,
  applyTheme
} from '@/lib/themeHelper';
import {
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
  getInvoiceSettings,
  saveInvoiceSettings
} from '@/lib/invoiceSettings';
import PrinterConfigCard from '@/components/PrinterConfigCard';

interface SettingsViewProps {
  user: any;
}

export default function SettingsView({ user }: SettingsViewProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('navy');
  const [invoiceForm, setInvoiceForm] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('/logo.png');

  useEffect(() => {
    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);

    const inv = getInvoiceSettings();
    setInvoiceForm(inv);
    setLogoPreview(inv.shopLogoUrl || '/logo.png');
  }, []);

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
    showNotice(`Đã chuyển đổi sang giao diện "${THEME_OPTIONS.find((t) => t.id === themeId)?.name}"!`);
  };

  const showNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh logo nhỏ hơn 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setInvoiceForm((prev) => ({ ...prev, shopLogoUrl: dataUrl }));
      setLogoPreview(dataUrl);
      showNotice('Đã tải ảnh Logo lên thành công!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveInvoiceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveInvoiceSettings(invoiceForm);
    setInvoiceForm(updated);
    showNotice('Đã lưu cấu hình mẫu in hóa đơn thành công!');
  };

  const handleResetDefaults = () => {
    if (confirm('Khôi phục mẫu in hóa đơn về thiết lập mặc định của TD Mobile Store?')) {
      const reset = saveInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
      setInvoiceForm(reset);
      setLogoPreview(reset.shopLogoUrl || '/logo.png');
      showNotice('Đã khôi phục mẫu in về mặc định!');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Toast Notification */}
      {savedNotice && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl font-black text-xs shadow-glow-emerald flex items-center space-x-2 animate-in slide-in-from-top border border-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Cài Đặt Hệ Thống & Giao Diện
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tùy biến bộ màu sắc chủ đạo hệ thống và cấu hình mẫu in hóa đơn chuẩn chuyên nghiệp.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* SECTION 1: THEME SWITCHER (6 MODERN / PASTEL TONES) */}
      {/* ======================================================= */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wide">
              1. Bộ Chọn Màu Sắc Hệ Thống (Theme Switcher - 6 Tông Màu Modern / Pastel)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Tự động áp dụng tức thì cho Menu, Nút bấm & Viền Card
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-850/90 border-cyan-500/70 shadow-lg scale-[1.02] ring-2 ring-cyan-500/30'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {/* Header of theme card */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-4 h-4 rounded-full shadow-md flex-shrink-0"
                      style={{ backgroundColor: theme.dotColor }}
                    />
                    <span className="font-black text-sm text-white">
                      {theme.name}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500 text-slate-950 flex items-center space-x-1 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Đang Dùng</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition">
                      Áp dụng
                    </span>
                  )}
                </div>

                {/* Live color swatch bar */}
                <div className={`h-3 w-full rounded-full bg-gradient-to-r ${theme.previewGradient} shadow-inner mb-2.5`} />

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {theme.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================= */}
      {/* SECTION 2: RECEIPT PRINT TEMPLATE FORM (MẪU IN HÓA ĐƠN) */}
      {/* ======================================================= */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wide">
              2. Cài Đặt Mẫu In Hóa Đơn & Phiếu Bảo Hành (Receipt Template)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Tự động cập nhật khi xuất hóa đơn POS & in bill khách hàng
          </span>
        </div>

        <form onSubmit={handleSaveInvoiceSettings} className="space-y-4">
          
          {/* Shop Name & Slogan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tên Cửa Hàng / Thương Hiệu *
              </label>
              <input
                type="text"
                value={invoiceForm.shopName}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, shopName: e.target.value })}
                placeholder="VD: TD MOBILE STORE"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Khẩu hiệu / Slogan cửa hàng
              </label>
              <input
                type="text"
                value={invoiceForm.shopSlogan}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, shopSlogan: e.target.value })}
                placeholder="VD: Chất lượng tạo niềm tin - Dịch vụ đỉnh cao"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Address & Hotlines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                SĐT Bán Hàng / Hotline *
              </label>
              <input
                type="text"
                value={invoiceForm.shopHotline}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, shopHotline: e.target.value })}
                placeholder="VD: 0364848960"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold font-sans text-cyan-300 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Hotline Tiếp Nhận Bảo Hành *
              </label>
              <input
                type="text"
                value={invoiceForm.warrantyHotline}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, warrantyHotline: e.target.value })}
                placeholder="VD: 0364848960"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold font-sans text-emerald-300 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Địa Chỉ Cửa Hàng *
              </label>
              <input
                type="text"
                value={invoiceForm.shopAddress}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, shopAddress: e.target.value })}
                placeholder="VD: 06 Nguyễn Trãi, TP. Cao Lãnh, Đồng Tháp"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Logo Upload & Preview */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5">
            <label className="block text-xs font-bold text-slate-300">
              Logo Cửa Hàng (In Trên Đầu Hóa Đơn)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-2 border border-slate-700 overflow-hidden shadow-md flex-shrink-0">
                <img
                  src={logoPreview || '/logo.png'}
                  alt="Logo Preview"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center space-x-2">
                  <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition flex items-center space-x-1.5 shadow-sm">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Tải Ảnh Logo Từ Thiết Bị</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500">
                    PNG, JPG hoặc SVG (Tối đa 2MB)
                  </span>
                </div>

                <input
                  type="text"
                  value={invoiceForm.shopLogoUrl}
                  onChange={(e) => {
                    setInvoiceForm({ ...invoiceForm, shopLogoUrl: e.target.value });
                    setLogoPreview(e.target.value);
                  }}
                  placeholder="Hoặc nhập đường dẫn URL ảnh Logo (VD: /logo.png)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Paper Size & Display Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            
            {/* Paper Size Selection */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200">
                Khổ Giấy In Mặc Định:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setInvoiceForm({ ...invoiceForm, paperSize: 'k80' })}
                  className={`p-3 rounded-xl border text-center transition ${
                    invoiceForm.paperSize === 'k80'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-black shadow-glow-cyan'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="text-sm">🧾 Bill K80 (80mm)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Máy in nhiệt quầy thu ngân</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceForm({ ...invoiceForm, paperSize: 'a4' })}
                  className={`p-3 rounded-xl border text-center transition ${
                    invoiceForm.paperSize === 'a4'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-black shadow-glow-cyan'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <div className="text-sm">📄 Khổ A5 / A4</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Máy in laser văn phòng</div>
                </button>
              </div>
            </div>

            {/* Display Field Toggles */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
              <label className="block text-xs font-bold text-slate-200">
                Tùy Chọn Bật / Tắt Hiển Thị Chi Tiết:
              </label>
              
              <div className="space-y-2.5">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={invoiceForm.showImei}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, showImei: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span className="text-slate-200 font-semibold">
                    Hiển thị <b>Mã IMEI / Số Serial</b> trên hóa đơn
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={invoiceForm.showBatteryHealth}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, showBatteryHealth: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span className="text-slate-200 font-semibold">
                    Hiển thị <b>% Dung Lượng Pin</b> (Battery Health)
                  </span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={invoiceForm.showWarrantyTerms}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, showWarrantyTerms: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span className="text-slate-200 font-semibold">
                    Hiển thị <b>Điều Khoản & Chính Sách Bảo Hành</b>
                  </span>
                </label>
              </div>
            </div>

          </div>

          {/* Footer Thank You Note */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Dòng Chữ Cảm Ơn Chân Trang (Footer)
            </label>
            <input
              type="text"
              value={invoiceForm.footerNote}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, footerNote: e.target.value })}
              placeholder="VD: Xin chân thành cảm ơn Quý Khách đã tin tưởng và đồng hành cùng TD Mobile Store!"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi Phục Mặc Định</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Mẫu In</span>
            </button>
          </div>

        </form>
      </div>

      {/* ======================================================= */}
      {/* SECTION 3: LAN IP PRINTER MANAGER (XPRINTER XP-Q80BS) */}
      {/* ======================================================= */}
      <div className="space-y-4">
        <PrinterConfigCard user={user} />
      </div>

    </div>
  );
}
