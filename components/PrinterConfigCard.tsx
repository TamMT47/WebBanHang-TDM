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
  Info,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import {
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
  getInvoiceSettings,
  saveInvoiceSettings
} from '@/lib/invoiceSettings';
import { testLanPrinter, pingPrinterStatus, PrinterPingResult } from '@/lib/printerHelper';
import { listQzPrinters, findQzPrinter, probeWebSocket } from '@/lib/qzTrayClient';

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
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; message: string; details?: string[] } | null>(null);
  const [detectedHost, setDetectedHost] = useState<string>('MacBook-Air-cua-Truong.local');

  useEffect(() => {
    const current = getInvoiceSettings();
    
    // Auto-detect LAN IP / hostname when running in browser
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        setDetectedHost(hostname);
        if (!current.qzHost || current.qzHost === 'localhost' || current.qzHost === '127.0.0.1') {
          current.qzHost = hostname;
        }
      }
    }

    // Default printer name and port 8181
    if (!current.qzPrinterName || current.qzPrinterName === 'XP-A160H') {
      current.qzPrinterName = 'Xprinter USB Printer P';
    }
    if (!current.qzPort || current.qzPort === 8182) {
      current.qzPort = 8181;
    }
    current.qzSecure = false;

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
      if (res.online) {
        setSaveNotice({
          type: 'success',
          message: `🟢 Đã kết nối QZ Tray thành công tại ${form.qzHost || 'MacBook-Air-cua-Truong.local'}:${form.qzPort || 8181}`,
        });
      } else {
        setSaveNotice({
          type: 'error',
          message: `🔴 Chưa thể kết nối QZ Tray tại ${form.qzHost || 'MacBook-Air-cua-Truong.local'}:${form.qzPort || 8181}`,
          details: [
            '1. Đảm bảo ứng dụng QZ Tray đang chạy trên MacBook (biểu tượng xanh lá ở Menu Bar).',
            '2. Điện thoại và MacBook cần kết nối chung một mạng Wi-Fi tại cửa hàng.',
            `3. Đang thử kết nối WebSocket: ws://${form.qzHost || 'MacBook-Air-cua-Truong.local'}:${form.qzPort || 8181}`,
            '4. Thử đổi sang tên miền mDNS cố định: MacBook-Air-cua-Truong.local',
          ],
        });
      }
    } catch (err: any) {
      setPingResult({
        online: false,
        message: err.message || 'Lỗi kiểm tra trạng thái QZ Tray Print Server',
      });
      setSaveNotice({
        type: 'error',
        message: `🔴 Lỗi kết nối QZ Tray: ${err.message}`,
        details: [
          'Kiểm tra QZ Tray trên máy chủ MacBook đã bật.',
          'Kiểm tra địa chỉ Host và cổng WebSocket 8181.',
        ],
      });
    } finally {
      setPinging(false);
      setTimeout(() => setSaveNotice(null), 7000);
    }
  };

  const handleScanPrinters = async () => {
    setScanningPrinters(true);
    try {
      let foundList: string[] = [];

      // 1. First try client-side QZ Tray connection via port 8181
      try {
        const clientList = await listQzPrinters(form.qzHost || 'MacBook-Air-cua-Truong.local', form.qzPort || 8181, form.qzSecure ?? false);
        if (clientList && clientList.length > 0) {
          foundList = clientList;
        }
      } catch (clientErr) {
        console.warn('Client QZ Tray scan notice:', clientErr);
      }

      // 2. Fallback to server API scan if client list empty
      if (foundList.length === 0) {
        const res = await fetch(
          `/api/print?mode=qz-tray&qzHost=${encodeURIComponent(form.qzHost || 'MacBook-Air-cua-Truong.local')}&qzPort=${form.qzPort || 8181}&qzSecure=${form.qzSecure ?? false}`,
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
          setSaveNotice({
            type: 'success',
            message: `🟢 Đã tự động nhận diện máy in thực tế: "${matched}" từ QZ Tray!`,
          });
        } else {
          setSaveNotice({
            type: 'success',
            message: `🟢 Tìm thấy ${foundList.length} máy in từ QZ Tray MacBook!`,
          });
        }
      } else {
        setSaveNotice({
          type: 'error',
          message: '⚠️ QZ Tray đã kết nối nhưng chưa thấy máy in nào.',
          details: [
            'Cắm cáp USB từ máy in Xprinter vào máy chủ MacBook.',
            'Bật công tắc nguồn của máy in Xprinter.',
          ],
        });
      }
    } catch (err: any) {
      setSaveNotice({
        type: 'error',
        message: `🔴 Lỗi quét máy in: ${err.message}`,
        details: [
          'Đảm bảo ứng dụng QZ Tray đang chạy trên MacBook.',
          `Kiểm tra kết nối tới ws://${form.qzHost || 'MacBook-Air-cua-Truong.local'}:${form.qzPort || 8181}`,
        ],
      });
    } finally {
      setScanningPrinters(false);
      setTimeout(() => setSaveNotice(null), 6000);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestResult(null);

    // Save current form settings first
    const updated = saveInvoiceSettings(form);
    setForm(updated);

    try {
      const res = await testLanPrinter(undefined, undefined, form);
      if (res.success) {
        const msg = res.message || 'Đã gửi lệnh in tới máy chủ MacBook thành công!';
        setTestResult({
          success: true,
          message: msg,
          printer: res.printer,
        });
        setSaveNotice({
          type: 'success',
          message: msg,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || '🔴 Lỗi gửi lệnh in tới máy in Xprinter USB',
        });
        setSaveNotice({
          type: 'error',
          message: `🔴 Không thể gửi lệnh in tới ${form.qzHost || 'MacBook-Air-cua-Truong.local'}:${form.qzPort || 8181}`,
          details: [
            '1. Kiểm tra ứng dụng QZ Tray đang chạy trên MacBook (biểu tượng xanh lá cây).',
            '2. Kiểm tra iPhone và MacBook đang dùng chung mạng Wi-Fi.',
            `3. Đang kết nối tới: ws://${form.qzHost || 'MacBook-Air-cua-Truong.local'}:${form.qzPort || 8181}`,
            '4. Thử bấm nút [Quét Tìm Máy In USB] để đồng bộ lại tên thiết bị.',
          ],
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `🔴 ${err.message || 'Lỗi gửi lệnh in'}`,
      });
      setSaveNotice({
        type: 'error',
        message: `🔴 Lỗi in thử nghiệm: ${err.message}`,
        details: [
          'Kiểm tra kết nối mạng Wi-Fi và ứng dụng QZ Tray trên MacBook.',
        ],
      });
    } finally {
      setTesting(false);
      setTimeout(() => setSaveNotice(null), 7000);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = saveInvoiceSettings(form);
    setForm(updated);

    // Test connection quickly in background
    try {
      const res = await pingPrinterStatus(updated);
      setPingResult(res);
      if (res.online) {
        setSaveNotice({
          type: 'success',
          message: `🟢 Đã lưu cấu hình và kết nối QZ Tray thành công tại ${updated.qzHost}:${updated.qzPort}!`,
        });
      } else {
        setSaveNotice({
          type: 'error',
          message: `⚠️ Đã lưu cấu hình nhưng chưa thể kết nối QZ Tray tại ${updated.qzHost}:${updated.qzPort}`,
          details: [
            '1. Đảm bảo ứng dụng QZ Tray đang chạy trên MacBook.',
            '2. Điện thoại và MacBook phải kết nối chung Wi-Fi cửa hàng.',
            `3. Chuỗi kết nối đang dùng: ws://${updated.qzHost}:${updated.qzPort}`,
            '4. Thử bấm nút "MacBook-Air-cua-Truong.local" nếu router đổi IP.',
          ],
        });
      }
    } catch (err: any) {
      setSaveNotice({
        type: 'success',
        message: 'Đã lưu cấu hình máy in QZ Tray thành công!',
      });
    }

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
              value: form.qzHost || 'MacBook-Air-cua-Truong.local',
              description: 'Host máy chủ QZ Tray (MacBook Host IP / mDNS)',
            }),
          }),
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'qz_port',
              value: String(form.qzPort || 8181),
              description: 'Cổng WebSocket QZ Tray (8181)',
            }),
          }),
        ]);
      } catch (err) {
        console.error('Error syncing printer settings to DB:', err);
      }
    }

    setTimeout(() => setSaveNotice(null), 6000);

    if (onSaved) {
      onSaved(updated);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'Khôi phục cấu hình máy in về thiết lập mặc định (Máy Chủ MacBook USB via QZ Tray ws://MacBook-Air-cua-Truong.local:8181)?'
      )
    ) {
      const reset = saveInvoiceSettings({
        ...DEFAULT_INVOICE_SETTINGS,
        qzPrinterName: 'Xprinter USB Printer P',
        qzHost: 'MacBook-Air-cua-Truong.local',
        qzPort: 8181,
        qzSecure: false,
      });
      setForm(reset);
      setTestResult(null);
      setPingResult(null);
      setSaveNotice({
        type: 'success',
        message: 'Đã khôi phục cấu hình máy in về mặc định QZ Tray (Cổng 8181)!',
      });
      setTimeout(() => setSaveNotice(null), 3000);
    }
  };

  return (
    <div
      className={`bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Toast / Banner Alert */}
      {saveNotice && (
        <div
          className={`px-4 sm:px-5 py-3 font-bold text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in slide-in-from-top border-b shadow-lg ${
            saveNotice.type === 'success'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-glow-emerald'
              : 'bg-rose-600 text-white border-rose-500 shadow-lg'
          }`}
        >
          <div className="flex items-start space-x-2.5">
            {saveNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-slate-950 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-black text-sm">{saveNotice.message}</div>
              {saveNotice.details && (
                <ul className="mt-1 space-y-0.5 text-[11px] opacity-95 font-medium list-disc list-inside">
                  {saveNotice.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
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
                Port 8181 (ws://)
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
                      Cổng 8181 Trực Tiếp
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Kết nối WebSocket không SSL qua cổng <strong>8181</strong> (<code>ws://</code>) giúp iPhone/iPad trong mạng LAN kết nối mượt mà không bị trình duyệt chặn chứng chỉ SSL, in tức thì qua cổng USB máy in Xprinter.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 text-xs font-bold text-cyan-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-cyan-500/30 self-start sm:self-center">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Đang Dùng ws://8181</span>
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

            {/* QZ Host IP / LAN / mDNS */}
            <div className="sm:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Địa Chỉ IP Host / Tên Miền Cục Bộ *
                </label>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">mDNS / IP</span>
              </div>

              <input
                type="text"
                value={form.qzHost || 'MacBook-Air-cua-Truong.local'}
                onChange={(e) => setForm({ ...form, qzHost: e.target.value.trim() })}
                placeholder="VD: MacBook-Air-cua-Truong.local hoặc 192.168.1.133"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 shadow-inner"
                required
              />

              {/* Quick Host Suggestion Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Gợi ý cố định:</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, qzHost: 'MacBook-Air-cua-Truong.local' })}
                  className="px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold rounded-lg transition"
                >
                  ✨ MacBook-Air-cua-Truong.local
                </button>
                {detectedHost && detectedHost !== 'localhost' && detectedHost !== 'MacBook-Air-cua-Truong.local' && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, qzHost: detectedHost })}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono rounded-lg transition"
                  >
                    IP: {detectedHost}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, qzHost: '192.168.1.133' })}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono rounded-lg transition"
                >
                  192.168.1.133
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, qzHost: 'localhost' })}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-mono rounded-lg transition"
                >
                  localhost
                </button>
              </div>
            </div>

          </div>

          {/* Port & Secure Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Cổng WebSocket QZ Tray *
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">ws:// (Khuyên dùng)</span>
              </div>
              <input
                type="number"
                value={form.qzPort || 8181}
                onChange={(e) => setForm({ ...form, qzPort: parseInt(e.target.value, 10) || 8181 })}
                placeholder="8181"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Chuỗi kết nối thực tế: <strong className="font-mono text-cyan-300">ws://{form.qzHost || 'MacBook-Air-cua-Truong.local'}:{form.qzPort || 8181}</strong>
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
