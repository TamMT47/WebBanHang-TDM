'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Wifi,
  Cloud,
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
  Activity,
  Globe,
  Radio,
  Sparkles,
  HelpCircle,
  Check,
  Laptop,
  Search,
  Usb
} from 'lucide-react';
import {
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
  getInvoiceSettings,
  saveInvoiceSettings
} from '@/lib/invoiceSettings';
import { testLanPrinter, pingPrinterStatus, PrinterPingResult } from '@/lib/printerHelper';

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
  const [pinging, setPinging] = useState(false);
  const [scanningPrinters, setScanningPrinters] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [pingResult, setPingResult] = useState<PrinterPingResult | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; printer?: string } | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    const current = getInvoiceSettings();
    setForm(current);
  }, []);

  const handlePing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await pingPrinterStatus(form);
      setPingResult(res);
      if (res.printers && res.printers.length > 0) {
        setAvailablePrinters(res.printers);
      }
    } catch (err: any) {
      setPingResult({
        online: false,
        message: err.message || 'Lỗi kiểm tra trạng thái QZ Tray Print Server',
      });
    } finally {
      setPinging(false);
    }
  };

  const handleScanPrinters = async () => {
    setScanningPrinters(true);
    try {
      const res = await fetch(
        `/api/print?mode=qz-tray&qzHost=${encodeURIComponent(form.qzHost || '127.0.0.1')}&qzPort=${form.qzPort || 8182}&qzSecure=${form.qzSecure ?? true}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (data.printers && data.printers.length > 0) {
        setAvailablePrinters(data.printers);
        // Auto-select XP-A160H if found
        const matched = data.printers.find(
          (p: string) => p.toLowerCase().includes('xp-a160h') || p.toLowerCase().includes('xprinter')
        );
        if (matched) {
          setForm((prev) => ({ ...prev, qzPrinterName: matched }));
        }
        setSaveNotice(`Tìm thấy ${data.printers.length} máy in từ QZ Tray MacBook!`);
        setTimeout(() => setSaveNotice(null), 3500);
      } else {
        setSaveNotice('QZ Tray đã kết nối nhưng chưa thấy máy in nào.');
        setTimeout(() => setSaveNotice(null), 3500);
      }
    } catch (err: any) {
      setSaveNotice(`Lỗi quét máy in: ${err.message}`);
      setTimeout(() => setSaveNotice(null), 3500);
    } finally {
      setScanningPrinters(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testLanPrinter(form.printerIp, form.printerPort, form);
      if (res.success) {
        const msg = res.message || '🟢 Đã gửi lệnh in thành công qua QZ Tray (XP-A160H)';
        setTestResult({
          success: true,
          message: msg,
          printer: res.printer,
        });
        setSaveNotice(msg);
        setTimeout(() => setSaveNotice(null), 4000);
      } else {
        setTestResult({
          success: false,
          message: res.error || '🔴 Lỗi gửi lệnh in tới máy in Xprinter',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `🔴 ${err.message || 'Lỗi gửi lệnh in'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = saveInvoiceSettings(form);
    setForm(updated);

    // If Admin/Owner, sync settings to Database
    if (user && ['admin', 'owner'].includes(user.role)) {
      try {
        await Promise.all([
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'printer_connection_mode',
              value: form.printerConnectionMode,
              description: 'Phương thức in (qz-tray / tunnel / lan)',
            }),
          }),
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'qz_printer_name',
              value: form.qzPrinterName,
              description: 'Tên máy in QZ Tray USB Xprinter XP-A160H',
            }),
          }),
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'qz_host',
              value: form.qzHost,
              description: 'Host máy chủ QZ Tray (MacBook M2)',
            }),
          }),
        ]);
      } catch (err) {
        console.error('Error syncing printer settings to DB:', err);
      }
    }

    setSaveNotice('Đã lưu cấu hình máy in QZ Tray & ESC/POS thành công!');
    setTimeout(() => setSaveNotice(null), 3500);

    if (onSaved) {
      onSaved(updated);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'Khôi phục cấu hình máy in về thiết lập mặc định (QZ Tray Print Server trên MacBook M2 USB XP-A160H)?'
      )
    ) {
      const reset = saveInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
      setForm(reset);
      setTestResult(null);
      setPingResult(null);
      setSaveNotice('Đã khôi phục cấu hình máy in về mặc định QZ Tray!');
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
                Máy In Hóa Đơn Web POS (QZ Tray & Xprinter XP-A160H)
              </h3>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black rounded-lg badge-nowrap">
                ESC/POS K80
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Print Server QZ Tray trên MacBook M2 kết nối USB với máy in Xprinter XP-A160H, hỗ trợ in ẩn 100% không qua AirPrint.
            </p>
          </div>
        </div>

        {/* Live Status Badge & Ping */}
        <div className="flex items-center space-x-2">
          {pingResult ? (
            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                pingResult.online
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  pingResult.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>{pingResult.online ? `🟢 Sẵn Sàng (${pingResult.latencyMs || 0}ms)` : '🔴 Ngắt Kết Nối'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
              <Usb className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-cyan-300">{form.qzPrinterName || 'XP-A160H'}</span>
            </div>
          )}

          <button
            type="button"
            disabled={pinging}
            onClick={handlePing}
            title="Kiểm tra ping kết nối tới QZ Tray Print Server"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 disabled:opacity-50"
          >
            {pinging ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Test Ping</span>
          </button>
        </div>
      </div>

      {/* Body Form */}
      <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
        
        {/* ========================================================= */}
        {/* 1. CONNECTION MODE SELECTION */}
        {/* ========================================================= */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
            1. Phương Thức Kết Nối Máy In:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Mode: QZ Tray Print Server (Recommended for MacBook M2) */}
            <div
              onClick={() => setForm({ ...form, printerConnectionMode: 'qz-tray' })}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                form.printerConnectionMode === 'qz-tray'
                  ? 'bg-cyan-950/40 border-cyan-500/70 shadow-glow-cyan ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${form.printerConnectionMode === 'qz-tray' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center space-x-1.5">
                      <span>QZ Tray (MacBook M2)</span>
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold rounded-md">
                        Khuyên Dùng
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Kết nối WebSocket bảo mật với QZ Tray trên MacBook M2, in trực tiếp qua cổng USB máy in XP-A160H.
                    </p>
                  </div>
                </div>

                {form.printerConnectionMode === 'qz-tray' && (
                  <Check className="w-4 h-4 text-cyan-400 stroke-[3] mt-1" />
                )}
              </div>
            </div>

            {/* Mode: Cloudflare Tunnel */}
            <div
              onClick={() => setForm({ ...form, printerConnectionMode: 'tunnel' })}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                form.printerConnectionMode === 'tunnel'
                  ? 'bg-cyan-950/40 border-cyan-500/70 shadow-glow-cyan ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${form.printerConnectionMode === 'tunnel' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      Cloudflare Tunnel
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Đẩy lệnh qua Tunnel HTTPS an toàn khi in từ xa ngoài shop
                    </p>
                  </div>
                </div>

                {form.printerConnectionMode === 'tunnel' && (
                  <Check className="w-4 h-4 text-cyan-400 stroke-[3] mt-1" />
                )}
              </div>
            </div>

            {/* Mode: Direct LAN IP */}
            <div
              onClick={() => setForm({ ...form, printerConnectionMode: 'lan' })}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                form.printerConnectionMode === 'lan'
                  ? 'bg-cyan-950/40 border-cyan-500/70 shadow-glow-cyan ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${form.printerConnectionMode === 'lan' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      IP LAN / Wi-Fi (9100)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Kết nối RAW Socket 9100 qua dải IP mạng LAN nội bộ
                    </p>
                  </div>
                </div>

                {form.printerConnectionMode === 'lan' && (
                  <Check className="w-4 h-4 text-cyan-400 stroke-[3] mt-1" />
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. CONFIGURATION FIELDS BASED ON MODE */}
        {/* ========================================================= */}
        {form.printerConnectionMode === 'qz-tray' ? (
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wide">
                <Usb className="w-4 h-4 text-cyan-400" />
                <span>Cấu Hình QZ Tray Print Server (MacBook M2):</span>
              </div>
              <button
                type="button"
                disabled={scanningPrinters}
                onClick={handleScanPrinters}
                className="px-3 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {scanningPrinters ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Quét Tìm Máy In USB</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Target Printer Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên Máy In USB (Xprinter) *
                </label>
                {availablePrinters.length > 0 ? (
                  <div className="flex space-x-2">
                    <select
                      value={form.qzPrinterName || 'XP-A160H'}
                      onChange={(e) => setForm({ ...form, qzPrinterName: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-inner"
                    >
                      {availablePrinters.map((p) => (
                        <option key={p} value={p}>
                          🖨️ {p}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={form.qzPrinterName}
                      onChange={(e) => setForm({ ...form, qzPrinterName: e.target.value })}
                      placeholder="Hoặc nhập tên..."
                      className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={form.qzPrinterName || 'XP-A160H'}
                    onChange={(e) => setForm({ ...form, qzPrinterName: e.target.value })}
                    placeholder="VD: XP-A160H hoặc Xprinter"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 shadow-inner"
                    required
                  />
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Mặc định: <strong className="text-cyan-300">XP-A160H</strong> (Hệ thống tự động khớp máy in USB Xprinter)
                </p>
              </div>

              {/* QZ Host */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  QZ Tray Host *
                </label>
                <input
                  type="text"
                  value={form.qzHost || 'localhost'}
                  onChange={(e) => setForm({ ...form, qzHost: e.target.value.trim() })}
                  placeholder="localhost hoặc IP MacBook"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Mặc định: <span className="font-mono text-slate-400">localhost</span>
                </p>
              </div>

              {/* QZ Port */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Cổng WebSocket *
                </label>
                <input
                  type="number"
                  value={form.qzPort || 8182}
                  onChange={(e) => setForm({ ...form, qzPort: parseInt(e.target.value, 10) || 8182 })}
                  placeholder="8182"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Mặc định: <span className="font-mono text-slate-400">8182 (WSS) / 8181 (WS)</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cloudflare Tunnel URL */}
            {form.printerConnectionMode === 'tunnel' && (
              <div className="sm:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Đường dẫn Cloudflare Tunnel / Server URL:</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    HTTPS Secure Endpoint
                  </span>
                </div>
                <input
                  type="text"
                  value={form.printerTunnelUrl}
                  onChange={(e) => setForm({ ...form, printerTunnelUrl: e.target.value.trim() })}
                  placeholder="https://cet-step-perfectly-joseph.trycloudflare.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
              </div>
            )}

            {/* IP Address */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                IP Máy In LAN *
              </label>
              <input
                type="text"
                value={form.printerIp}
                onChange={(e) => setForm({ ...form, printerIp: e.target.value.trim() })}
                placeholder="192.168.1.133"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 shadow-inner"
                required
              />
            </div>

            {/* Port */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Port Socket *
              </label>
              <input
                type="number"
                value={form.printerPort}
                onChange={(e) => setForm({ ...form, printerPort: parseInt(e.target.value, 10) || 9100 })}
                placeholder="9100"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                required
              />
            </div>

            {/* Paper Size */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Khổ Giấy In *
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
                <option value="k80">🧾 K80 (80mm) - Xprinter XP-A160H</option>
                <option value="k57">🧾 K57 (57mm) - Máy in nhiệt nhỏ</option>
                <option value="a4">📄 Khổ A4 / A5 - Máy in laser văn phòng</option>
              </select>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. ESC/POS SWITCHES */}
        {/* ========================================================= */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Tùy Chọn Lệnh Điều Khiển ESC/POS (Silent Printing Chuẩn K80):</span>
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
                  <span>Auto-Cut (GS V 0)</span>
                </div>
                <div className="text-[10px] text-slate-400">Tự cắt giấy sau khi in xong</div>
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
                  <span>Mở Két Tiền (DLE DC4)</span>
                </div>
                <div className="text-[10px] text-slate-400">Tự mở két tiền khi bán hàng</div>
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
                  <span>Direct Silent Print</span>
                </div>
                <div className="text-[10px] text-slate-400">Bỏ qua popup AirPrint/Browser</div>
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
              {testResult.printer && (
                <p className="text-[11px] text-emerald-300/90 mt-0.5">
                  Máy in mục tiêu: <span className="font-mono font-bold">{testResult.printer}</span>
                </p>
              )}
              {!testResult.success && (
                <p className="text-[11px] text-rose-400/80 mt-1">
                  Gợi ý: Hãy kiểm tra ứng dụng QZ Tray đang chạy trên MacBook M2 và máy in Xprinter XP-A160H đã bật nguồn & cắm cáp USB.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>QZ Tray Print Server trên MacBook M2 giúp in hóa đơn tức thì & bỏ qua hoàn toàn AirPrint trên iPhone.</span>
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

            {/* Test Print Button */}
            <button
              type="button"
              disabled={testing}
              onClick={handleTestPrint}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-glow-emerald transition flex items-center justify-center space-x-1.5 disabled:opacity-50 active:scale-95"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang In Thử...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 text-white" />
                  <span>[In Thử Nghiệm K80]</span>
                </>
              )}
            </button>

            {/* Save Button */}
            <button
              type="submit"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
