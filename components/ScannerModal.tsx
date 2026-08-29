'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, RefreshCw, Zap, ZapOff, CheckCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export default function ScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Quét mã Barcode / QR IMEI',
}: ScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'html5-barcode-reader';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScanned(null);
      return;
    }

    // Start scanner with a slight delay to ensure DOM is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setErrorMsg(null);
      setIsScanning(true);

      // Supported formats: QR Code + common 1D barcodes for IMEI & Serial
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.ITF,
      ];

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      // Responsive qrbox calculation: wide enough for 1D barcodes and tall enough for QR
      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const width = Math.floor(viewfinderWidth * 0.88);
        const height = Math.floor(Math.min(viewfinderHeight * 0.65, 220));
        return { width, height };
      };

      const config = {
        fps: 25, // Ultra-responsive frame scanning
        qrbox: qrboxFunction,
        aspectRatio: 1.777778,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Play sound and haptic vibration
          playSuccessFeedback();
          setLastScanned(decodedText.trim());

          setTimeout(() => {
            stopScanner();
            onScanSuccess(decodedText.trim());
            onClose();
          }, 300);
        },
        (errorMessage) => {
          // Frame errors during scan are ignored
        }
      );

      // Check if torch/flashlight is supported
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch (e) {}

    } catch (err: any) {
      console.error('Scanner start error:', err);
      setIsScanning(false);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền truy cập Camera trên trình duyệt để quét mã IMEI.'
          : 'Không thể mở Camera. Hãy kiểm tra kết nối thiết bị hoặc nhập mã IMEI trực tiếp bằng bàn phím.'
      );
    }
  };

  const playSuccessFeedback = () => {
    // 1. Audio Beep
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}

    // 2. Haptic Vibration
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}
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
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore stop error
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
        setTorchOn(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800/80 bg-gray-950">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-950/80 text-blue-400 rounded-xl border border-blue-800/50">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">{title}</h3>
              <p className="text-[10px] text-gray-400">Đọc siêu nhạy mã vạch 1D & QR Code 2D</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'}
                className={`p-2 rounded-xl transition ${
                  torchOn ? 'bg-amber-400 text-gray-950' : 'bg-gray-800 text-gray-300 hover:text-white'
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
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scanner View Area */}
        <div className="p-4 sm:p-5 flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-gray-800 flex items-center justify-center shadow-inner">
            <div id={readerElementId} className="w-full h-full object-cover" />
            
            {/* Dynamic Scanning Laser Animation */}
            {isScanning && !lastScanned && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-full h-36 border-2 border-emerald-400/70 rounded-2xl relative flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  {/* Laser bar moving */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce" />
                  
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />
                  
                  <span className="text-[10px] font-bold bg-gray-950/80 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Căn mã vạch / QR IMEI vào khung
                  </span>
                </div>
              </div>
            )}

            {/* Scan Success Overlay */}
            {lastScanned && (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-2 animate-in zoom-in">
                <CheckCircle className="w-12 h-12 text-emerald-400 animate-pulse" />
                <div className="text-sm font-black text-white">ĐÃ QUÉT THÀNH CÔNG!</div>
                <div className="font-mono text-xs bg-black/60 px-3 py-1.5 rounded-xl border border-emerald-400 text-emerald-200 font-bold">
                  {lastScanned}
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mt-3 p-3.5 bg-red-950/80 border border-red-800 text-red-200 rounded-2xl text-xs flex items-start space-x-2.5 w-full">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <div className="mt-4 flex items-center space-x-2 w-full">
            <button
              onClick={startScanner}
              className="flex-1 flex items-center justify-center space-x-1.5 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold border border-gray-800 transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <span>Khởi động lại Camera</span>
            </button>
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="flex-1 py-3 bg-gray-950 hover:bg-black text-gray-400 hover:text-white rounded-xl text-xs font-bold border border-gray-800 transition"
            >
              Đóng & Nhập Phím
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
