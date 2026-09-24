'use client';

import React from 'react';
import {
  Printer,
  Laptop,
  Usb,
  Wifi,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import PrinterConfigCard from '@/components/PrinterConfigCard';
import PrintAgentWorker from '@/components/PrintAgentWorker';

interface PrinterSettingsViewProps {
  user: any;
}

export default function PrinterSettingsView({ user }: PrinterSettingsViewProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Background Print Agent Worker & Queue Live Monitor */}
      <PrintAgentWorker user={user} showQueueList={true} />
      
      {/* Top Header Banner */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan flex-shrink-0">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Cài Đặt Máy In Hóa Đơn (QZ Tray USB Print Server)
              </h2>
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black rounded-lg badge-nowrap">
                Trang Riêng Biệt
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Quản lý máy chủ in hóa đơn trên MacBook qua cổng USB, in ẩn siêu tốc và không cần xác nhận AirPrint trên iPhone/iPad.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          <div className="px-3.5 py-2 bg-slate-950 rounded-2xl border border-slate-800 flex items-center space-x-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-emerald"></span>
            <span className="text-slate-300 font-bold">Xprinter USB Printer P</span>
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
              Kết Nối Cáp USB & Nguồn
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Cắm cáp USB máy in Xprinter trực tiếp vào máy chủ MacBook. Bật công tắc nguồn máy in và lắp cuộn giấy nhiệt K80.
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/90 space-y-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
              2
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Khởi Động Ứng Dụng QZ Tray
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Chạy ứng dụng <strong className="text-emerald-300 font-mono">QZ Tray</strong> trên MacBook (icon màu xanh lá xuất hiện trên thanh menu trên cùng).
          </p>
        </div>

        <div className="p-4 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800/90 space-y-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500 text-slate-950 font-black text-xs flex items-center justify-center">
              3
            </span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Quét Tìm & In Thử Nghiệm
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Bấm <strong className="text-cyan-300">[Quét Tìm Máy In USB]</strong> để tự động nhận <strong className="text-white">Xprinter USB Printer P</strong>, sau đó bấm <strong className="text-emerald-400">[In Thử Nghiệm K80]</strong>.
          </p>
        </div>
      </div>

      {/* Main Printer Config Card */}
      <div className="space-y-4">
        <PrinterConfigCard user={user} />
      </div>

      {/* Troubleshooting & Tips */}
      <div className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide">
            Lưu Ý Khi In Từ Điện Thoại (iPhone / iPad / Android Trong Mạng Wi-Fi Shop)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cùng Mạng Wi-Fi Nội Bộ (mDNS / IP):</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Điện thoại của nhân viên thu ngân và MacBook Host cần kết nối chung mạng Wi-Fi tại cửa hàng. Nên dùng tên miền mDNS <strong className="font-mono text-cyan-300">MacBook-Air-cua-Truong.local</strong> và cổng <strong className="font-mono text-emerald-400">8181</strong> để không bị ảnh hưởng khi Router đổi IP.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>In Ẩn Hoàn Toàn (Direct Silent Print):</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Khi nhấn nút in trên POS hoặc Hóa đơn, hệ thống sẽ gửi lệnh in trực tiếp qua WebSocket đến máy chủ MacBook, máy in lập tức nhả bill và tự động cắt giấy mà không hiển thị bất kỳ cửa sổ popup nào.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
