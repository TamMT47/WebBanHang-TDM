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
  AlertCircle,
  Briefcase,
  TrendingUp,
  Award
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { MonthlyPayrollItem, SalaryHistoryRecord } from '@/types/database';
import PayslipModal from '@/components/PayslipModal';
import { exportPayrollToCSV } from '@/lib/exportHelper';

interface PayrollViewProps {
  user: any;
}

const CONTRACT_OPTIONS = [
  { value: 'probation', label: 'Thử việc (85% Lương CB)', rate: 0.85 },
  { value: 'sales', label: 'Bán hàng (100%)', rate: 1.0 },
  { value: 'marketing', label: 'Sale Marketing (100%)', rate: 1.0 },
  { value: 'manager', label: 'Quản lý (100%)', rate: 1.0 },
];

export default function PayrollView({ user }: PayrollViewProps) {
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);
  const isManagerOrAbove = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isStaff = user?.role === 'staff';

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [loading, setLoading] = useState(true);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Payroll State
  const [payrollItems, setPayrollItems] = useState<MonthlyPayrollItem[]>([]);
  const [totalMainDevicesSold, setTotalMainDevicesSold] = useState(0);
  const [totalEligibleStaff, setTotalEligibleStaff] = useState(0);
  const [sharedCommissionPerPerson, setSharedCommissionPerPerson] = useState(0);
  const [customHeadcountInput, setCustomHeadcountInput] = useState<number | string>('');
  const [savingHeadcount, setSavingHeadcount] = useState(false);

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
      setTotalMainDevicesSold(data.totalMainDevicesSold || 0);
      setTotalEligibleStaff(data.totalEligibleStaff || 0);
      setSharedCommissionPerPerson(data.sharedCommissionPerPerson || 0);
      setCustomHeadcountInput(data.customHeadcount || data.finalDivisor || '');
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
    const contractType = item.contract_type || 'sales';
    const effectiveBaseSalary = contractType === 'probation' ? Math.round(baseSalary * 0.85) : baseSalary;
    const standardDays = parseInt(item.standard_days as any) || 26;
    const actualDays = parseFloat(item.actual_days as any) || 0;
    const otHours = parseFloat(item.ot_hours as any) || 0;

    const unitDailySalary = standardDays > 0 ? (effectiveBaseSalary / standardDays) : 0;
    item.salary_by_days = Math.round(unitDailySalary * actualDays);
    item.ot_salary = Math.round((unitDailySalary / 11) * otHours * 1.5);

    const sharedComm = parseFloat(item.shared_commission as any) || 0;
    const personalComm = parseFloat(item.personal_commission as any) || 0;
    const customAllowances = (item.allowances || []).reduce((sum, al) => sum + (parseFloat(al.amount as any) || 0), 0);
    const totalDeduction = (item.deductions || []).reduce((sum, de) => sum + (parseFloat(de.amount as any) || 0), 0);

    item.total_allowance = sharedComm + personalComm + customAllowances;
    item.total_deduction = totalDeduction;
    item.final_salary = Math.max(0, item.salary_by_days + item.ot_salary + item.total_allowance - totalDeduction);

    updated[index] = item;
    setPayrollItems(updated);
  };

  // Change contract type
  const handleChangeContractType = async (index: number, newContractType: any) => {
    const updated = [...payrollItems];
    const item = { ...updated[index], contract_type: newContractType };
    updated[index] = item;
    setPayrollItems(updated);
    handleUpdateItemValue(index, 'contract_type', newContractType);

    try {
      await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_contract_type',
          user_id: item.user_id,
          contract_type: newContractType,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Save manual headcount divisor for shared commission
  const handleSaveHeadcount = async () => {
    const num = parseInt(String(customHeadcountInput), 10);
    if (!num || num <= 0) {
      alert('Vui lòng nhập số nhân sự hợp lệ (> 0)');
      return;
    }

    try {
      setSavingHeadcount(true);
      const res = await fetch('/api/payroll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_shared_commission_headcount',
          month: selectedMonth,
          headcount: num,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật số nhân sự');

      setMessage({ type: 'success', text: data.message });
      fetchLivePayroll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingHeadcount(false);
    }
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

    handleUpdateItemValue(targetUserIndex, 'deductions', item.deductions);

    setIsDeductionModalOpen(false);
    setDeductionReason('');
    setDeductionAmount(0);
    setTargetUserIndex(-1);
  };

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

  const handleExportLivePayroll = () => {
    exportPayrollToCSV(payrollItems, selectedMonth);
  };

  const handleExportArchivePayroll = () => {
    exportPayrollToCSV(archiveRecords, archiveMonthFilter);
  };

  // My current payroll item (for staff)
  const myPayrollItem = payrollItems.find((p) => p.user_id === user?.id);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
            <DollarSign className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
            Bảng Tính Lương & Quản Lý Lương
          </h2>
        </div>

        {/* Month Selector & Action Buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
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
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 badge-nowrap shadow-xs"
            title="Xuất file Excel bảng lương tháng này"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {isAdminOrOwner && (
            <button
              type="button"
              onClick={handleLockMonthlyPayroll}
              disabled={savingPayroll}
              className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-glow-cyan transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 badge-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPayroll ? 'Đang lưu...' : `Chốt & Lưu Tháng ${selectedMonth}`}</span>
            </button>
          )}
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

      {/* ======================================================== */}
      {/* ADMIN CONTROLS: Ô NHẬP TAY SỐ NHÂN SỰ CHIA HOA HỒNG THÁNG */}
      {/* ======================================================== */}
      {isAdminOrOwner && (
        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <span className="font-black text-white uppercase">Cấu hình chia hoa hồng doanh số (50.000đ/máy chính):</span>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Tổng máy chính tháng này: <b className="text-white font-sans">{totalMainDevicesSold}</b> máy • Hoa hồng mỗi suất: <b className="text-emerald-400 font-sans">+{formatVND(sharedCommissionPerPerson)}</b>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-300 badge-nowrap">Số nhân sự chia tháng này:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={customHeadcountInput}
              onChange={(e) => setCustomHeadcountInput(e.target.value)}
              placeholder="VD: 4"
              className="w-16 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white text-center focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleSaveHeadcount}
              disabled={savingHeadcount}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl text-xs shadow-xs hover:brightness-110 active:scale-95 transition disabled:opacity-50 badge-nowrap"
            >
              {savingHeadcount ? 'Đang lưu...' : 'Lưu Số Chia'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: BẢNG LƯƠNG NHÂN VIÊN DẠNG 1 DÒNG NẰM NGANG */}
      {/* ======================================================== */}
      {isStaff ? (
        /* MÀN HÌNH NHÂN VIÊN: THẺ BẢNG LƯƠNG TỐI GIẢN, GỌN GÀNG, ẨN HOÀN TOÀN ĐƠN GIÁ & CÔNG THỨC */
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl p-4 sm:p-5">
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400 animate-pulse">
              Đang tính lương tháng {selectedMonth}...
            </div>
          ) : !myPayrollItem ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Không tìm thấy dữ liệu lương của bạn trong tháng {selectedMonth}.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {myPayrollItem.user_name?.slice(0, 1) || 'NV'}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-black text-white">{myPayrollItem.user_name}</div>
                    <div className="text-[10px] text-amber-300 font-bold">
                      {myPayrollItem.contract_type === 'probation' ? 'Thử việc (85%)' : 'Nhân viên chính thức'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayslipRecord({
                      ...myPayrollItem,
                      month: selectedMonth,
                    });
                    setIsPayslipOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem Phiếu Lương</span>
                </button>
              </div>

              {/* Grid các chỉ số lương cơ bản & thực lĩnh */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">LƯƠNG CƠ BẢN</span>
                  <span className="font-sans font-bold text-white text-xs">{formatVND(myPayrollItem.base_salary)}</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">NGÀY CÔNG</span>
                  <span className="font-sans font-bold text-white text-xs">{myPayrollItem.actual_days} / {myPayrollItem.standard_days} công</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">LƯƠNG CÔNG</span>
                  <span className="font-sans font-bold text-white text-xs">{formatVND(myPayrollItem.salary_by_days)}</span>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 block font-bold">TĂNG CA (OT)</span>
                  <span className="font-sans font-bold text-amber-300 text-xs">
                    {myPayrollItem.ot_hours}h (+{formatVND(myPayrollItem.ot_salary)})
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-emerald-400 block font-bold">HOA HỒNG</span>
                  <span className="font-sans font-bold text-emerald-400 text-xs">
                    +{formatVND((myPayrollItem.shared_commission || 0) + (myPayrollItem.personal_commission || 0))}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">THƯỞNG / TRỪ</span>
                  <span className="font-sans font-bold text-emerald-400 text-xs">
                    +{formatVND((myPayrollItem.allowances || []).reduce((s, a) => s + (a.amount || 0), 0))}
                  </span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="font-sans font-bold text-rose-400 text-xs">-{formatVND(myPayrollItem.total_deduction)}</span>
                </div>

                <div className="col-span-2 sm:col-span-2 p-2.5 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 rounded-xl border border-cyan-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-cyan-300 block font-black uppercase">TỔNG THỰC LĨNH THÁNG {selectedMonth}</span>
                    <span className="font-sans font-black text-base text-cyan-300">{formatVND(myPayrollItem.final_salary)}</span>
                  </div>
                  <div className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold border border-cyan-500/30">
                    Đã tính
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MÀN HÌNH ADMIN / QUẢN LÝ: BẢNG CHI TIẾT TẤT CẢ NHÂN SỰ */
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl p-3.5 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="text-xs font-black text-white uppercase flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Bảng Lương Tháng {selectedMonth}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Tổng thực lĩnh: <b className="text-cyan-300 font-sans">{formatVND(payrollItems.reduce((s, i) => s + i.final_salary, 0))}</b> ({payrollItems.length} nhân sự)
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400 animate-pulse">
              Đang tính toán bảng lương...
            </div>
          ) : payrollItems.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Chưa có nhân viên nào trong hệ thống.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Nhân Viên</th>
                    <th className="px-3 py-2.5">Loại Hợp Đồng</th>
                    <th className="px-3 py-2.5">Lương Cơ Bản</th>
                    <th className="px-3 py-2.5">Công Thực Tế</th>
                    <th className="px-3 py-2.5">Lương Công</th>
                    <th className="px-3 py-2.5">Tăng Ca (OT)</th>
                    <th className="px-3 py-2.5">HH Nhóm</th>
                    <th className="px-3 py-2.5">HH Cá Nhân</th>
                    <th className="px-3 py-2.5">Phụ Cấp / Trừ</th>
                    <th className="px-3 py-2.5">TỔNG THỰC LĨNH</th>
                    <th className="px-3 py-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {payrollItems.map((item, idx) => {
                    const effectiveBase = item.contract_type === 'probation' ? Math.round(item.base_salary * 0.85) : item.base_salary;

                    return (
                      <tr key={item.user_id} className="hover:bg-slate-800/40 transition">
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-white text-xs">{item.user_name}</div>
                          <div className="text-[10px] text-cyan-400 uppercase font-semibold">{item.user_role}</div>
                        </td>

                        <td className="px-3 py-2.5">
                          {isManagerOrAbove ? (
                            <select
                              value={item.contract_type || 'sales'}
                              onChange={(e) => handleChangeContractType(idx, e.target.value)}
                              className="bg-slate-950 border border-slate-700 text-[11px] font-bold text-amber-300 rounded-lg px-2 py-1 focus:outline-none"
                            >
                              {CONTRACT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-300">
                              {CONTRACT_OPTIONS.find((c) => c.value === item.contract_type)?.label || 'Bán hàng'}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="flex items-center space-x-1">
                            <span className="font-sans font-bold text-slate-200">{formatVND(item.base_salary)}</span>
                            {isAdminOrOwner && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUserId(item.user_id);
                                  setEditingUserName(item.user_name);
                                  setNewBaseSalary(item.base_salary);
                                  setIsBaseSalaryModalOpen(true);
                                }}
                                title="Sửa lương cơ bản"
                                className="p-1 text-slate-500 hover:text-cyan-300 transition"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {item.contract_type === 'probation' && (
                            <div className="text-[10px] text-cyan-400 font-semibold">85%: {formatVND(effectiveBase)}</div>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          {isAdminOrOwner ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="0.5"
                                value={item.actual_days}
                                onChange={(e) => handleUpdateItemValue(idx, 'actual_days', parseFloat(e.target.value) || 0)}
                                className="w-14 px-1 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white text-center focus:outline-none focus:border-cyan-500"
                              />
                              <span className="text-slate-400 text-[11px] font-bold">/ {item.standard_days}c</span>
                            </div>
                          ) : (
                            <span className="font-bold text-white font-sans text-xs">
                              {item.actual_days} / {item.standard_days} công
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 font-sans font-bold text-white">
                          {formatVND(item.salary_by_days)}
                        </td>

                        <td className="px-3 py-2.5">
                          {isAdminOrOwner ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="0.5"
                                value={item.ot_hours}
                                onChange={(e) => handleUpdateItemValue(idx, 'ot_hours', parseFloat(e.target.value) || 0)}
                                className="w-12 px-1 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-amber-300 text-center focus:outline-none focus:border-amber-500"
                              />
                              <span className="text-amber-400 text-[10px] font-bold">h</span>
                            </div>
                          ) : (
                            <span className="font-bold text-amber-400 font-sans">{item.ot_hours}h</span>
                          )}
                          <div className="text-[10px] font-bold text-amber-300 font-sans mt-0.5">
                            +{formatVND(item.ot_salary)}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 font-sans font-bold text-emerald-400">
                          {(item.shared_commission || 0) > 0 ? `+${formatVND(item.shared_commission || 0)}` : '0đ'}
                        </td>

                        <td className="px-3 py-2.5 font-sans font-bold text-emerald-400">
                          {(item.personal_commission || 0) > 0 ? `+${formatVND(item.personal_commission || 0)}` : '0đ'}
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <span className="font-sans text-[11px] font-bold text-emerald-400">
                                +{formatVND((item.allowances || []).reduce((s, a) => s + (a.amount || 0), 0))}
                              </span>
                              {isAdminOrOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetUserIndex(idx);
                                    setIsAllowanceModalOpen(true);
                                  }}
                                  className="p-0.5 bg-emerald-500/10 text-emerald-300 rounded"
                                  title="+ Thêm Thưởng / Phụ cấp"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center space-x-1">
                              <span className="font-sans text-[11px] font-bold text-rose-400">
                                -{formatVND(item.total_deduction)}
                              </span>
                              {isAdminOrOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetUserIndex(idx);
                                    setIsDeductionModalOpen(true);
                                  }}
                                  className="p-0.5 bg-rose-500/10 text-rose-300 rounded"
                                  title="+ Thêm Khoản trừ / Phạt"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {item.allowances?.map((al) => (
                              <div key={al.id} className="flex items-center justify-between text-[10px] bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-slate-300">
                                <span>{al.title}: +{formatVND(al.amount)}</span>
                                {isAdminOrOwner && (
                                  <button type="button" onClick={() => handleRemoveAllowance(idx, al.id)} className="text-slate-500 hover:text-rose-400 ml-1">✕</button>
                                )}
                              </div>
                            ))}
                            {item.deductions?.map((de) => (
                              <div key={de.id} className="flex items-center justify-between text-[10px] bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-slate-300">
                                <span>{de.reason}: -{formatVND(de.amount)}</span>
                                {isAdminOrOwner && (
                                  <button type="button" onClick={() => handleRemoveDeduction(idx, de.id)} className="text-slate-500 hover:text-rose-400 ml-1">✕</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 font-sans font-black text-sm text-cyan-300">
                          {formatVND(item.final_salary)}
                        </td>

                        <td className="px-3 py-2.5 text-right">
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: DANH SÁCH BẢNG LƯƠNG ĐÃ LƯU TRỮ (SALARY ARCHIVE) */}
      {/* ======================================================== */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase">Danh Sách Bảng Lương Đã Lưu Trữ</h3>
          </div>

          <button
            onClick={handleExportArchivePayroll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Xuất Excel Đã Lưu</span>
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
                <option key={m} value={m}>📅 Tháng {m}</option>
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
          <div className="text-center py-12 text-xs text-slate-400 animate-pulse">
            Đang tải dữ liệu lưu trữ...
          </div>
        ) : archiveRecords.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Chưa có bảng lương nào được chốt lưu trong khoảng thời gian này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Tháng</th>
                  <th className="px-3.5 py-2.5">Nhân Viên</th>
                  <th className="px-3.5 py-2.5">Hợp Đồng</th>
                  <th className="px-3.5 py-2.5">Lương CB</th>
                  <th className="px-3.5 py-2.5">Công / Chuẩn</th>
                  <th className="px-3.5 py-2.5">Giờ OT</th>
                  <th className="px-3.5 py-2.5">HH Nhóm</th>
                  <th className="px-3.5 py-2.5">HH Cá Nhân</th>
                  <th className="px-3.5 py-2.5">Phụ Cấp / Trừ</th>
                  <th className="px-3.5 py-2.5">TỔNG THỰC LĨNH</th>
                  <th className="px-3.5 py-2.5">Trạng Thái</th>
                  <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {archiveRecords.map((rec) => {
                  const contract = CONTRACT_OPTIONS.find((c) => c.value === rec.contract_type) || CONTRACT_OPTIONS[1];

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-white">{rec.month}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-200">{rec.user_name}</td>
                      <td className="px-3.5 py-2.5 font-semibold text-amber-300 text-[11px]">{contract.label}</td>
                      <td className="px-3.5 py-2.5 font-sans font-bold text-slate-300">{formatVND(rec.base_salary)}</td>
                      <td className="px-3.5 py-2.5 font-sans font-bold text-white">{rec.actual_days} / {rec.standard_days || 26}</td>
                      <td className="px-3.5 py-2.5 font-sans text-amber-300 font-bold">{rec.ot_hours > 0 ? `+${rec.ot_hours}h` : '0'}</td>
                      <td className="px-3.5 py-2.5 font-sans font-bold text-emerald-400">
                        {(rec.shared_commission || 0) > 0 ? `+${formatVND(rec.shared_commission || 0)}` : '0đ'}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans font-bold text-emerald-400">
                        {(rec.personal_commission || 0) > 0 ? `+${formatVND(rec.personal_commission || 0)}` : '0đ'}
                      </td>
                      <td className="px-3.5 py-2.5 font-sans text-[11px]">
                        <span className="text-emerald-400">+{formatVND(rec.total_allowance || 0)}</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-rose-400">-{formatVND(rec.total_deduction || 0)}</span>
                      </td>
                      <td className="px-3.5 py-2.5 font-sans font-black text-sm text-cyan-300">{formatVND(rec.final_salary)}</td>
                      <td className="px-3.5 py-2.5">
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
                      <td className="px-3.5 py-2.5 text-right">
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
                  );
                })}
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
                  Mức lương cơ bản (VND / tháng chuẩn) *
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
                <span>Thêm Phụ Cấp / Thưởng Khác</span>
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
                  placeholder="VD: Phụ cấp ăn trưa, Trợ cấp chuyên cần..."
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
                  placeholder="VD: Đi muộn không phép, Tạm ứng lương..."
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
