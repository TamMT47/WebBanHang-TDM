'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Filter,
  Calendar,
  Wallet,
  Building,
  Scale,
  TrendingDown,
  TrendingUp,
  History
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { CashFlow } from '@/types/database';
import CashFlowModal from '@/components/CashFlowModal';

interface CashFlowViewProps {
  user: any;
}

export default function CashFlowView({ user }: CashFlowViewProps) {
  const isOwnerOrAdmin = user && ['admin', 'owner'].includes(user.role);

  const [records, setRecords] = useState<CashFlow[]>([]);
  const [summary, setSummary] = useState({
    total_cash: 0,
    total_transfer: 0,
    total_balance: 0,
    all_time_thu: 0,
    all_time_chi: 0,
    is_periodic: false,
    opening_balance: 0,
    period_thu: 0,
    period_chi: 0,
    closing_balance: 0,
  });
  const [loading, setLoading] = useState(true);

  // Time Filter Presets: 'today', 'yesterday', 'this_month', 'all', 'custom'
  const [timePreset, setTimePreset] = useState<string>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Other filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchKey, setSearchKey] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Handle Preset Changes
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (timePreset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (timePreset === '7days') {
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setDateFrom(d7);
      setDateTo(todayStr);
    } else if (timePreset === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yestStr = yest.toISOString().split('T')[0];
      setDateFrom(yestStr);
      setDateTo(yestStr);
    } else if (timePreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setDateFrom(firstDay);
      setDateTo(todayStr);
    } else if (timePreset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  }, [timePreset]);

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (methodFilter !== 'all') params.append('payment_method', methodFilter);
      if (searchKey.trim()) params.append('search', searchKey.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/cash-flow?${params.toString()}`);
      const data = await res.json();
      setRecords(data.cash_flow || []);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [typeFilter, categoryFilter, methodFilter, searchKey, dateFrom, dateTo]);

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc muốn xóa phiếu ${code}?`)) return;

    try {
      const res = await fetch(`/api/cash-flow?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xóa phiếu');
      fetchCashFlow();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'ban_hang':
        return 'Thu tiền bán hàng';
      case 'nhap_hang':
        return 'Chi tiền nhập hàng';
      case 'thu_no':
        return 'Thu nợ khách hàng';
      case 'tra_no':
        return 'Trả nợ nhà cung cấp';
      case 'chi_phi_khac':
      default:
        return 'Chi phí vận hành / Khác';
    }
  };

  const isPeriodic = Boolean(dateFrom || dateTo);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* 1. Time Filter Bar Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Sổ Quỹ Thu Chi & Dòng Tiền
              </h2>
              <p className="text-xs text-slate-400">
                Theo dõi số dư đầu kỳ, tổng thu, tổng chi và số dư cuối kỳ theo ngày hoặc toàn thời gian.
              </p>
            </div>
          </div>

          {/* Time Presets */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: 'yesterday', label: 'Hôm qua' },
              { id: '7days', label: '7 ngày qua' },
              { id: 'this_month', label: 'Tháng này' },
              { id: 'all', label: 'Toàn thời gian' },
              { id: 'custom', label: 'Tùy chọn ngày' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTimePreset(p.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition badge-nowrap ${
                  timePreset === p.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Pickers */}
        {timePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 max-w-md animate-in fade-in">
            <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-700">
              <span className="text-xs font-bold text-slate-400 badge-nowrap">Từ ngày:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none flex-1"
              />
            </div>
            <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-700">
              <span className="text-xs font-bold text-slate-400 badge-nowrap">Đến ngày:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none flex-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Statistics Cards */}
      {isPeriodic ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Số Dư Đầu Kỳ */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Số Dư Đầu Kỳ</span>
            </div>
            <div className="text-xl font-black text-white font-mono badge-nowrap">
              {formatVND(summary.opening_balance)}
            </div>
            <p className="text-[10px] text-slate-500">Tồn quỹ trước ngày {dateFrom || 'N/A'}</p>
          </div>

          {/* Tổng Thu Trong Kỳ */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 shadow-xl space-y-1">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tổng Thu Trong Kỳ</span>
            </div>
            <div className="text-xl font-black text-emerald-300 font-mono badge-nowrap">
              +{formatVND(summary.period_thu)}
            </div>
            <p className="text-[10px] text-emerald-400/80 font-medium">Bán hàng, thu nợ, thu khác</p>
          </div>

          {/* Tổng Chi Trong Kỳ */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-rose-500/30 bg-rose-500/10 shadow-xl space-y-1">
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Tổng Chi Trong Kỳ</span>
            </div>
            <div className="text-xl font-black text-rose-300 font-mono badge-nowrap">
              -{formatVND(summary.period_chi)}
            </div>
            <p className="text-[10px] text-rose-400/80 font-medium">Nhập hàng, trả nợ, chi phí</p>
          </div>

          {/* Số Dư Cuối Kỳ */}
          <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border-2 border-cyan-500/50 shadow-glow-cyan space-y-1">
            <div className="text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-1">
              <Scale className="w-3.5 h-3.5" />
              <span>Số Dư Cuối Kỳ</span>
            </div>
            <div className="text-xl font-black text-cyan-300 font-mono badge-nowrap">
              {formatVND(summary.closing_balance)}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold">= Đầu kỳ + Thu - Chi</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Quỹ Tiền Mặt */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5" />
                <span>Quỹ Tiền Mặt (Tại Két)</span>
              </div>
              <div className="text-xl font-black text-white mt-1 font-mono badge-nowrap">
                {formatVND(summary.total_cash)}
              </div>
            </div>
            <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-xl badge-nowrap">
              💵 Tiền mặt
            </span>
          </div>

          {/* Quỹ Chuyển Khoản */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1">
                <Building className="w-3.5 h-3.5" />
                <span>Quỹ Ngân Hàng (Chuyển Khoản)</span>
              </div>
              <div className="text-xl font-black text-white mt-1 font-mono badge-nowrap">
                {formatVND(summary.total_transfer)}
              </div>
            </div>
            <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-xl badge-nowrap">
              💳 Tài khoản
            </span>
          </div>

          {/* Tổng Quỹ Hiện Có */}
          <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border-2 border-cyan-500/50 shadow-glow-cyan flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                Tổng Tiền Quỹ Hiện Có
              </div>
              <div className="text-xl font-black text-cyan-300 mt-1 font-mono badge-nowrap">
                {formatVND(summary.total_balance)}
              </div>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1 badge-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950 font-black" />
              <span>+ Lập Phiếu</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Filter Bar & Quick Create */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Mã phiếu, đối tác, ghi chú..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Type */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả Loại phiếu</option>
                <option value="thu">Phiếu Thu (Tiền vào)</option>
                <option value="chi">Phiếu Chi (Tiền ra)</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả Hạng mục</option>
                <option value="ban_hang">Thu bán hàng</option>
                <option value="nhap_hang">Chi nhập hàng</option>
                <option value="thu_no">Thu nợ khách</option>
                <option value="tra_no">Trả nợ NCC</option>
                <option value="chi_phi_khac">Chi phí khác</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 focus:outline-none"
              >
                <option value="all">Tất cả Hình thức</option>
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto badge-nowrap"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>+ Lập Phiếu Thu/Chi Ngoài</span>
          </button>
        </div>
      </div>

      {/* 4. Records Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">Đang tải sổ quỹ...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            Không có phiếu thu chi nào trong khoảng thời gian này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Mã phiếu</th>
                  <th className="px-4 py-3.5">Thời gian</th>
                  <th className="px-4 py-3.5">Hạng mục</th>
                  <th className="px-4 py-3.5">Số tiền</th>
                  <th className="px-4 py-3.5">Hình thức</th>
                  <th className="px-4 py-3.5">Đối tác / Ghi chú</th>
                  <th className="px-4 py-3.5">Người lập</th>
                  {isOwnerOrAdmin && <th className="px-4 py-3.5 text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {records.map((r) => {
                  const isThu = r.type === 'thu';
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/50 transition duration-150">
                      <td className="px-4 py-3.5 font-extrabold text-white font-mono">
                        <div className="flex items-center space-x-1.5 badge-nowrap">
                          {isThu ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>{r.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="badge-nowrap">{new Date(r.created_at).toLocaleDateString('vi-VN')}</div>
                        <div className="text-[10px] text-slate-500 badge-nowrap">
                          {new Date(r.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-200 badge-nowrap">
                        {getCategoryName(r.category)}
                      </td>
                      <td className="px-4 py-3.5 font-black text-sm font-mono badge-nowrap">
                        <span className={isThu ? 'text-emerald-400' : 'text-rose-400'}>
                          {isThu ? '+' : '-'}{formatVND(r.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold badge-nowrap ${
                            r.payment_method === 'cash'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {r.payment_method === 'cash' ? '💵 Tiền mặt' : '💳 Chuyển khoản'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {r.partner_name && (
                          <div className="font-bold text-white">{r.partner_name}</div>
                        )}
                        <div className="text-[11px] text-slate-400">{r.note || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-[11px] badge-nowrap">
                        {r.creator_name || 'Hệ thống'}
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(r.id, r.code)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CashFlowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchCashFlow()}
      />
    </div>
  );
}
