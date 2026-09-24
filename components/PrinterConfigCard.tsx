'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
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
  Sparkles,
  Laptop,
  Search,
  Usb,
  Wifi,
  Radio,
  Check,
  Info
} from 'lucide-react';
import {
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
  getInvoiceSettings,
  saveInvoiceSettings
} from '@/lib/invoiceSettings';
import { testLanPrinter, pingPrinterStatus, PrinterPingResult } from '@/lib/printerHelper';
import { listQzPrinters, findQzPrinter } from '@/lib/qzTrayClient';

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
  const [detectedHost, setDetectedHost] = useState<string>('localhost');

  useEffect(() => {
    const current = getInvoiceSettings();
    
    // Auto-detect LAN IP of host when running in browser
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        setDetectedHost(hostname);
        if (!current.qzHost || current.qzHost === 'localhost' || current.qzHost === '127.0.0.1') {
          current.qzHost = hostname;
        }
      }
    }

    // Default printer name to "Xprinter USB Printer P"
    if (!current.qzPrinterName || current.qzPrinterName === 'XP-A160H') {
      current.qzPrinterName = 'Xprinter USB Printer P';
    }

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
      let foundList: string[] = [];

      // 1. First try client-side QZ Tray connection
      try {
        const clientList = await listQzPrinters(form.qzHost || 'localhost');
        if (clientList && clientList.length > 0) {
          foundList = clientList;
        }
      } catch (clientErr) {
        console.warn('Client QZ Tray scan notice:', clientErr);
      }

      // 2. Fallback to server API scan if client list empty
      if (foundList.length === 0) {
        const res = await fetch(
          `/api/print?mode=qz-tray&qzHost=${encodeURIComponent(form.qzHost || '127.0.0.1')}&qzPort=${form.qzPort || 8182}&qzSecure=${form.qzSecure ?? true}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.printers && data.printers.length > 0) {
          foundList = data.printers;
        }
      }

      if (foundList.length > 0) {
        setAvailablePrinters(foundList);

        // Auto-match exact "Xprinter USB Printer P" or any Xprinter / USB printer
        const matched =
          foundList.find((p: string) => p.toLowerCase() === 'xprinter usb printer p') ||
          foundList.find((p: string) => p.toLowerCase().includes('xprinter usb printer p')) ||
          foundList.find((p: string) => p.toLowerCase().includes('xprinter')) ||
          foundList.find((p: string) => p.toLowerCase().includes('usb')) ||
          foundList[0];

        if (matched) {
          setForm((prev) => ({ ...prev, qzPrinterName: matched }));
          setSaveNotice(`🟢 Đã tự động nhận diện máy in thực tế: "${matched}"`);
        } else {
          setSaveNotice(`Tìm thấy ${foundList.length} máy in từ QZ Tray MacBook!`);
        }
        setTimeout(() => setSaveNotice(null), 4500);
      } else {
        setSaveNotice('⚠️ QZ Tray đã kết nối nhưng chưa thấy máy in nào. Vui lòng cắm cáp USB và bật nguồn máy in.');
        setTimeout(() => setSaveNotice(null), 4500);
      }
    } catch (err: any) {
      setSaveNotice(`🔴 Lỗi quét máy in: ${err.message}`);
      setTimeout(() => setSaveNotice(null), 4000);
    } finally {
      setScanningPrinters(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testLanPrinter(undefined, undefined, form);
      if (res.success) {
        const msg = res.message || `🟢 Đã gửi lệnh in thành công qua QZ Tray (${form.qzPrinterName || 'Xprinter USB Printer P'})`;
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
          message: res.error || '🔴 Lỗi gửi lệnh in tới máy in Xprinter USB',
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

    // Sync settings to DB for store persistence if Admin/Owner
    if (user && ['admin', 'owner'].includes(user.role)) {
      try {
        await Promise.all([
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'printer_connection_mode',
              value: 'qz-tray',
              description: 'Phương thức in (Máy Chủ MacBook USB Print Server via QZ Tray)',
            }),
          }),
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'qz_printer_name',
              value: form.qzPrinterName || 'Xprinter USB Printer P',
              description: 'Tên máy in QZ Tray USB Xprinter USB Printer P',
            }),
          }),
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'qz_host',
              value: form.qzHost,
              description: 'Host máy chủ QZ Tray (MacBook Host IP)',
            }),
          }),
        ]);
      } catch (err) {
        console.error('Error syncing printer settings to DB:', err);
      }
    }

    setSaveNotice('Đã lưu cấu hình máy in QZ Tray thành công!');
    setTimeout(() => setSaveNotice(null), 3500);

    if (onSaved) {
      onSaved(updated);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'Khôi phục cấu hình máy in về thiết lập mặc định (Máy Chủ MacBook USB via QZ Tray - Xprinter USB Printer P)?'
      )
    ) {
      const reset = saveInvoiceSettings({
        ...DEFAULT_INVOICE_SETTINGS,
        qzPrinterName: 'Xprinter USB Printer P',
        qzHost: detectedHost || 'localhost',
      });
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
        <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 font-black text-xs flex items-center justify-between animate-in slide-in-from-top border-b border-emerald-400 shadow-glow-emerald">
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
                Cấu Hình Máy In Hóa Đơn (QZ Tray USB Print Server)
              </h3>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black rounded-lg badge-nowrap">
                ESC/POS K80
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Print Server QZ Tray trên MacBook kết nối USB với máy in Xprinter, in hóa đơn ẩn 100% không qua AirPrint.
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
              <span className="font-mono text-cyan-300 font-bold">{form.qzPrinterName || 'Xprinter USB Printer P'}</span>
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
        {/* 1. SINGLE UNIFIED PRINT METHOD (STREAMLINED) */}
        {/* ========================================================= */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide">
            1. Phương Thức In Duy Nhất Của Hệ Thống:
          </label>
          
          <div className="p-4 rounded-2xl border bg-cyan-950/40 border-cyan-500/70 shadow-glow-cyan ring-1 ring-cyan-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 shadow-md">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white flex items-center space-x-2">
                    <span>Máy Chủ MacBook (USB Print Server via QZ Tray)</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold rounded-md uppercase">
                      Phương Thức Chuẩn
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Kết nối WebSocket bảo mật với QZ Tray daemon chạy trên máy chủ MacBook, đẩy trực tiếp lệnh ESC/POS qua cổng USB máy in Xprinter tốc độ siêu tốc và bỏ qua hoàn toàn hộp thoại AirPrint trên iPhone/iPad.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-cyan-500/30 self-start sm:self-center">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Đang Áp Dụng</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. CONFIGURATION FIELDS (QZ TRAY HOST & PRINTER DETECTION) */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wide">
              <Usb className="w-4 h-4 text-cyan-400" />
              <span>Thiết Lập Máy In & Máy Chủ MacBook:</span>
            </div>

            <button
              type="button"
              disabled={scanningPrinters}
              onClick={handleScanPrinters}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50 shadow-glow-cyan"
            >
              {scanningPrinters ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>[Quét Tìm Máy In USB Tự Động]</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            
            {/* Target Printer Name */}
            <div className="sm:col-span-7 space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Tên Máy In Nhận Trên macOS (Target Printer Name) *
              </label>
              
              {availablePrinters.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={form.qzPrinterName || 'Xprinter USB Printer P'}
                    onChange={(e) => setForm({ ...form, qzPrinterName: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-cyan-500/50 rounded-xl text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
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
                    placeholder="Nhập tên khác..."
                    className="w-full sm:w-44 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={form.qzPrinterName || 'Xprinter USB Printer P'}
                    onChange={(e) => setForm({ ...form, qzPrinterName: e.target.value })}
                    placeholder="VD: Xprinter USB Printer P"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 shadow-inner"
                    required
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Info className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span>
                  Tên chuẩn xác trên macOS: <strong className="text-cyan-300 font-mono">Xprinter USB Printer P</strong> (Bấm nút [Quét Tìm Máy In USB] để nhận diện tự động).
                </span>
              </p>
            </div>

            {/* QZ Host IP / LAN */}
            <div className="sm:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Địa Chỉ IP Host MacBook *
                </label>
                <span className="text-[10px] text-slate-500">Wi-Fi LAN / Local</span>
              </div>

              <input
                type="text"
                value={form.qzHost || 'localhost'}
                onChange={(e) => setForm({ ...form, qzHost: e.target.value.trim() })}
                placeholder="VD: 192.168.1.133 hoặc localhost"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                required
              />

              {/* Quick Host Suggestion Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500">Gợi ý nhanh:</span>
                {detectedHost && detectedHost !== 'localhost' && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, qzHost: detectedHost })}
                    className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold rounded-lg transition"
                  >
                    IP máy: {detectedHost}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, qzHost: 'localhost' })}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono rounded-lg transition"
                >
                  localhost
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, qzHost: '192.168.1.133' })}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono rounded-lg transition"
                >
                  192.168.1.133
                </button>
              </div>
            </div>

          </div>

          {/* Port & Secure Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Cổng WebSocket QZ Tray
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
                Mặc định: <span className="font-mono text-slate-400">8182 (WSS Bảo mật) / 8181 (WS Trực tiếp)</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Khổ Giấy Máy In Nhiệt
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
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500 cursor-pointer shadow-inner"
              >
                <option value="k80">🧾 Khổ K80 (80mm - 48 Cột Chuẩn Hóa Đơn)</option>
                <option value="k57">🧾 Khổ K57 (57mm - 32 Cột Mini)</option>
                <option value="a4">📄 Khổ A4 / A5 (Văn Phòng)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Định dạng chuẩn quầy thu ngân TD Mobile Store: <strong className="text-cyan-400">K80</strong>
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. ESC/POS SWITCHES */}
        {/* ========================================================= */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Tùy Chọn Lệnh Điều Khiển ESC/POS (Silent Printing Chuẩn K80):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <label className="flex items-center space-x-2.5 p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
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

            <label className="flex items-center space-x-2.5 p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
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

            <label className="flex items-center space-x-2.5 p-3 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
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
                  Gợi ý: Hãy kiểm tra ứng dụng QZ Tray đang chạy trên MacBook Host và máy in Xprinter đã bật nguồn & cắm cáp USB.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>QZ Tray Print Server trên MacBook giúp in hóa đơn tức thì & bỏ qua hoàn toàn AirPrint trên iPhone.</span>
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
