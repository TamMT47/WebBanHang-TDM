'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'html5-barcode-reader';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Start scanner with a slight delay to ensure DOM is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setErrorMsg(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.777778,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Beep audio effect if supported
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch (e) {}

          stopScanner();
          onScanSuccess(decodedText.trim());
          onClose();
        },
        (errorMessage) => {
          // ignore scan frame errors
        }
      );
    } catch (err: any) {
      console.error('Scanner start error:', err);
      setIsScanning(false);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền truy cập Camera để quét mã IMEI.'
          : 'Không thể mở Camera. Bạn có thể nhập mã IMEI trực tiếp bằng bàn phím.'
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // ignore stop error
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner View Area */}
        <div className="p-4 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center">
            <div id={readerElementId} className="w-full h-full" />
            
            {/* Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-blue-400/60 rounded-xl m-4 animate-pulse flex items-center justify-center">
              <span className="text-[11px] font-semibold bg-black/60 px-3 py-1 rounded-full text-blue-200">
                Đưa mã vạch hoặc QR IMEI vào khung
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-start space-x-2 w-full">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-4 flex items-center space-x-2 w-full">
            <button
              onClick={startScanner}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử lại Camera</span>
            </button>
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="flex-1 py-2.5 bg-gray-950 hover:bg-gray-900 text-gray-300 rounded-xl text-xs font-semibold border border-gray-800 transition"
            >
              Đóng & Nhập tay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
