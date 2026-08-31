'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Camera,
  AlertCircle,
  RefreshCw,
  Zap,
  ZapOff,
  CheckCircle,
  ScanLine,
  Layers,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  existingImeis?: string[];
  continuous?: boolean;
}

export default function ScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Quét mã Barcode / QR IMEI',
  existingImeis = [],
  continuous = false,
}: ScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState<number>(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isCooldownRef = useRef<boolean>(false);
  const scannedImeisSetRef = useRef<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const readerElementId = 'html5-barcode-reader';

  // Extract 15-digit IMEI using regex
  const extractImei = (rawText: string): string => {
    if (!rawText) return '';
    const clean = rawText.trim();
    
    // Match 15 consecutive digits (standard Apple IMEI length)
    const match15 = clean.match(/\b\d{15}\b/) || clean.match(/\d{15}/);
    if (match15) {
      return match15[0];
    }
    
    // Match 14 or 16 digit serial/IMEI fallback
    const matchAny = clean.match(/\b[A-Z0-9]{12,18}\b/i);
    if (matchAny) {
      return matchAny[0];
    }

    return clean;
  };

  // Sound and Haptic Feedback
  const playSuccessFeedback = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 40, 120]);
      }
    } catch (e) {}
  };

  // Process a detected code with De-duplication & 1.5s Debounce
  const handleCodeDetected = useCallback((rawCode: string) => {
    if (isCooldownRef.current) return;

    const imei = extractImei(rawCode);
    if (!imei || imei.length < 5) return;

    // Check if IMEI was already scanned in this session or in existing list
    const isDuplicate =
      scannedImeisSetRef.current.has(imei.toLowerCase()) ||
      existingImeis.some((ex) => ex.toLowerCase() === imei.toLowerCase());

    if (isDuplicate) {
      setDuplicateWarning(`Mã IMEI ${imei} đã có trong danh sách!`);
      setTimeout(() => setDuplicateWarning(null), 1800);
      return;
    }

    // New valid IMEI
    isCooldownRef.current = true;
    scannedImeisSetRef.current.add(imei.toLowerCase());
    setLastScanned(imei);
    setScannedCount((prev) => prev + 1);
    playSuccessFeedback();

    onScanSuccess(imei);

    if (!continuous) {
      setTimeout(() => {
        stopScanner();
        onClose();
      }, 500);
    } else {
      setTimeout(() => {
        isCooldownRef.current = false;
        setLastScanned(null);
      }, 1500);
    }
  }, [existingImeis, continuous, onScanSuccess, onClose]);

  // Hardware / OCR Text Recognition Fallback
  const setupOcrFallback = () => {
    if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);

    ocrIntervalRef.current = setInterval(async () => {
      if (isCooldownRef.current) return;

      try {
        const videoElem = document.querySelector(`#${readerElementId} video`) as HTMLVideoElement;
        if (!videoElem || videoElem.readyState < 2) return;

        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['code_128', 'code_39', 'ean_13', 'upc_a', 'qr_code', 'data_matrix'],
            });
            const barcodes = await barcodeDetector.detect(videoElem);
            if (barcodes && barcodes.length > 0) {
              const detectedVal = barcodes[0].rawValue;
              if (detectedVal) {
                handleCodeDetected(detectedVal);
                return;
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }, 600);
  };

  const startScanner = async () => {
    try {
      setErrorMsg(null);
      setIsScanning(true);
      setLastScanned(null);
      setDuplicateWarning(null);

      scannedImeisSetRef.current = new Set(existingImeis.map((i) => i.toLowerCase().trim()));

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.ITF,
      ];

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const width = Math.floor(viewfinderWidth * 0.9);
        const height = Math.floor(Math.min(viewfinderHeight * 0.7, 240));
        return { width, height };
      };

      const config = {
        fps: 25,
        qrbox: qrboxFunction,
        aspectRatio: 1.777778,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        (errorMessage) => {}
      );

      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (e) {}

      setupOcrFallback();
    } catch (err: any) {
      console.error('Scanner start error:', err);
      setIsScanning(false);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền truy cập Camera trên trình duyệt để quét mã IMEI.'
          : 'Không thể mở Camera. Hãy kiểm tra kết nối thiết bị hoặc nhập mã IMEI bằng bàn phím.'
      );
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const newStatus = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newStatus } as any],
      });
      setTorchOn(newStatus);
    } catch (e) {
      console.error('Torch toggle failed:', e);
    }
  };

  const stopScanner = async () => {
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }

    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
        setTorchOn(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScanned(null);
      isCooldownRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">{title}</h3>
              <p className="text-[10px] text-slate-400">
                Chống trùng IMEI • Nhận diện Barcode 1D & QR 2D
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'}
                className={`p-2 rounded-xl transition ${
                  torchOn ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scanner Viewport */}
        <div className="p-4 sm:p-5 flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            <div id={readerElementId} className="w-full h-full object-cover" />
            
            {/* Dynamic Laser & Targeting Box */}
            {isScanning && !lastScanned && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-full h-36 border-2 border-cyan-400/80 rounded-2xl relative flex items-center justify-center shadow-glow-cyan">
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce" />
                  
                  <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-300" />
                  <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-300" />
                  <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-300" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-300" />
                  
                  <span className="text-[10px] font-black bg-slate-950/85 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/40 tracking-wide badge-nowrap">
                    Đưa Barcode / QR IMEI vào khung
                  </span>
                </div>
              </div>
            )}

            {/* Success Overlay */}
            {lastScanned && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-2 animate-in zoom-in">
                <CheckCircle className="w-12 h-12 text-cyan-400 animate-pulse" />
                <div className="text-sm font-black text-white">ĐÃ QUÉT IMEI THÀNH CÔNG!</div>
                <div className="font-mono text-sm bg-black/70 px-4 py-2 rounded-xl border border-cyan-400 text-cyan-200 font-black badge-nowrap">
                  {lastScanned}
                </div>
                {continuous && (
                  <div className="text-[10px] text-slate-400 font-bold">
                    Tạm dừng 1.5s chống quét trùng lặp...
                  </div>
                )}
              </div>
            )}

            {/* Duplicate Warning Toast */}
            {duplicateWarning && (
              <div className="absolute top-4 left-4 right-4 bg-amber-500/95 text-slate-950 font-black text-xs px-3 py-2 rounded-xl shadow-lg text-center animate-in slide-in-from-top border border-amber-300 badge-nowrap">
                ⚠️ {duplicateWarning}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-3 p-3.5 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-2xl text-xs flex items-start space-x-2.5 w-full">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="mt-4 flex items-center space-x-2 w-full">
            <button
              onClick={startScanner}
              className="flex-1 flex items-center justify-center space-x-1.5 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 transition active:scale-95 badge-nowrap"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Khởi động lại Camera</span>
            </button>
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="flex-1 py-3 bg-slate-950 hover:bg-black text-slate-400 hover:text-white rounded-xl text-xs font-bold border border-slate-800 transition badge-nowrap"
            >
              Đóng & Nhập Phím
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
