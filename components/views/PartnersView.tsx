'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  UserCheck,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Partner } from '@/types/database';
import DebtModal from '@/components/DebtModal';
import MoneyInput from '@/components/ui/MoneyInput';
import { exportCustomersToCSV } from '@/lib/exportHelper';

interface PartnersViewProps {
  user: any;
}

export default function PartnersView({ user }: PartnersViewProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState({
    total_customer_debt: 0,
    total_supplier_debt: 0,
    customer_debtors_count: 0,
    supplier_debtors_count: 0,
    total_debtors_count: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'supplier'>('all');
  const [debtStatusFilter, setDebtStatusFilter] = useState<string>('all');
  const [debtDaysFilter, setDebtDaysFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('debt_desc');
  const [search, setSearch] = useState('');

  // Add Partner Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<'customer' | 'supplier'>('customer');
  const [newAddress, setNewAddress] = useState('');
  const [newCccd, setNewCccd] = useState('');
  const [initialDebt, setInitialDebt] = useState<number>(0);

  // Debt Action Modal
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (debtStatusFilter !== 'all') params.append('debt_status', debtStatusFilter);
      if (debtDaysFilter !== 'all') params.append('debt_days', debtDaysFilter);
      if (sortBy) params.append('sort_by', sortBy);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/partners?${params.toString()}`);
      const data = await res.json();
      setPartners(data.partners || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [typeFilter, debtStatusFilter, debtDaysFilter, sortBy, search]);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim(),
          type: newType,
          address: newAddress.trim(),
          cccd: newCccd.trim(),
          initial_debt: initialDebt,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi khi tạo đối tác');
      }

      setIsAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewAddress('');
      setNewCccd('');
      setInitialDebt(0);
      fetchPartners();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportData = () => {
    if (!partners || partners.length === 0) {
      alert('Không có dữ liệu khách hàng để xuất file!');
      return;
    }
    const success = exportCustomersToCSV(partners);
    if (success) {
      setExportNotice(`Đã xuất thành công ${partners.length} đối tác/khách hàng về máy!`);
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Export Success Toast */}
      {exportNotice && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl font-black text-xs shadow-glow-emerald flex items-center space-x-2 animate-in slide-in-from-top border border-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Quản Lý Khách Hàng, NCC & Công Nợ
            </h2>
            <p className="text-xs text-slate-400">
              Theo dõi số ngày quá hạn, lọc nợ lâu nhất và thao tác thu/trả nợ 1-chạm.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportData}
            title="Xuất danh sách khách hàng và công nợ về máy tính"
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 badge-nowrap active:scale-95 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>📥 Xuất File Excel/CSV</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1.5 badge-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-950 font-black" />
            <span>+ Thêm Đối Tác Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Khách nợ Cửa hàng */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-rose-500/30 bg-rose-500/10 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Khách Đang Nợ Cửa Hàng</span>
            </span>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-lg border border-rose-500/30 badge-nowrap">
              {stats.customer_debtors_count} khách nợ
            </span>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-wide badge-nowrap">
            {formatVND(stats.total_customer_debt)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Tiền nợ mua máy chưa thu hồi xong
          </div>
        </div>

        {/* Cửa hàng nợ Nhà cung cấp */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 shadow-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Cửa Hàng Nợ Nhà Cung Cấp</span>
            </span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/30 badge-nowrap">
              {stats.supplier_debtors_count} NCC
            </span>
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono tracking-wide badge-nowrap">
            {formatVND(stats.total_supplier_debt)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Tiền hàng nhập kho cần thanh toán
          </div>
        </div>

        {/* Tổng đối tác & Tình trạng */}
        <div className="bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border-2 border-cyan-500/50 shadow-glow-cyan space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
              Tổng Đối Tác Phát Sinh Dư Nợ
            </span>
            <div className="p-1.5 bg-slate-800 text-cyan-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono badge-nowrap">
            {stats.total_debtors_count} <span className="text-xs font-bold text-slate-400">đối tác có nợ</span>
          </div>
          <div className="text-[11px] text-slate-400 font-semibold">
            Ưu tiên nhắc nợ khách quá hạn &gt; 30 ngày
          </div>
        </div>
      </div>

      {/* 3. Advanced Multi-Filters Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        
        {/* Row 1: Search & Type Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo Tên khách, Số điện thoại, CCCD..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Type Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            {[
              { id: 'all', label: 'Tất cả đối tác' },
              { id: 'customer', label: 'Khách hàng' },
              { id: 'supplier', label: 'Nhà cung cấp' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition badge-nowrap ${
                  typeFilter === t.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Debt Filters & Sorting Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              Trạng thái công nợ
            </label>
            <select
              value={debtStatusFilter}
              onChange={(e) => setDebtStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả (Có nợ & Hết nợ)</option>
              <option value="has_debt">🔴 Chỉ xem Đang có dư nợ</option>
              <option value="no_debt">🟢 Đã thanh toán hết nợ (0đ)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              Thời gian phát sinh nợ
            </label>
            <select
              value={debtDaysFilter}
              onChange={(e) => setDebtDaysFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="all">Toàn bộ thời gian nợ</option>
              <option value="gt30">⏳ Nợ trên 30 ngày (Quá 1 tháng)</option>
              <option value="gt60">⚠️ Nợ trên 60 ngày (Quá 2 tháng)</option>
              <option value="gt90">🚨 Nợ trên 90 ngày (Cần ưu tiên thu hồi)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              Sắp xếp danh sách
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="debt_desc">💰 Dư nợ cao nhất lên đầu</option>
              <option value="debt_asc">📉 Dư nợ thấp nhất lên đầu</option>
              <option value="days_desc">⏳ Nợ lâu nhất lên đầu (Số ngày nhiều nhất)</option>
              <option value="days_asc">⚡ Mới phát sinh nợ gần đây</option>
              <option value="created_desc">Mới tạo gần đây</option>
              <option value="name_asc">Tên theo thứ tự A - Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Partners & Debt Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 font-semibold animate-pulse">
            Đang tải dữ liệu công nợ đối tác...
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400 space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="font-bold text-slate-300">Không tìm thấy đối tác nào phù hợp với bộ lọc</div>
            <div className="text-[11px] text-slate-500">
              Hãy thử chọn lại trạng thái công nợ hoặc tìm kiếm bằng từ khóa khác.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Đối Tác</th>
                  <th className="px-4 py-3.5">Số Điện Thoại</th>
                  <th className="px-4 py-3.5">Phân Loại</th>
                  <th className="px-4 py-3.5">Địa Chỉ / CCCD</th>
                  <th className="px-4 py-3.5">Thời Gian Nợ</th>
                  <th className="px-4 py-3.5">Số Tiền Dư Nợ</th>
                  <th className="px-4 py-3.5 text-right">Xử Lý Nợ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {partners.map((p: any) => {
                  const debt = parseFloat(p.debt as any) || 0;
                  const isCustomer = p.type === 'customer';
                  const daysInDebt = parseInt(p.days_in_debt || '0', 10);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition duration-150">
                      <td className="px-4 py-3.5">
                        <div className="font-extrabold text-sm text-white">{p.name}</div>
                        {p.total_orders > 0 && (
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 badge-nowrap">
                            Đã mua: {p.total_orders} đơn hàng
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-300 badge-nowrap">
                        {p.phone}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold badge-nowrap ${
                            isCustomer
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {isCustomer ? 'Khách hàng' : 'Nhà cung cấp'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-300">
                        <div>{p.address || 'Tại cửa hàng'}</div>
                        {p.cccd && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 badge-nowrap">
                            CCCD: {p.cccd}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {debt !== 0 ? (
                          <div className="space-y-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center space-x-1 badge-nowrap ${
                                daysInDebt >= 90
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : daysInDebt >= 30
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{daysInDebt} ngày</span>
                            </span>
                            {daysInDebt >= 90 && (
                              <div className="text-[9px] font-black text-rose-400 uppercase badge-nowrap">
                                ⚠️ Cần thu hồi gấp
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono">
                        {debt === 0 ? (
                          <span className="text-emerald-400 font-bold text-xs bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg badge-nowrap">
                            ✓ 0 đ (Hết nợ)
                          </span>
                        ) : debt > 0 ? (
                          <div>
                            <div className="font-black text-sm text-rose-400 tracking-wide badge-nowrap">
                              +{formatVND(debt)}
                            </div>
                            <div className="text-[10px] font-bold text-rose-400/80 badge-nowrap">
                              Khách còn nợ
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-black text-sm text-amber-400 tracking-wide badge-nowrap">
                              -{formatVND(Math.abs(debt))}
                            </div>
                            <div className="text-[10px] font-bold text-amber-400/80 badge-nowrap">
                              Cửa hàng nợ NCC
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedPartner(p);
                            setIsDebtModalOpen(true);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ml-auto shadow-sm active:scale-95 badge-nowrap ${
                            isCustomer
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-glow-emerald'
                              : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                          }`}
                        >
                          {isCustomer ? (
                            <>
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>Thu Nợ</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>Trả Nợ</span>
                            </>
                          )}
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

      {/* Add Partner Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Thêm Đối Tác Mới</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePartner} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Loại đối tác *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('customer')}
                    className={`py-2 text-xs font-bold rounded-xl border transition badge-nowrap ${
                      newType === 'customer'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black border-cyan-500 shadow-glow-cyan'
                        : 'bg-slate-950 text-slate-400 border-slate-700'
                    }`}
                  >
                    Khách Hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('supplier')}
                    className={`py-2 text-xs font-bold rounded-xl border transition badge-nowrap ${
                      newType === 'supplier'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black border-cyan-500 shadow-glow-cyan'
                        : 'bg-slate-950 text-slate-400 border-slate-700'
                    }`}
                  >
                    Nhà Cung Cấp
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Anh Minh / Kho Sài Gòn..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="VD: 0987654321"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="VD: 06 Nguyễn Trãi, TP Cao Lãnh"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Số CCCD (Khách mua máy)
                </label>
                <input
                  type="text"
                  value={newCccd}
                  onChange={(e) => setNewCccd(e.target.value)}
                  placeholder="12 số CCCD"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Công nợ ban đầu (nếu có)
                </label>
                <MoneyInput
                  value={initialDebt}
                  onValueChange={(num) => setInitialDebt(num)}
                  placeholder="0"
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan"
                >
                  Lưu Đối Tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debt Action Modal */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setSelectedPartner(null);
        }}
        partner={selectedPartner}
        onSuccess={() => fetchPartners()}
      />
    </div>
  );
}
