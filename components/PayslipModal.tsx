'use client';

import React from 'react';
import {
  FileText,
  Printer,
  X,
  User,
  Shield,
  Clock,
  Calendar,
  DollarSign,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatVND } from '@/lib/format';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  month?: string;
}

export default function PayslipModal({ isOpen, onClose, record, month }: PayslipModalProps) {
  if (!isOpen || !record) return null;

  const currentMonth = record.month || month || new Date().toISOString().slice(0, 7);
  const baseSalary = parseFloat(record.base_salary || 0);
  const standardDays = parseInt(record.standard_days || 26, 10);
  const actualDays = parseFloat(record.actual_days || 0);
  const otHours = parseFloat(record.ot_hours || 0);
  const salaryByDays = parseFloat(record.salary_by_days || 0);
  const otSalary = parseFloat(record.ot_salary || 0);
  const totalAllowance = parseFloat(record.total_allowance || 0);
  const totalDeduction = parseFloat(record.total_deduction || 0);
  const finalSalary = parseFloat(record.final_salary || 0);
  const isPaid = record.status === 'paid';

  const allowances = Array.isArray(record.allowances) ? record.allowances : [];
  const deductions = Array.isArray(record.deductions) ? record.deductions : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-auto text-xs">
        
        {/* Modal Top Bar */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-glow-cyan">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase">Phiếu Lương Nhân Viên</h3>
              <div className="text-[11px] text-slate-400">Tháng: {currentMonth}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Phiếu</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto print:p-8 print:max-h-none">
          
          {/* Header Store Info */}
          <div className="text-center pb-4 border-b border-slate-800 space-y-1">
            <div className="text-base font-black text-white uppercase tracking-wider">
              TD MOBILE STORE
            </div>
            <div className="text-xs text-slate-400">
              Chuyên iPhone - iPad - Macbook - Apple Watch Chính Hãng
            </div>
            <div className="pt-2 text-sm font-black text-cyan-400 uppercase">
              PHIẾU THANH TOÁN LƯƠNG THÁNG {currentMonth}
            </div>
          </div>

          {/* Employee Meta */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Nhân Viên</span>
              <span className="font-bold text-white text-xs">{record.user_name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Chức Vụ / Vai Trò</span>
              <span className="font-bold text-cyan-300 uppercase text-xs">
                {record.user_role === 'admin' ? 'Quản Trị Viên' : record.user_role === 'owner' ? 'Chủ Cửa Hàng' : record.user_role === 'manager' ? 'Quản Lý' : 'Nhân Viên Bán Hàng'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Lương Cơ Bản</span>
              <span className="font-sans font-bold text-white text-xs">{formatVND(baseSalary)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Trạng Thái</span>
              <span className={`font-bold text-xs ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isPaid ? '✓ Đã Thanh Toán' : '⏳ Chờ Thanh Toán'}
              </span>
            </div>
          </div>

          {/* Detailed Calculations */}
          <div className="space-y-2">
            <div className="font-bold text-slate-300 uppercase text-[11px]">1. Chi Tiết Lương & Giờ Làm:</div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  • Lương ngày công ({actualDays} / {standardDays} ngày chuẩn):
                </span>
                <span className="font-sans font-bold text-white">{formatVND(salaryByDays)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  • Lương Tăng ca OT ({otHours} giờ x 150% lương giờ):
                </span>
                <span className="font-sans font-bold text-emerald-400">+{formatVND(otSalary)}</span>
              </div>
            </div>
          </div>

          {/* Allowances / Bonuses */}
          <div className="space-y-2">
            <div className="font-bold text-slate-300 uppercase text-[11px] flex items-center justify-between">
              <span>2. Phụ Cấp, Thưởng & Hoa Hồng:</span>
              <span className="text-emerald-400 font-sans font-bold">+{formatVND(totalAllowance)}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
              {allowances.length === 0 ? (
                <div className="text-slate-500 text-[11px] italic">Không có khoản thưởng phát sinh</div>
              ) : (
                allowances.map((al: any, idx: number) => (
                  <div key={al.id || idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">• {al.title}</span>
                    <span className="font-sans font-bold text-emerald-400">+{formatVND(al.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Deductions / Penalties */}
          <div className="space-y-2">
            <div className="font-bold text-slate-300 uppercase text-[11px] flex items-center justify-between">
              <span>3. Các Khoản Giảm Trừ, Phạt & Tạm Ứng:</span>
              <span className="text-rose-400 font-sans font-bold">-{formatVND(totalDeduction)}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
              {deductions.length === 0 ? (
                <div className="text-slate-500 text-[11px] italic">Không có khoản giảm trừ</div>
              ) : (
                deductions.map((de: any, idx: number) => (
                  <div key={de.id || idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">• {de.reason}</span>
                    <span className="font-sans font-bold text-rose-400">-{formatVND(de.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Total Net Pay */}
          <div className="p-4 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 rounded-2xl border border-cyan-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cyan-300 uppercase font-bold block">
                TỔNG THỰC LĨNH (NET PAY)
              </span>
              <span className="text-[10px] text-slate-400">
                (Lương công + Lương OT + Thưởng - Trừ)
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 font-sans tracking-tight">
              {formatVND(finalSalary)}
            </div>
          </div>

          {/* Signature block */}
          <div className="grid grid-cols-2 gap-4 pt-6 text-center text-xs text-slate-400">
            <div>
              <div className="font-bold text-slate-200">Người Lập Bảng</div>
              <div className="text-[10px] text-slate-500 mt-12">(Ký & ghi rõ họ tên)</div>
            </div>
            <div>
              <div className="font-bold text-slate-200">Nhân Viên Nhận Lương</div>
              <div className="text-[10px] text-slate-500 mt-12">(Ký & ghi rõ họ tên)</div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
