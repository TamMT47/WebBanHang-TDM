'use client';

import React from 'react';
import {
  Printer,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Zap,
  FileText,
  Layers,
  Laptop
} from 'lucide-react';
import PrinterConfigCard from '@/components/PrinterConfigCard';

interface PrinterSettingsViewProps {
  user: any;
}

export default function PrinterSettingsView({ user }: PrinterSettingsViewProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header Banner */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan flex-shrink-0">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Cài Đặt Mẫu In & Máy In Hóa Đơn (Chuẩn KiotViet)
              </h2>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black rounded-lg badge-nowrap">
                Native Browser Print
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tùy chỉnh thông tin cửa hàng, Logo, mã VietQR và xuất hóa đơn nhiệt K80 chuẩn xác qua Hộp thoại in trình duyệt (window.print).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          <div className="px-3.5 py-2 bg-slate-950 rounded-2xl border border-slate-800 flex items-center space-x-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-emerald"></span>
            <span className="text-slate-300 font-bold">Khổ K80 (80mm)</span>
          </div>
        </div>
      </div>

      {/* 3 Step Quick Setup Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/90 space-y-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center">
              1
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Kết Nối Máy In Nhiệt
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Cắm máy in hóa đơn (Xprinter, Epson, Citizen...) vào máy tính hoặc mạng LAN và cài đặt Driver máy in trên hệ điều hành.
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/90 space-y-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
              2
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Cấu Hình Mẫu In K80
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Nhập tên Shop, Logo, Hotline, Số tài khoản ngân hàng (tự tạo mã VietQR chuyển khoản) và điều khoản bảo hành bên dưới.
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/90 space-y-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500 text-slate-950 font-black text-xs flex items-center justify-center">
              3
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Xem Trước & In Thử
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Bấm <strong className="text-cyan-300">[In Thử Nghiệm K80]</strong> để xem trước mẫu bill và mở Hộp thoại in mặc định của trình duyệt.
          </p>
        </div>
      </div>

      {/* Main Printer Config Card */}
      <div className="space-y-4">
        <PrinterConfigCard user={user} />
      </div>

      {/* Tips & Recommendations */}
      <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide">
            Mẹo In Chuẩn KiotViet Trên Trình Duyệt Chrome / Safari
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Khổ Giấy & Lề Trang:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Trong hộp thoại in của trình duyệt, chọn khổ giấy <strong className="text-cyan-300 font-mono">80mm (hoặc 80 x 297mm)</strong>, mục Lề (Margins) chọn <strong className="text-white font-bold">Không có (None)</strong> hoặc <strong className="text-white font-bold">Tối thiểu (Minimum)</strong>.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tùy Chọn Đồ Họa Nền:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Tích chọn mục <strong className="text-emerald-300 font-bold">Đồ họa nền (Background graphics)</strong> và bỏ chọn <strong className="text-slate-300 font-bold">Tiêu đề và chân trang (Headers and footers)</strong> để hóa đơn sắc nét và không in kèm URL trang web.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

