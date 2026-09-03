'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Sparkles,
  Users,
  Clock,
  Eye,
  ArrowUpDown,
  Download,
  Check,
  RotateCw,
  Gift,
  AlertCircle
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { MonthlyPayrollItem, SalaryHistoryRecord } from '@/types/database';
import PayslipModal from '@/components/PayslipModal';
import { exportPayrollToCSV } from '@/lib/exportHelper';

interface PayrollViewProps {
  user: any;
}

export default function PayrollView({ user }: PayrollViewProps) {
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);
  const isManagerOrAbove = user && ['admin', 'owner', 'manager'].includes(user.role);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [loading, setLoading] = useState(true);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Payroll State
  const [payrollItems, setPayrollItems] = useState<MonthlyPayrollItem[]>([]);

  // Archived Salary History State
  const [archiveRecords, setArchiveRecords] = useState<SalaryHistoryRecord[]>([]);
  const [archiveMonthFilter, setArchiveMonthFilter] = useState<string>(currentMonthStr);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<string>('all');
  const [availableArchiveMonths, setAvailableArchiveMonths] = useState<string[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Payslip Modal State
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState<any>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  // Edit Base Salary Modal State
  const [isBaseSalaryModalOpen, setIsBaseSalaryModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [newBaseSalary, setNewBaseSalary] = useState<number>(0);

  // Add Allowance / Bonus Modal State
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);
  const [targetUserIndex, setTargetUserIndex] = useState<number>(-1);
  const [allowanceTitle, setAllowanceTitle] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState<number>(0);

  // Add Deduction / Penalty Modal State
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [deductionReason, setDeductionReason] = useState('');
  const [deductionAmount, setDeductionAmount] = useState<number>(0);

  // 1. Fetch live payroll computation for selected month
  const fetchLivePayroll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?month=${selectedMonth}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải bảng tính lương');
      setPayrollItems(data.payroll || []);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch archived salary history
  const fetchArchiveHistory = async () => {
    try {
      setArchiveLoading(true);
      const params = new URLSearchParams();
      if (archiveMonthFilter !== 'all') params.append('month', archiveMonthFilter);
      if (archiveStatusFilter !== 'all') params.append('status', archiveStatusFilter);
      if (archiveSearch.trim()) params.append('search', archiveSearch.trim());

      const res = await fetch(`/api/salary-history?${params.toString()}`);
      const data = await res.json();
      setArchiveRecords(data.records || []);
      if (data.availableMonths) {
        setAvailableArchiveMonths(data.availableMonths);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePayroll();
  }, [selectedMonth]);

  useEffect(() => {
    fetchArchiveHistory();
  }, [archiveMonthFilter, archiveStatusFilter, archiveSearch]);

  // Recalculate row totals whenever base salary, actual days, OT, allowances, deductions change
  const handleUpdateItemValue = (index: number, field: keyof MonthlyPayrollItem, value: any) => {
    const updated = [...payrollItems];
    const item = { ...updated[index], [field]: value };

    const baseSalary = parseFloat(item.base_salary as any) || 0;
    const standardDays = parseInt(item.standard_days as any) || 26;
    const actualDays = parseFloat(item.actual_days as any) || 0;
    const otHours = parseFloat(item.ot_hours as any) || 0;

    // Formula:
    // Lương ngày công = (base_salary / 26) * actual_days
    // Lương OT 150% = (base_salary / 26 / 8) * ot_hours * 1.5
    item.salary_by_days = Math.round(((baseSalary / standardDays) * actualDays) + Number.EPSILON);
    item.ot_salary = Math.round((((baseSalary / standardDays / 8) * otHours * 1.5) + Number.EPSILON));

    const totalAllowance = (item.allowances || []).reduce((sum, al) => sum + (parseFloat(al.amount as any) || 0), 0);
    const totalDeduction = (item.deductions || []).reduce((sum, de) => sum + (parseFloat(de.amount as any) || 0), 0);

    item.total_allowance = totalAllowance;
    item.total_deduction = totalDeduction;
    item.final_salary = Math.max(0, item.salary_by_days + item.ot_salary + totalAllowance - totalDeduction);

    updated[index] = item;
    setPayrollItems(updated);
  };

  // Add Allowance Item
  const handleAddAllowanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUserIndex < 0 || !allowanceTitle.trim() || allowanceAmount <= 0) return;

    const updated = [...payrollItems];
    const item = { ...updated[targetUserIndex] };
    const newAllowance = {
      id: Math.random().toString(36).substring(7),
      title: allowanceTitle.trim(),
      amount: allowanceAmount,
    };
    item.allowances = [...(item.allowances || []), newAllowance];
    updated[targetUserIndex] = item;
    setPayrollItems(updated);

    // Recalculate
    handleUpdateItemValue(targetUserIndex, 'allowances', item.allowances);

    setIsAllowanceModalOpen(false);
    setAllowanceTitle('');
    setAllowanceAmount(0);
    setTargetUserIndex(-1);
  };

  // Add Deduction Item
  const handleAddDeductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetUserIndex < 0 || !deductionReason.trim() || deductionAmount <= 0) return;

    const updated = [...payrollItems];
    const item = { ...updated[targetUserIndex] };
    const newDeduction = {
      id: Math.random().toString(36).substring(7),
      reason: deductionReason.trim(),
      amount: deductionAmount,
    };
    item.deductions = [...(item.deductions || []), newDeduction];
    updated[targetUserIndex] = item;
    setPayrollItems(updated);

    // Recalculate
    handleUpdateItemValue(targetUserIndex, 'deductions', item.deductions);

    setIsDeductionModalOpen(false);
    setDeductionReason('');
    setDeductionAmount(0);
    setTargetUserIndex(-1);
  };

  // Remove allowance / deduction item
  const handleRemoveAllowance = (userIndex: number, itemId: string) => {
    const updated = [...payrollItems];
    const item = { ...updated[userIndex] };
    item.allowances = item.allowances.filter((a) => a.id !== itemId);
    updated[userIndex] = item;
    setPayrollItems(updated);
    handleUpdateItemValue(userIndex, 'allowances', item.allowances);
  };

  const handleRemoveDeduction = (userIndex: number, itemId: string) => {
    const updated = [...payrollItems];
    const item = { ...updated[userIndex] };
    item.deductions = item.deductions.filter((d) => d.id !== itemId);
    updated[userIndex] = item;
    setPayrollItems(updated);
    handleUpdateItemValue(userIndex, 'deductions', item.deductions);
  };

  // Save / Update Base Salary for a User
  const handleSaveBaseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_base_salary',
          user_id: editingUserId,
          base_salary: newBaseSalary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật lương cơ bản');

      setMessage({ type: 'success', text: `Đã cập nhật lương cơ bản cho nhân viên ${editingUserName}!` });
      setIsBaseSalaryModalOpen(false);
      fetchLivePayroll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Lock & Freeze Monthly Payroll
  const handleLockMonthlyPayroll = async () => {
    if (!confirm(`Bạn có chắc chắn muốn CHỐT & LƯU BẢNG LƯƠNG tháng ${selectedMonth} không? Dữ liệu sẽ được đóng băng vào kho lưu trữ.`)) {
      return;
    }

    try {
      setSavingPayroll(true);
      setMessage(null);
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          payrollItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi lưu bảng lương');

      setMessage({ type: 'success', text: data.message });
      fetchLivePayroll();
      fetchArchiveHistory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingPayroll(false);
    }
  };

  // Toggle Payment Status on Archive Record
  const handleToggleArchiveStatus = async (record: SalaryHistoryRecord) => {
    const nextStatus = record.status === 'paid' ? 'pending' : 'paid';
    try {
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          salary_id: record.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi đổi trạng thái');

      fetchArchiveHistory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete / Re-open an Archived Month
  const handleDeleteArchiveMonth = async (month: string) => {
    if (!confirm(`Bạn có chắc chắn muốn XÓA BẢNG LƯƠNG LƯU TRỮ tháng ${month} để mở lại cho phép chỉnh sửa không?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/salary-history?month=${month}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa bảng lương lưu trữ');

      setMessage({ type: 'success', text: data.message });
      fetchLivePayroll();
      fetchArchiveHistory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export to Excel
  const handleExportLivePayroll = () => {
    exportPayrollToCSV(payrollItems, selectedMonth);
  };

  const handleExportArchivePayroll = () => {
    exportPayrollToCSV(archiveRecords, archiveMonthFilter);
  };

  // Totals calculations
  const totalPayrollLive = payrollItems.reduce((sum, item) => sum + item.final_salary, 0);
  const totalSalaryByDays = payrollItems.reduce((sum, item) => sum + item.salary_by_days, 0);
  const totalOtSalary = payrollItems.reduce((sum, item) => sum + item.ot_salary, 0);
  const totalAllowances = payrollItems.reduce((sum, item) => sum + item.total_allowance, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Bảng Tính Lương Tự Động & Quản Lý Lương
            </h2>
            <p className="text-xs text-slate-400">
              Tự động tính lương theo 26 ngày công chuẩn, giờ tăng ca OT 150%, phụ cấp thưởng phạt và lưu trữ cố định.
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400">Tháng:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none font-mono"
            />
          </div>

          <button
            onClick={handleExportLivePayroll}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 badge-nowrap shadow-sm"
            title="Xuất file Excel bảng lương tháng này"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
            Tổng Thực Lĩnh Tháng {selectedMonth}
          </div>
          <div className="text-sm sm:text-lg font-black text-cyan-300 font-sans tracking-tight">
            {formatVND(totalPayrollLive)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Dành cho {payrollItems.length} nhân viên
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
            Lương Theo Ngày Công
          </div>
          <div className="text-sm sm:text-lg font-black text-white font-sans tracking-tight">
            {formatVND(totalSalaryByDays)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Chuẩn 26 ngày công</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
            Lương Tăng Ca (OT 150%)
          </div>
          <div className="text-sm sm:text-lg font-black text-amber-300 font-sans tracking-tight">
            +{formatVND(totalOtSalary)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Hệ số 1.5 lương giờ</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">
            Tổng Thưởng / Phụ Cấp
          </div>
          <div className="text-sm sm:text-lg font-black text-emerald-400 font-sans tracking-tight">
            +{formatVND(totalAllowances)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Hoa hồng & Trợ cấp</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: LIVE PAYROLL CALCULATION & ADJUSTMENTS */}
      {/* ======================================================== */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-black text-white uppercase flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>1. Bảng Tính Lương Tự Động & Điều Chỉnh (Tháng {selectedMonth})</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dữ liệu ngày công & OT được tự động liên kết từ Module Chấm công. Admin có thể chỉnh sửa trực tiếp hoặc bổ sung thưởng / phạt.
            </p>
          </div>

          {isAdminOrOwner && (
            <button
              type="button"
              onClick={handleLockMonthlyPayroll}
              disabled={savingPayroll}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-glow-cyan transition flex items-center space-x-1.5 self-start sm:self-auto active:scale-95 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPayroll ? 'Đang lưu...' : `Chốt & Lưu Bảng Lương Tháng ${selectedMonth}`}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">
            Đang tính toán bảng lương tháng {selectedMonth}...
          </div>
        ) : payrollItems.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            Chưa có nhân viên nào trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-3">Nhân Viên</th>
                  <th className="px-3.5 py-3">Lương Cơ Bản</th>
                  <th className="px-3.5 py-3">Công Thực Tế / 26</th>
                  <th className="px-3.5 py-3">Lương Ngày Công</th>
                  <th className="px-3.5 py-3">Giờ OT (150%)</th>
                  <th className="px-3.5 py-3">Lương OT</th>
                  <th className="px-3.5 py-3">Thưởng / Phụ Cấp</th>
                  <th className="px-3.5 py-3">Khoản Trừ</th>
                  <th className="px-3.5 py-3">TỔNG THỰC LĨNH</th>
                  <th className="px-3.5 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {payrollItems.map((item, idx) => (
                  <tr key={item.user_id} className="hover:bg-slate-800/50 transition">
                    
                    {/* User Info */}
                    <td className="px-3.5 py-3">
                      <div className="font-bold text-white text-xs">{item.user_name}</div>
                      <div className="text-[10px] text-cyan-300 uppercase font-semibold">
                        {item.user_role === 'admin' ? 'Admin' : item.user_role === 'owner' ? 'Chủ Shop' : item.user_role === 'manager' ? 'Quản Lý' : 'Nhân Viên'}
                      </div>
                    </td>

                    {/* Base Salary (Editable) */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center space-x-1">
                        <span className="font-sans font-bold text-slate-200">
                          {formatVND(item.base_salary)}
                        </span>
                        {isAdminOrOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(item.user_id);
                              setEditingUserName(item.user_name);
                              setNewBaseSalary(item.base_salary);
                              setIsBaseSalaryModalOpen(true);
                            }}
                            title="Sửa mức lương cơ bản"
                            className="p-1 text-slate-500 hover:text-cyan-300 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Actual Days / 26 (Editable input) */}
                    <td className="px-3.5 py-3">
                      {isAdminOrOwner ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.5"
                            value={item.actual_days}
                            onChange={(e) => handleUpdateItemValue(idx, 'actual_days', parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white text-center focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-slate-500 text-[11px]">/ 26</span>
                        </div>
                      ) : (
                        <span className="font-bold text-white font-sans">{item.actual_days} / 26 ngày</span>
                      )}
                    </td>

                    {/* Salary by Days */}
                    <td className="px-3.5 py-3 font-sans font-bold text-white">
                      {formatVND(item.salary_by_days)}
                    </td>

                    {/* OT Hours (Editable input) */}
                    <td className="px-3.5 py-3">
                      {isAdminOrOwner ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.5"
                            value={item.ot_hours}
                            onChange={(e) => handleUpdateItemValue(idx, 'ot_hours', parseFloat(e.target.value) || 0)}
                            className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-amber-300 text-center focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-amber-400 text-[10px] font-bold">h (150%)</span>
                        </div>
                      ) : (
                        <span className="font-bold text-amber-400 font-sans">{item.ot_hours} giờ</span>
                      )}
                    </td>

                    {/* OT Salary */}
                    <td className="px-3.5 py-3 font-sans font-bold text-amber-300">
                      +{formatVND(item.ot_salary)}
                    </td>

                    {/* Allowances & Bonuses */}
                    <td className="px-3.5 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className="font-sans font-bold text-emerald-400">
                            +{formatVND(item.total_allowance)}
                          </span>
                          {isAdminOrOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetUserIndex(idx);
                                setIsAllowanceModalOpen(true);
                              }}
                              className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-md transition"
                              title="+ Thêm Phụ cấp / Thưởng / Hoa hồng"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {/* List small badges */}
                        {item.allowances?.map((al) => (
                          <div key={al.id} className="flex items-center justify-between text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                            <span>{al.title}: +{formatVND(al.amount)}</span>
                            {isAdminOrOwner && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAllowance(idx, al.id)}
                                className="text-slate-500 hover:text-rose-400 ml-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Deductions & Penalties */}
                    <td className="px-3.5 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className="font-sans font-bold text-rose-400">
                            -{formatVND(item.total_deduction)}
                          </span>
                          {isAdminOrOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetUserIndex(idx);
                                setIsDeductionModalOpen(true);
                              }}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-md transition"
                              title="+ Thêm Khoản trừ / Phạt / Tạm ứng"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {/* List small badges */}
                        {item.deductions?.map((de) => (
                          <div key={de.id} className="flex items-center justify-between text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                            <span>{de.reason}: -{formatVND(de.amount)}</span>
                            {isAdminOrOwner && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDeduction(idx, de.id)}
                                className="text-slate-500 hover:text-rose-400 ml-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Final Net Pay */}
                    <td className="px-3.5 py-3 font-sans font-black text-sm text-cyan-300 tracking-tight badge-nowrap">
                      {formatVND(item.final_salary)}
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayslipRecord({
                            ...item,
                            month: selectedMonth,
                          });
                          setIsPayslipOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Phiếu Lương</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: ARCHIVED SALARY HISTORY & MONTHLY FILTER */}
      {/* ======================================================== */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-black text-white uppercase flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>2. Danh Sách Bảng Lương Đã Lưu Trữ (Salary Archive)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kho lưu trữ dữ liệu lương các tháng đã chốt cố định, phục vụ tra cứu, thanh toán và kiểm toán.
            </p>
          </div>

          <button
            onClick={handleExportArchivePayroll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất Excel Danh Sách Đã Lưu</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              placeholder="Tìm theo tên nhân viên..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={archiveMonthFilter}
              onChange={(e) => setArchiveMonthFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
            >
              <option value="all">📅 Tất cả các tháng</option>
              <option value={currentMonthStr}>📅 Tháng hiện tại ({currentMonthStr})</option>
              {availableArchiveMonths.filter((m) => m !== currentMonthStr).map((m) => (
                <option key={m} value={m}>
                  📅 Tháng {m}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={archiveStatusFilter}
              onChange={(e) => setArchiveStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="paid">✓ Đã thanh toán</option>
              <option value="pending">⏳ Chờ thanh toán</option>
            </select>
          </div>
        </div>

        {/* Archived Table */}
        {archiveLoading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">
            Đang tải dữ liệu lưu trữ...
          </div>
        ) : archiveRecords.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            Chưa có bảng lương nào được chốt lưu trong khoảng thời gian này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-3">Tháng</th>
                  <th className="px-3.5 py-3">Nhân Viên</th>
                  <th className="px-3.5 py-3">Lương CB</th>
                  <th className="px-3.5 py-3">Công Thực Tế/26</th>
                  <th className="px-3.5 py-3">Giờ OT</th>
                  <th className="px-3.5 py-3">Phụ Cấp / Thưởng</th>
                  <th className="px-3.5 py-3">Khoản Trừ</th>
                  <th className="px-3.5 py-3">TỔNG THỰC LĨNH</th>
                  <th className="px-3.5 py-3">Trạng Thái</th>
                  <th className="px-3.5 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {archiveRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-3.5 py-3 font-mono font-bold text-white">
                      {rec.month}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-200">
                      {rec.user_name}
                    </td>
                    <td className="px-3.5 py-3 font-sans font-bold text-slate-300">
                      {formatVND(rec.base_salary)}
                    </td>
                    <td className="px-3.5 py-3 font-sans font-bold text-white">
                      {rec.actual_days} / 26
                    </td>
                    <td className="px-3.5 py-3 font-sans text-amber-300 font-bold">
                      {rec.ot_hours > 0 ? `+${rec.ot_hours}h` : '0'}
                    </td>
                    <td className="px-3.5 py-3 font-sans font-bold text-emerald-400">
                      +{formatVND(rec.total_allowance)}
                    </td>
                    <td className="px-3.5 py-3 font-sans font-bold text-rose-400">
                      -{formatVND(rec.total_deduction)}
                    </td>
                    <td className="px-3.5 py-3 font-sans font-black text-sm text-cyan-300 tracking-tight">
                      {formatVND(rec.final_salary)}
                    </td>
                    <td className="px-3.5 py-3">
                      {isAdminOrOwner ? (
                        <button
                          type="button"
                          onClick={() => handleToggleArchiveStatus(rec)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition badge-nowrap ${
                            rec.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {rec.status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'}
                        </button>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border badge-nowrap ${
                          rec.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {rec.status === 'paid' ? '✓ Đã thanh toán' : '⏳ Chờ thanh toán'}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayslipRecord(rec);
                            setIsPayslipOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem phiếu</span>
                        </button>

                        {isAdminOrOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeleteArchiveMonth(rec.month)}
                            title="Mở khóa / Xóa bản lưu tháng này"
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* 1. Edit Base Salary Modal */}
      {isBaseSalaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                <span>Cập Nhật Lương Cơ Bản: {editingUserName}</span>
              </h3>
              <button onClick={() => setIsBaseSalaryModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveBaseSalary} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mức lương cơ bản (VND / tháng chuẩn 26 ngày) *
                </label>
                <input
                  type="number"
                  step="50000"
                  value={newBaseSalary}
                  onChange={(e) => setNewBaseSalary(parseFloat(e.target.value) || 0)}
                  placeholder="VD: 7000000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-sans font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBaseSalaryModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-glow-cyan"
                >
                  Lưu Lương Cơ Bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Allowance / Bonus Modal */}
      {isAllowanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Thêm Phụ Cấp / Thưởng / Hoa Hồng</span>
              </h3>
              <button onClick={() => setIsAllowanceModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddAllowanceSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên khoản thưởng / phụ cấp *
                </label>
                <input
                  type="text"
                  value={allowanceTitle}
                  onChange={(e) => setAllowanceTitle(e.target.value)}
                  placeholder="VD: Thưởng doanh số, Phụ cấp ăn trưa, Trợ cấp chuyên cần..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Số tiền thưởng (VND) *
                </label>
                <input
                  type="number"
                  step="10000"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="VD: 500000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-sans font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAllowanceModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl shadow-glow-emerald"
                >
                  + Thêm Khoản Thưởng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Deduction / Penalty Modal */}
      {isDeductionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Minus className="w-4 h-4 text-rose-400" />
                <span>Thêm Khoản Trừ / Phạt / Tạm Ứng</span>
              </h3>
              <button onClick={() => setIsDeductionModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddDeductionSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Lý do phạt / Tạm ứng *
                </label>
                <input
                  type="text"
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="VD: Đi muộn không phép, Tạm ứng lương giữa tháng..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Số tiền giảm trừ (VND) *
                </label>
                <input
                  type="number"
                  step="10000"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(parseFloat(e.target.value) || 0)}
                  placeholder="VD: 200000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-sans font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeductionModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 text-white font-black rounded-xl shadow-glow-rose"
                >
                  + Thêm Khoản Trừ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Payslip Detail Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => {
          setIsPayslipOpen(false);
          setSelectedPayslipRecord(null);
        }}
        record={selectedPayslipRecord}
        month={selectedMonth}
      />

    </div>
  );
}
