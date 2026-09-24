'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  PlayCircle,
  Sparkles,
  Sliders,
  Scissors,
  DollarSign,
  QrCode,
  Image as ImageIcon,
  ShieldCheck,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import {
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
  getInvoiceSettings,
  saveInvoiceSettings
} from '@/lib/invoiceSettings';
import InvoiceModal from '@/components/InvoiceModal';

interface PrinterConfigCardProps {
  user?: any;
  onSaved?: (settings: InvoiceSettings) => void;
  className?: string;
  isCompact?: boolean;
}

export default function PrinterConfigCard({
  user,
  onSaved,
  className = '',
  isCompact = false,
}: PrinterConfigCardProps) {
  const [form, setForm] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTestInvoiceOpen, setIsTestInvoiceOpen] = useState(false);

  useEffect(() => {
    const current = getInvoiceSettings();
    setForm(current);
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = saveInvoiceSettings(form);
    setForm(updated);

    setSaveNotice({
      type: 'success',
      message: '🟢 Đã lưu cấu hình mẫu in hóa đơn K80 thành công!',
    });

    // Sync settings to DB if admin/owner
    if (user && ['admin', 'owner'].includes(user.role)) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'invoice_settings',
            value: JSON.stringify(updated),
            description: 'Cấu hình mẫu hóa đơn K80 & thông tin cửa hàng',
          }),
        });
      } catch (err) {
        console.error('Error syncing invoice settings to DB:', err);
      }
    }

    setTimeout(() => setSaveNotice(null), 4000);

    if (onSaved) {
      onSaved(updated);
    }
  };

  const handleReset = () => {
    if (confirm('Khôi phục cấu hình mẫu hóa đơn về thiết lập mặc định của TD Mobile Store?')) {
      const reset = saveInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
      setForm(reset);
      setSaveNotice({
        type: 'success',
        message: 'Đã khôi phục thiết lập mẫu in về mặc định!',
      });
      setTimeout(() => setSaveNotice(null), 3000);
    }
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
      setForm((prev) => ({ ...prev, shopLogoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Sample mock order for test print
  const sampleTestOrder = {
    code: 'HD-TEST-K80',
    created_at: new Date().toISOString(),
    partner_name: 'Nguyễn Văn A (Khách Mẫu)',
    partner_phone: '0988.888.888',
    partner_address: 'Quận 1, TP. Hồ Chí Minh',
    creator_name: user?.full_name || 'Admin Cửa Hàng',
    total_amount: 18500000,
    discount: 500000,
    trade_in_value: 0,
    final_payment: 18000000,
    paid_amount: 18000000,
    debt_added: 0,
    payment_method: 'Chuyển khoản VietQR',
    items: [
      {
        product_name: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
        imei: '358942119842103',
        price: 18500000,
        warranty_months: 12,
        battery_health: 100,
        storage: '256GB',
        color: 'Titan Tự Nhiên',
        condition: 'Like New 99%',
      },
    ],
  };

  return (
    <div className={`bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      
      {/* Save Notice Banner */}
      {saveNotice && (
        <div
          className={`px-4 sm:px-5 py-3 font-bold text-xs flex items-center space-x-2.5 animate-in slide-in-from-top border-b shadow-lg ${
            saveNotice.type === 'success'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-glow-emerald'
              : 'bg-rose-600 text-white border-rose-500 shadow-lg'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-slate-950 flex-shrink-0" />
          <span className="font-black text-sm">{saveNotice.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan flex-shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                Cấu Hình Mẫu In & Máy In Hóa Đơn (Browser Native Print)
              </h3>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black rounded-lg badge-nowrap">
                Khổ 80mm
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống in hóa đơn chuẩn KiotViet, tự động mở hộp thoại in trình duyệt trên máy tính MacBook & PC.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Test Print Button */}
          <button
            type="button"
            onClick={() => setIsTestInvoiceOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-glow-emerald transition flex items-center space-x-1.5 active:scale-95"
          >
            <PlayCircle className="w-4 h-4 text-white" />
            <span>[In Thử Nghiệm K80]</span>
          </button>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6">
        
        {/* Section 1: Shop Brand & Contact */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              1. Thông Tin Thương Hiệu & Cửa Hàng
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tên Cửa Hàng (In đậm đầu bill) *
              </label>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                placeholder="TD MOBILE STORE"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-black text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Slogan / Khẩu Hiệu
              </label>
              <input
                type="text"
                value={form.shopSlogan}
                onChange={(e) => setForm({ ...form, shopSlogan: e.target.value })}
                placeholder="Trao chất lượng - Trọn niềm tin"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Hotline Bán Hàng / Zalo *
              </label>
              <input
                type="text"
                value={form.shopHotline}
                onChange={(e) => setForm({ ...form, shopHotline: e.target.value })}
                placeholder="09xx.xxx.xxx"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Hotline Kỹ Thuật & Bảo Hành
              </label>
              <input
                type="text"
                value={form.warrantyHotline}
                onChange={(e) => setForm({ ...form, warrantyHotline: e.target.value })}
                placeholder="09xx.xxx.xxx"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Địa Chỉ Cửa Hàng (Hiển thị trên bill) *
              </label>
              <input
                type="text"
                value={form.shopAddress}
                onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
                placeholder="Địa chỉ cửa hàng..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.shopLogoUrl ? (
                  <img src={form.shopLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-white">Logo Hóa Đơn</div>
                <div className="text-[10px] text-slate-400">Hình ảnh logo in ở đầu hóa đơn (tùy chọn)</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition">
                <span>Tải Ảnh Lên</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {form.shopLogoUrl && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, shopLogoUrl: '' })}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition"
                >
                  Xóa Logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Banking & VietQR */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              2. Tài Khoản Ngân Hàng & Mã VietQR Tự Động
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tên Ngân Hàng
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="MBBank, Vietcombank..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Số Tài Khoản (Tạo mã VietQR) *
              </label>
              <input
                type="text"
                value={form.bankAccount}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value.trim() })}
                placeholder="0364848960"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Chủ Tài Khoản (Viết hoa không dấu) *
              </label>
              <input
                type="text"
                value={form.bankAccountHolder}
                onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value.toUpperCase() })}
                placeholder="TRUONG MINH TAM"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Paper Size & Options */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              3. Tùy Chọn Hiển Thị & Khổ Giấy Mặc Định
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200">Khổ Giấy Mặc Định:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paperSize: 'k80', printerPaperSize: 'k80' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    form.paperSize === 'k80'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-cyan'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Bill K80 (80mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paperSize: 'a4', printerPaperSize: 'a4' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    form.paperSize === 'a4'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-glow-cyan'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Khổ A4 / A5</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-200">Tùy Chọn Chi Tiết:</label>
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showBankQR !== false}
                    onChange={(e) => setForm({ ...form, showBankQR: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-slate-300 font-bold">Hiển thị Mã QR Ngân hàng trên Bill</span>
                </label>
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showImei}
                    onChange={(e) => setForm({ ...form, showImei: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-slate-300">Hiển thị mã IMEI / Serial sản phẩm</span>
                </label>
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showBatteryHealth}
                    onChange={(e) => setForm({ ...form, showBatteryHealth: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-slate-300">Hiển thị % Dung lượng Pin iPhone</span>
                </label>
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showWarrantyTerms}
                    onChange={(e) => setForm({ ...form, showWarrantyTerms: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-slate-300">Hiển thị Điều khoản cam kết bảo hành</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Lời Cảm Ơn Chân Trang (Footer Note)
            </label>
            <input
              type="text"
              value={form.footerNote}
              onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
              placeholder="Cảm ơn Quý khách & Hẹn gặp lại!"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Mặc Định</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsTestInvoiceOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <PlayCircle className="w-4 h-4 text-emerald-400" />
              <span>Xem Trước & In Thử K80</span>
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Mẫu In</span>
            </button>
          </div>
        </div>
      </form>

      {/* Test Invoice Modal */}
      {isTestInvoiceOpen && (
        <InvoiceModal
          isOpen={isTestInvoiceOpen}
          onClose={() => setIsTestInvoiceOpen(false)}
          order={sampleTestOrder}
          initialDocType="invoice"
        />
      )}
    </div>
  );
}
