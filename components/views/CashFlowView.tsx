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
    <div className="space-y-4">
      
      {/* 1. Time Filter Bar Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gray-950 text-white rounded-xl">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
                Sổ Quỹ Thu Chi & Dòng Tiền
              </h2>
              <p className="text-xs text-gray-500">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  timePreset === p.id
                    ? 'bg-gray-950 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Pickers (Shown if custom or specific range) */}
        {timePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100 max-w-md animate-in fade-in">
            <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-500">Từ ngày:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none flex-1"
              />
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-500">Đến ngày:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none flex-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Statistics Cards: Periodic vs All-time */}
      {isPeriodic ? (
        /* DÒNG TIỀN THEO NGÀY / KHOẢNG NGÀY */
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Số Dư Đầu Kỳ */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Số Dư Đầu Kỳ</span>
            </div>
            <div className="text-xl font-black text-gray-900 font-mono">
              {formatVND(summary.opening_balance)}
            </div>
            <p className="text-[10px] text-gray-400">Tồn quỹ trước ngày {dateFrom || 'N/A'}</p>
          </div>

          {/* Tổng Thu Trong Kỳ */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tổng Thu Trong Kỳ</span>
            </div>
            <div className="text-xl font-black text-emerald-700 font-mono">
              +{formatVND(summary.period_thu)}
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">Bán hàng, thu nợ, thu khác</p>
          </div>

          {/* Tổng Chi Trong Kỳ */}
          <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              <span>Tổng Chi Trong Kỳ</span>
            </div>
            <div className="text-xl font-black text-rose-700 font-mono">
              -{formatVND(summary.period_chi)}
            </div>
            <p className="text-[10px] text-rose-600 font-medium">Nhập hàng, trả nợ, chi phí</p>
          </div>

          {/* Số Dư Cuối Kỳ */}
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-950 shadow-md space-y-1 bg-gradient-to-br from-white to-gray-50">
            <div className="text-[11px] font-black text-gray-950 uppercase tracking-wider flex items-center space-x-1">
              <Scale className="w-3.5 h-3.5 text-gray-900" />
              <span>Số Dư Cuối Kỳ</span>
            </div>
            <div className="text-xl font-black text-gray-950 font-mono">
              {formatVND(summary.closing_balance)}
            </div>
            <p className="text-[10px] text-gray-500 font-semibold">= Đầu kỳ + Thu - Chi</p>
          </div>
        </div>
      ) : (
        /* TOÀN THỜI GIAN */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Quỹ Tiền Mặt */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>Quỹ Tiền Mặt (Tại Két)</span>
              </div>
              <div className="text-xl font-black text-gray-950 mt-1 font-mono">
                {formatVND(summary.total_cash)}
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
              💵 Tiền mặt
            </span>
          </div>

          {/* Quỹ Chuyển Khoản */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>Quỹ Ngân Hàng (Chuyển Khoản)</span>
              </div>
              <div className="text-xl font-black text-gray-950 mt-1 font-mono">
                {formatVND(summary.total_transfer)}
              </div>
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
              💳 Tài khoản
            </span>
          </div>

          {/* Tổng Quỹ Hiện Có */}
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-950 shadow-md flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black text-gray-900 uppercase tracking-wider">
                Tổng Tiền Quỹ Hiện Có
              </div>
              <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
                {formatVND(summary.total_balance)}
              </div>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Lập Phiếu</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Filter Bar & Quick Create */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Mã phiếu, đối tác, ghi chú..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
              />
            </div>

            {/* Type */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none"
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
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
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
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
              >
                <option value="all">Tất cả Hình thức</option>
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Lập Phiếu Thu/Chi Ngoài</span>
          </button>
        </div>
      </div>

      {/* 4. Records Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-gray-400">Đang tải sổ quỹ...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-xs text-gray-500">
            Không có phiếu thu chi nào trong khoảng thời gian này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Mã phiếu</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Hạng mục</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Hình thức</th>
                  <th className="px-4 py-3">Đối tác / Ghi chú</th>
                  <th className="px-4 py-3">Người lập</th>
                  {isOwnerOrAdmin && <th className="px-4 py-3 text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => {
                  const isThu = r.type === 'thu';
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-4 py-3 font-extrabold text-gray-950 font-mono">
                        <div className="flex items-center space-x-1.5">
                          {isThu ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{r.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{new Date(r.created_at).toLocaleDateString('vi-VN')}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(r.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {getCategoryName(r.category)}
                      </td>
                      <td className="px-4 py-3 font-black text-sm font-mono">
                        <span className={isThu ? 'text-emerald-700' : 'text-rose-700'}>
                          {isThu ? '+' : '-'}{formatVND(r.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.payment_method === 'cash'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {r.payment_method === 'cash' ? '💵 Tiền mặt' : '💳 Chuyển khoản'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.partner_name && (
                          <div className="font-bold text-gray-950">{r.partner_name}</div>
                        )}
                        <div className="text-[11px] text-gray-500">{r.note || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px]">
                        {r.creator_name || 'Hệ thống'}
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(r.id, r.code)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
