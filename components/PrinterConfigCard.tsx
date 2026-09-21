'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Wifi,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  PlayCircle,
  Loader2,
  Sliders,
  Scissors,
  DollarSign,
  Zap,
  Info
} from 'lucide-react';
import {
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
  getInvoiceSettings,
  saveInvoiceSettings
} from '@/lib/invoiceSettings';
import { testLanPrinter } from '@/lib/printerHelper';

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    const current = getInvoiceSettings();
    setForm(current);
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testLanPrinter(form.printerIp, form.printerPort, form);
      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || `Đã gửi lệnh in kiểm tra thành công tới ${form.printerIp}:${form.printerPort}!`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || `Không kết nối được máy in LAN (${form.printerIp}:${form.printerPort})`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Lỗi kiểm tra kết nối',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = saveInvoiceSettings(form);
    setForm(updated);

    // If Admin/Owner, also sync to database settings
    if (user && ['admin', 'owner'].includes(user.role)) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'printer_ip',
            value: form.printerIp,
            description: 'Địa chỉ IP Máy in LAN Xprinter',
          }),
        });
      } catch (err) {
        console.error('Error syncing printer IP to DB:', err);
      }
    }

    setSaveNotice('Đã lưu cấu hình máy in hóa đơn thành công!');
    setTimeout(() => setSaveNotice(null), 3500);

    if (onSaved) {
      onSaved(updated);
    }
  };

  const handleReset = () => {
    if (confirm('Khôi phục cấu hình máy in về mặc định (192.168.1.133:9100 - K80)?')) {
      const reset = saveInvoiceSettings({
        printerIp: '192.168.1.133',
        printerPort: 9100,
        printerPaperSize: 'k80',
        printerAutoCut: true,
        printerOpenDrawer: true,
        directPrintEnabled: true,
      });
      setForm(reset);
      setTestResult(null);
      setSaveNotice('Đã khôi phục cấu hình máy in về mặc định!');
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Toast Alert */}
      {saveNotice && (
        <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 font-black text-xs flex items-center justify-between animate-in slide-in-from-top border-b border-emerald-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>{saveNotice}</span>
          </div>
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
                Cấu Hình Máy In LAN / Wifi (Xprinter XP-Q80BS)
              </h3>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black rounded-lg badge-nowrap">
                ESC/POS Port 9100
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              In hóa đơn & phiếu bảo hành trực tiếp qua địa chỉ IP mạng nội bộ từ Máy tính, iPhone, iPad, Android.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
            <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400">IP hiện tại:</span>
            <span className="font-mono font-bold text-cyan-300">{form.printerIp || '192.168.1.133'}</span>
          </div>
        </div>
      </div>

      {/* Body Form */}
      <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* IP Address */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Địa chỉ IP Máy in LAN *
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.printerIp}
                onChange={(e) => setForm({ ...form, printerIp: e.target.value.trim() })}
                placeholder="VD: 192.168.1.133"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 shadow-inner"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Mặc định: <span className="font-mono text-slate-400">192.168.1.133</span> (Máy in quầy thu ngân)
            </p>
          </div>

          {/* Port */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Cổng kết nối (Port) *
            </label>
            <input
              type="number"
              value={form.printerPort}
              onChange={(e) => setForm({ ...form, printerPort: parseInt(e.target.value, 10) || 9100 })}
              placeholder="VD: 9100"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 shadow-inner"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Mặc định cổng JetDirect RAW: <span className="font-mono text-slate-400">9100</span>
            </p>
          </div>

          {/* Paper Size Dropdown */}
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Khổ Giấy In Mặc Định *
            </label>
            <select
              value={form.printerPaperSize || 'k80'}
              onChange={(e) =>
                setForm({
                  ...form,
                  printerPaperSize: e.target.value as any,
                  paperSize: e.target.value === 'a4' ? 'a4' : 'k80',
                })
              }
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500 cursor-pointer shadow-inner"
            >
              <option value="k80">🧾 K80 (80mm) - Xprinter XP-Q80BS (Khuyên dùng)</option>
              <option value="k57">🧾 K57 (57mm) - Máy in nhiệt nhỏ mini</option>
              <option value="a4">📄 Khổ A4 / A5 - Máy in laser văn phòng</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Tự động căn lề 48 cột chuẩn cho bill nhiệt K80
            </p>
          </div>

        </div>

        {/* Feature Switches */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Tùy Chọn Lệnh Điều Khiển Máy In Nhiệt (ESC/POS Control):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <label className="flex items-center space-x-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={form.printerAutoCut}
                onChange={(e) => setForm({ ...form, printerAutoCut: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1">
                  <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tự động Cắt Giấy (GS V 0)</span>
                </div>
                <div className="text-[10px] text-slate-400">Cắt giấy sau khi in xong bill</div>
              </div>
            </label>

            <label className="flex items-center space-x-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={form.printerOpenDrawer}
                onChange={(e) => setForm({ ...form, printerOpenDrawer: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tự Bật Két Tiền (DLE DC4)</span>
                </div>
                <div className="text-[10px] text-slate-400">Kích mở két đựng tiền khi bán hàng</div>
              </div>
            </label>

            <label className="flex items-center space-x-2.5 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={form.directPrintEnabled}
                onChange={(e) => setForm({ ...form, directPrintEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-0"
              />
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>In Trực Tiếp Tức Thì</span>
                </div>
                <div className="text-[10px] text-slate-400">Tự động gửi lệnh in không cần hộp thoại</div>
              </div>
            </label>
          </div>
        </div>

        {/* Test Result Message Box */}
        {testResult && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start space-x-2.5 animate-in fade-in duration-200 border ${
              testResult.success
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            )}
            <div className="flex-1">
              <p className="font-bold">{testResult.message}</p>
              {!testResult.success && (
                <p className="text-[11px] text-rose-400/80 mt-1">
                  Gợi ý: Hãy đảm bảo máy in Xprinter XP-Q80BS đã bật nguồn, cắm dây mạng LAN và thiết bị của bạn đang kết nối chung Wifi với cửa hàng.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Mẫu in test sẽ in thử 1 đoạn văn bản K80 + mã QR + lệnh cắt giấy.</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Reset Button */}
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Mặc Định</span>
            </button>

            {/* Test Connection Button */}
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-glow-emerald transition flex items-center justify-center space-x-1.5 disabled:opacity-50 active:scale-95"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang Gửi Lệnh In...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 text-white" />
                  <span>[In Thử Nghiệm]</span>
                </>
              )}
            </button>

            {/* Save Button */}
            <button
              type="submit"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Máy In</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
