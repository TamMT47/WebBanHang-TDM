'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Calendar,
  Clock,
  Briefcase,
  DollarSign,
  Award,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  Sparkles,
  Info
} from 'lucide-react';
import { MonthlyPayrollItem } from '@/types/database';
import { formatVND } from '@/lib/format';

interface ProvisionalSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MonthlyPayrollItem | null;
  month: string;
  onSuccess: (msg?: string) => void;
}

export default function ProvisionalSalaryModal({
  isOpen,
  onClose,
  item,
  month,
  onSuccess,
}: ProvisionalSalaryModalProps) {
  if (!isOpen || !item) return null;

  const baseSalary = parseFloat(String(item.base_salary || 0));
  const contractType = item.contract_type || 'sales';
  const effectiveBaseSalary = contractType === 'probation' ? Math.round(baseSalary * 0.85) : baseSalary;
  const standardDays = parseInt(String(item.standard_days || 26), 10);
  const unitDailySalary = standardDays > 0 ? Math.round(effectiveBaseSalary / standardDays) : 0;
  const unitHourlyRate = unitDailySalary > 0 ? Math.round(unitDailySalary / 11.0) : 0;

  // Form states
  const [actualDays, setActualDays] = useState<number>(item.actual_days || 0);
  const [totalWorkHours, setTotalWorkHours] = useState<number>(
    typeof item.total_work_hours === 'number' && item.total_work_hours > 0
      ? item.total_work_hours
      : (item.actual_days || 0) * 11
  );
  const [shiftsCount, setShiftsCount] = useState<number>(
    typeof item.shifts_count === 'number' && item.shifts_count > 0
      ? item.shifts_count
      : Math.round(item.actual_days || 0)
  );
  const [otHours, setOtHours] = useState<number>(item.ot_hours || 0);
  const [personalCommission, setPersonalCommission] = useState<number>(item.personal_commission || 0);
  const [sharedCommission, setSharedCommission] = useState<number>(item.shared_commission || 0);
  const [allowances, setAllowances] = useState<Array<{ id: string; title: string; amount: number }>>(
    Array.isArray(item.allowances) ? [...item.allowances] : []
  );
  const [deductions, setDeductions] = useState<Array<{ id: string; reason: string; amount: number }>>(
    Array.isArray(item.deductions) ? [...item.deductions] : []
  );
  const [note, setNote] = useState<string>(item.note || item.adjustment_reason || '');

  // Add sub-item states
  const [newAllowanceTitle, setNewAllowanceTitle] = useState('');
  const [newAllowanceAmount, setNewAllowanceAmount] = useState<number | string>('');
  const [newDeductionReason, setNewDeductionReason] = useState('');
  const [newDeductionAmount, setNewDeductionAmount] = useState<number | string>('');

  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if item changes
  useEffect(() => {
    if (item) {
      setActualDays(item.actual_days || 0);
      setTotalWorkHours(
        typeof item.total_work_hours === 'number' && item.total_work_hours > 0
          ? item.total_work_hours
          : (item.actual_days || 0) * 11
      );
      setShiftsCount(
        typeof item.shifts_count === 'number' && item.shifts_count > 0
          ? item.shifts_count
          : Math.round(item.actual_days || 0)
      );
      setOtHours(item.ot_hours || 0);
      setPersonalCommission(item.personal_commission || 0);
      setSharedCommission(item.shared_commission || 0);
      setAllowances(Array.isArray(item.allowances) ? [...item.allowances] : []);
      setDeductions(Array.isArray(item.deductions) ? [...item.deductions] : []);
      setNote(item.note || item.adjustment_reason || '');
      setError(null);
    }
  }, [item]);

  // Live Calculations
  const calculatedSalaryByDays = Math.round(actualDays * unitDailySalary);
  const calculatedOtSalary = Math.round(otHours * unitHourlyRate * 1.5);
  const calculatedTotalAllowance = allowances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const calculatedTotalDeduction = deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const calculatedFinalSalary =
    calculatedSalaryByDays +
    calculatedOtSalary +
    sharedCommission +
    personalCommission +
    calculatedTotalAllowance -
    calculatedTotalDeduction;

  // Add Allowance handler
  const handleAddAllowance = () => {
    const amt = parseFloat(String(newAllowanceAmount)) || 0;
    if (!newAllowanceTitle.trim() || amt <= 0) {
      setError('Vui lòng nhập tên phụ cấp và số tiền > 0');
      return;
    }
    setAllowances([
      ...allowances,
      {
        id: Math.random().toString(36).substring(7),
        title: newAllowanceTitle.trim(),
        amount: amt,
      },
    ]);
    setNewAllowanceTitle('');
    setNewAllowanceAmount('');
    setError(null);
  };

  // Add Deduction handler
  const handleAddDeduction = () => {
    const amt = parseFloat(String(newDeductionAmount)) || 0;
    if (!newDeductionReason.trim() || amt <= 0) {
      setError('Vui lòng nhập lý do trừ phạt/tạm ứng và số tiền > 0');
      return;
    }
    setDeductions([
      ...deductions,
      {
        id: Math.random().toString(36).substring(7),
        reason: newDeductionReason.trim(),
        amount: amt,
      },
    ]);
    setNewDeductionReason('');
    setNewDeductionAmount('');
    setError(null);
  };

  // Save Provisional Draft
  const handleSaveProvisional = async () => {
    try {
      setSaving(true);
      setError(null);
      const adjustment = {
        actual_days: actualDays,
        total_work_hours: totalWorkHours,
        shifts_count: shiftsCount,
        ot_hours: otHours,
        personal_commission: personalCommission,
        shared_commission: sharedCommission,
        allowances,
        deductions,
        note: note.trim(),
      };

      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_provisional_adjustment',
          user_id: item.user_id,
          month,
          adjustment,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi lưu điều chỉnh tạm tính');

      onSuccess(data.message || 'Đã lưu điều chỉnh tạm tính thành công!');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset to original attendance calculation
  const handleResetProvisional = async () => {
    if (!confirm('Khôi phục lại dữ liệu chấm công gốc từ máy chấm công? Các điều chỉnh tạm tính của nhân viên này sẽ bị xóa.')) {
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_provisional_adjustment',
          user_id: item.user_id,
          month,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khôi phục');

      onSuccess(data.message || 'Đã hoàn tác về dữ liệu chấm công gốc!');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Confirm & Lock Payroll for this single employee
  const handleLockSinglePayroll = async () => {
    if (
      !confirm(
        `XÁC NHẬN & TẠO PHIẾU LƯƠNG CHÍNH THỨC:\n\nBạn có chắc chắn muốn chốt lương tháng ${month} cho nhân viên ${item.user_name} với số tiền thực lĩnh ${formatVND(
          calculatedFinalSalary
        )}?\n\nSau khi xác nhận, dữ liệu sẽ chuyển sang trạng thái "ĐÃ CHỐT LƯƠNG" và xuất phiếu lương chính thức cho nhân viên.`
      )
    ) {
      return;
    }

    try {
      setLocking(true);
      setError(null);

      const singleItemPayload = {
        ...item,
        actual_days: actualDays,
        total_work_hours: totalWorkHours,
        shifts_count: shiftsCount,
        ot_hours: otHours,
        salary_by_days: calculatedSalaryByDays,
        ot_salary: calculatedOtSalary,
        shared_commission: sharedCommission,
        personal_commission: personalCommission,
        allowances,
        deductions,
        total_allowance: calculatedTotalAllowance,
        total_deduction: calculatedTotalDeduction,
        final_salary: calculatedFinalSalary,
        note: note.trim(),
        status: 'pending',
      };

      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          singleItem: singleItemPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi chốt lương nhân viên');

      onSuccess(data.message || `Đã chốt lương và tạo phiếu lương cho ${item.user_name} thành công!`);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto text-xs flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-glow-cyan">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black uppercase tracking-wide">Điều Chỉnh Công & Lương Tạm Tính</h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-black uppercase">
                  ⏳ TẠM TÍNH
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Nhân viên: <b className="text-white">{item.user_name}</b> ({item.user_role}) • Tháng {month}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee General Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">LƯƠNG CƠ BẢN</span>
              <span className="font-sans font-bold text-white text-xs">{formatVND(baseSalary)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">HỢP ĐỒNG</span>
              <span className="font-bold text-amber-300 text-xs capitalize">
                {contractType === 'probation' ? 'Thử việc (85%)' : contractType}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">CÔNG CHUẨN</span>
              <span className="font-sans font-bold text-slate-200 text-xs">{standardDays} ngày</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">ĐƠN GIÁ CÔNG</span>
              <span className="font-sans font-bold text-cyan-300 text-xs">{formatVND(unitDailySalary)}/ngày</span>
            </div>
          </div>

          {/* Section 1: Ngày công, Giờ làm & Ca trực */}
          <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2 text-cyan-300 font-black uppercase text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>1. Chấm Công & Thời Gian Làm Việc Thực Tế</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Số ngày công thực tế:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="31"
                    value={actualDays}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setActualDays(val);
                      // Suggest total work hours = days * 11
                      setTotalWorkHours(Math.round(val * 11 * 10) / 10);
                      setShiftsCount(Math.round(val));
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">công</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Lương công: <b className="text-white">{formatVND(calculatedSalaryByDays)}</b>
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Tổng giờ làm việc:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={totalWorkHours}
                    onChange={(e) => setTotalWorkHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">giờ</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Chuẩn 11h/ngày
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Số ca đã trực:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={shiftsCount}
                    onChange={(e) => setShiftsCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">ca</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Ca sáng / Chiều / Full
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Tăng ca OT (sau 21h):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={otHours}
                    onChange={(e) => setOtHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">giờ</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  +{formatVND(calculatedOtSalary)} (x150%)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Hoa Hồng Bán Hàng & Thưởng KPI */}
          <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-2 text-emerald-400 font-black uppercase text-[11px]">
              <Award className="w-3.5 h-3.5" />
              <span>2. Thưởng KPI & Hoa Hồng Doanh Số</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Thưởng KPI / Hoa hồng cá nhân:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={personalCommission}
                    onChange={(e) => setPersonalCommission(parseFloat(e.target.value) || 0)}
                    placeholder="VD: 500000"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">đ</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Đã bán: <b className="text-white">{item.main_devices_count || 0}</b> máy chính
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-bold block mb-1">
                  Hoa hồng chia đều nhóm:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={sharedCommission}
                    onChange={(e) => setSharedCommission(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">đ</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Mức mặc định: {formatVND(item.shared_commission || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Phụ Cấp & Trừ Phạt / Tạm Ứng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Phụ cấp / Thưởng */}
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-emerald-400 font-black text-[11px] uppercase">
                <span>3. Phụ Cấp & Thưởng Khác</span>
                <span>+{formatVND(calculatedTotalAllowance)}</span>
              </div>

              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {allowances.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">Chưa có khoản phụ cấp nào</p>
                ) : (
                  allowances.map((al) => (
                    <div
                      key={al.id}
                      className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-300 font-semibold">{al.title}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-emerald-400 font-bold">+{formatVND(al.amount)}</span>
                        <button
                          type="button"
                          onClick={() => setAllowances(allowances.filter((a) => a.id !== al.id))}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add allowance input */}
              <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800/80">
                <input
                  type="text"
                  placeholder="Tên khoản thưởng/phụ cấp"
                  value={newAllowanceTitle}
                  onChange={(e) => setNewAllowanceTitle(e.target.value)}
                  className="w-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-white focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Số tiền"
                  value={newAllowanceAmount}
                  onChange={(e) => setNewAllowanceAmount(e.target.value)}
                  className="w-1/3 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-emerald-300 text-right focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddAllowance}
                  className="p-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30"
                  title="Thêm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Trừ phạt / Tạm ứng */}
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-rose-400 font-black text-[11px] uppercase">
                <span>4. Trừ Phạt & Tạm Ứng</span>
                <span>-{formatVND(calculatedTotalDeduction)}</span>
              </div>

              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {deductions.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">Không có khoản trừ nào</p>
                ) : (
                  deductions.map((de) => (
                    <div
                      key={de.id}
                      className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-300 font-semibold">{de.reason}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-rose-400 font-bold">-{formatVND(de.amount)}</span>
                        <button
                          type="button"
                          onClick={() => setDeductions(deductions.filter((d) => d.id !== de.id))}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add deduction input */}
              <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800/80">
                <input
                  type="text"
                  placeholder="Lý do trừ/tạm ứng"
                  value={newDeductionReason}
                  onChange={(e) => setNewDeductionReason(e.target.value)}
                  className="w-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-white focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Số tiền"
                  value={newDeductionAmount}
                  onChange={(e) => setNewDeductionAmount(e.target.value)}
                  className="w-1/3 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-rose-300 text-right focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddDeduction}
                  className="p-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg hover:bg-rose-500/30"
                  title="Thêm"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Section 4: Ghi chú lý do điều chỉnh */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
            <label className="text-[11px] text-slate-300 font-bold flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ghi chú lý do điều chỉnh (được lưu và hiển thị trên phiếu lương):</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Bù 1 ca trực ngày 12/10 do lỗi máy chấm công; Thưởng KPI bán xuất sắc 5 iPhone 16 Pro Max..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Summary Preview Banner */}
          <div className="p-3.5 bg-gradient-to-r from-cyan-950/70 via-blue-950/70 to-slate-900 rounded-2xl border border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-cyan-300 uppercase font-black block tracking-wider">
                LƯƠNG TẠM TÍNH THỰC LĨNH SAU ĐIỀU CHỈNH
              </span>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Lương công: <b className="text-white">{formatVND(calculatedSalaryByDays)}</b> + OT: <b className="text-amber-300">{formatVND(calculatedOtSalary)}</b> + Thưởng/HH: <b className="text-emerald-400">{formatVND(personalCommission + sharedCommission + calculatedTotalAllowance)}</b> - Trừ: <b className="text-rose-400">{formatVND(calculatedTotalDeduction)}</b>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-semibold">TỔNG TẠM TÍNH:</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-300 font-sans tracking-tight">
                {formatVND(calculatedFinalSalary)}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleResetProvisional}
            disabled={saving || locking}
            className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi Phục Gốc</span>
          </button>

          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || locking}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition text-xs"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSaveProvisional}
              disabled={saving || locking}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Tạm Tính'}</span>
            </button>

            <button
              type="button"
              onClick={handleLockSinglePayroll}
              disabled={saving || locking}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{locking ? 'Đang chốt...' : 'Xác Nhận & Tạo Phiếu Lương'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
