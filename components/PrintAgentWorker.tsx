'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Printer,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Trash2,
  RefreshCw,
  Loader2,
  Zap,
  Laptop,
  Check
} from 'lucide-react';
import { PrintJob } from '@/types/database';
import { printQzRaw, connectQzTray } from '@/lib/qzTrayClient';
import { getInvoiceSettings } from '@/lib/invoiceSettings';

interface PrintAgentWorkerProps {
  user?: any;
  showQueueList?: boolean;
  className?: string;
}

export default function PrintAgentWorker({
  user,
  showQueueList = false,
  className = '',
}: PrintAgentWorkerProps) {
  const [isAgentEnabled, setIsAgentEnabled] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [recentJobs, setRecentJobs] = useState<PrintJob[]>([]);
  const [lastPrintedMsg, setLastPrintedMsg] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'printing' | 'error'>('listening');
  const isPollingRef = useRef<boolean>(false);

  // Load agent preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tdm_print_agent_enabled');
      if (saved !== null) {
        setIsAgentEnabled(saved === 'true');
      } else {
        // Auto-enable on desktop / Mac
        const isMac = navigator.userAgent.toLowerCase().includes('mac');
        setIsAgentEnabled(isMac);
      }
    }
  }, []);

  const toggleAgent = () => {
    const next = !isAgentEnabled;
    setIsAgentEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tdm_print_agent_enabled', String(next));
    }
  };

  /**
   * Process a pending print job through local QZ Tray
   */
  const processJob = async (job: PrintJob) => {
    const settings = getInvoiceSettings();
    const printerName = job.printer_name || settings.qzPrinterName || 'Xprinter USB Printer P';
    const host = 'localhost';
    const port = settings.qzPort || 8181;
    const secure = settings.qzSecure ?? false;

    try {
      setAgentStatus('printing');

      // Update status to PRINTING
      await fetch('/api/print-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job.id, status: 'PRINTING' }),
      });

      if (!job.payload_escpos) {
        throw new Error('Lệnh in không có dữ liệu ESC/POS buffer');
      }

      // Send to local QZ Tray
      const qzRes = await printQzRaw(job.payload_escpos, printerName, host, port, secure);

      if (qzRes.success) {
        // Mark as PRINTED
        await fetch('/api/print-queue', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: job.id, status: 'PRINTED' }),
        });

        const successMsg = `🟢 Đã tự động in đơn #${job.order_code || 'BILL'} qua QZ Tray (${printerName})!`;
        setLastPrintedMsg(successMsg);
        setTimeout(() => setLastPrintedMsg(null), 5000);
      } else {
        throw new Error(qzRes.error || qzRes.message || 'Lỗi gửi lệnh in tới QZ Tray');
      }
    } catch (err: any) {
      console.error('Error processing print job:', err);
      // Mark as FAILED
      await fetch('/api/print-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          status: 'FAILED',
          errorMessage: err.message || 'Lỗi không xác định',
        }),
      });
      setLastPrintedMsg(`🔴 Lỗi in đơn #${job.order_code}: ${err.message}`);
      setTimeout(() => setLastPrintedMsg(null), 6000);
    } finally {
      setAgentStatus('listening');
    }
  };

  /**
   * Poll Print Queue for PENDING jobs
   */
  const checkPrintQueue = useCallback(async () => {
    if (!isAgentEnabled || isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const res = await fetch('/api/print-queue?status=ALL&limit=15', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.jobs) return;

      setRecentJobs(data.jobs);

      const pendingJobs: PrintJob[] = data.jobs.filter((j: PrintJob) => j.status === 'PENDING');
      setPendingCount(pendingJobs.length);

      // Process oldest pending job first
      if (pendingJobs.length > 0 && !isProcessing) {
        setIsProcessing(true);
        const targetJob = pendingJobs[0];
        await processJob(targetJob);
        setIsProcessing(false);
      }
    } catch (err) {
      // ignore network errors while polling
    } finally {
      isPollingRef.current = false;
    }
  }, [isAgentEnabled, isProcessing]);

  // Polling Interval: every 1.5 seconds when active
  useEffect(() => {
    if (!isAgentEnabled) {
      setAgentStatus('idle');
      return;
    }

    setAgentStatus('listening');
    checkPrintQueue();
    const interval = setInterval(checkPrintQueue, 1500);

    return () => clearInterval(interval);
  }, [isAgentEnabled, checkPrintQueue]);

  // Manual retry job
  const handleRetryJob = async (job: PrintJob) => {
    await fetch('/api/print-queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: job.id, status: 'PENDING' }),
    });
    checkPrintQueue();
  };

  // Clear completed jobs
  const handleClearCompleted = async () => {
    await fetch('/api/print-queue?action=clear_printed', { method: 'DELETE' });
    checkPrintQueue();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toast Alert for Agent print event */}
      {lastPrintedMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/60 text-white px-4 py-3 rounded-2xl shadow-glow-cyan flex items-center space-x-2.5 animate-in slide-in-from-bottom duration-300 text-xs font-bold">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>{lastPrintedMsg}</span>
        </div>
      )}

      {/* Print Agent Card */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-xl transition ${
              isAgentEnabled
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-glow-cyan'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <Radio className={`w-5 h-5 ${isAgentEnabled ? 'animate-pulse' : ''}`} />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Print Agent Background Worker (MacBook Host)
              </h4>
              {isAgentEnabled ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black rounded-md flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>ĐANG LẮNG NGHE</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-bold rounded-md">
                  ĐÃ TẮT
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAgentEnabled
                ? 'Tự động bắt lệnh in từ điện thoại di động và gửi trực tiếp qua QZ Tray máy chủ MacBook USB.'
                : 'Bật chế độ này trên MacBook quầy thu ngân để tự động nhận và in bill từ iPhone/iPad.'}
            </p>
          </div>
        </div>

        {/* Action / Toggle */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Chờ in:</span>
            <span className={`font-mono font-black ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {pendingCount}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleAgent}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isAgentEnabled
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-400 shadow-glow-cyan'
            }`}
          >
            {isAgentEnabled ? 'Tạm Dừng' : 'Bật Print Agent'}
          </button>
        </div>
      </div>

      {/* Optional Queue Details List */}
      {showQueueList && recentJobs.length > 0 && (
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hàng Đợi Lệnh In Gần Đây ({recentJobs.length})</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => checkPrintQueue()}
                className="p-1 hover:text-cyan-300 text-slate-400 transition"
                title="Làm mới hàng đợi"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClearCompleted}
                className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa Đã In</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {recentJobs.map((job) => {
              const isPending = job.status === 'PENDING';
              const isPrinted = job.status === 'PRINTED';
              const isFailed = job.status === 'FAILED';

              return (
                <div
                  key={job.id}
                  className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/90 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPending ? 'bg-amber-400 animate-pulse' : isPrinted ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-white flex items-center space-x-1.5">
                        <span>Đơn #{job.order_code || 'TEST'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({job.doc_type === 'warranty' ? 'Phiếu BH' : job.doc_type === 'test' ? 'Test K80' : 'Hóa đơn'})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(job.created_at).toLocaleTimeString('vi-VN')} • Tạo bởi: {job.created_by_name || 'POS'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        isPending
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isPrinted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isPending ? 'Chờ in' : isPrinted ? 'Đã in' : 'Lỗi'}
                    </span>

                    {(isFailed || isPrinted) && (
                      <button
                        type="button"
                        onClick={() => handleRetryJob(job)}
                        className="p-1 hover:text-cyan-300 text-slate-400 transition"
                        title="In lại"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
