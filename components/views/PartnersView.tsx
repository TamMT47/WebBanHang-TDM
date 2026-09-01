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
  CheckCircle2,
  Edit2,
  Eye,
  Printer,
  ExternalLink,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Partner } from '@/types/database';
import DebtModal from '@/components/DebtModal';
import MoneyInput from '@/components/ui/MoneyInput';
import InvoiceModal from '@/components/InvoiceModal';
import { exportCustomersToCSV } from '@/lib/exportHelper';

interface PartnersViewProps {
  user: any;
  onNavigateToOrder?: (orderCode: string) => void;
}

export default function PartnersView({ user, onNavigateToOrder }: PartnersViewProps) {
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

  // Edit Partner Modal
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editType, setEditType] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [editAddress, setEditAddress] = useState('');
  const [editCccd, setEditCccd] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Partner Purchase History Modal
  const [historyPartner, setHistoryPartner] = useState<Partner | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [partnerOrders, setPartnerOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Selected Order for Invoice View
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi thêm đối tác');

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

  const handleOpenEdit = (p: Partner) => {
    setEditingPartner(p);
    setEditName(p.name);
    setEditPhone(p.phone);
    setEditType((p.type as any) || 'customer');
    setEditAddress(p.address || '');
    setEditCccd(p.cccd || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner || !editName.trim() || !editPhone.trim()) return;

    try {
      setEditLoading(true);
      setEditError(null);

      const res = await fetch('/api/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPartner.id,
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          cccd: editCccd.trim(),
          type: editType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật đối tác');

      setIsEditOpen(false);
      setEditingPartner(null);
      fetchPartners();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const openPartnerHistory = async (p: Partner) => {
    setHistoryPartner(p);
    setIsHistoryOpen(true);
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/orders?partner_id=${p.id}&limit=50`);
      const data = await res.json();
      setPartnerOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportCustomers = () => {
    const customerList = partners.filter((p) => p.type === 'customer' || p.type === 'both');
    if (customerList.length === 0) {
      alert('Không có dữ liệu khách hàng để xuất file.');
      return;
    }
    exportCustomersToCSV(customerList);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Quản Lý Khách Hàng & Nhà Cung Cấp
            </h2>
            <p className="text-xs text-slate-400">
              Tra cứu danh bạ, xem lịch sử mua hàng, sửa thông tin đối tác và quản lý sổ nợ 2 chiều.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCustomers}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 badge-nowrap shadow-sm"
            title="Tải toàn bộ danh sách khách hàng về máy tính dưới dạng file Excel / CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Xuất Data Khách</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1.5 self-start sm:self-auto badge-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-950 font-black" />
            <span>+ Thêm Đối Tác</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
            Khách Nợ Cửa Hàng
          </div>
          <div className="text-sm sm:text-lg font-black text-rose-400 font-sans tracking-tight">
            {formatVND(stats.total_customer_debt)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.customer_debtors_count} khách chưa thanh toán đủ
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
            Cửa Hàng Nợ NCC
          </div>
          <div className="text-sm sm:text-lg font-black text-amber-400 font-sans tracking-tight">
            {formatVND(stats.total_supplier_debt)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.supplier_debtors_count} nhà cung cấp cần trả
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
            Tổng Đối Tác Nợ
          </div>
          <div className="text-sm sm:text-lg font-black text-cyan-400 font-sans tracking-tight">
            {stats.total_debtors_count}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Phát sinh công nợ</div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl">
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
            Tổng Danh Bạ
          </div>
          <div className="text-sm sm:text-lg font-black text-emerald-400 font-sans tracking-tight">
            {partners.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Khách hàng & NCC</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, SĐT, CCCD..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả Đối Tác</option>
              <option value="customer">👤 Khách Hàng</option>
              <option value="supplier">🏢 Nhà Cung Cấp</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={debtStatusFilter}
              onChange={(e) => setDebtStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả Công Nợ</option>
              <option value="has_debt">⚠️ Đang Có Nợ</option>
              <option value="no_debt">✓ Hết Nợ (0 đ)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="debt_desc">📉 Số nợ giảm dần</option>
              <option value="name_asc">🔤 Tên A - Z</option>
              <option value="created_desc">🕒 Mới thêm gần đây</option>
            </select>
          </div>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">Đang tải danh bạ...</div>
        ) : partners.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            Không tìm thấy đối tác nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Đối Tác</th>
                  <th className="px-4 py-3.5">Liên Hệ</th>
                  <th className="px-4 py-3.5">Phân Loại</th>
                  <th className="px-4 py-3.5">Lịch Sử Mua</th>
                  <th className="px-4 py-3.5">Số Dư Công Nợ</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {partners.map((p) => {
                  const debt = parseFloat((p.debt as any) || 0);
                  const isCustomer = p.type === 'customer' || p.type === 'both';
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition duration-150">
                      
                      {/* Name & CCCD */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center font-bold text-xs border border-slate-700">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{p.name}</div>
                            {p.cccd && (
                              <div className="text-[10px] font-mono text-slate-400">CCCD: {p.cccd}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact & Address */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-cyan-300 badge-nowrap">{p.phone}</div>
                        {p.address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{p.address}</div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3.5">
                        {p.type === 'customer' && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-bold rounded-lg border border-cyan-500/30 badge-nowrap">
                            Khách Hàng
                          </span>
                        )}
                        {p.type === 'supplier' && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded-lg border border-purple-500/30 badge-nowrap">
                            Nhà Cung Cấp
                          </span>
                        )}
                        {p.type === 'both' && (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/30 badge-nowrap">
                            Vừa Mua / Vừa Cung Cấp
                          </span>
                        )}
                      </td>

                      {/* Orders Count & History Button */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => openPartnerHistory(p)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition badge-nowrap"
                          title="Xem danh sách hóa đơn mà khách đã mua"
                        >
                          <ShoppingBag className="w-3 h-3 text-cyan-400" />
                          <span>{(p as any).total_orders || 0} Đơn hàng</span>
                        </button>
                      </td>

                      {/* Debt Status */}
                      <td className="px-4 py-3.5">
                        {debt === 0 ? (
                          <span className="text-slate-500 font-medium badge-nowrap">0 đ (Hết nợ)</span>
                        ) : debt > 0 ? (
                          <div>
                            <div className="font-black text-sm text-rose-400 tracking-tight font-sans badge-nowrap">
                              +{formatVND(debt)}
                            </div>
                            <div className="text-[10px] font-bold text-rose-400/80 badge-nowrap">
                              Khách nợ shop
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-black text-sm text-amber-400 tracking-tight font-sans badge-nowrap">
                              -{formatVND(Math.abs(debt))}
                            </div>
                            <div className="text-[10px] font-bold text-amber-400/80 badge-nowrap">
                              Cửa hàng nợ NCC
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit Partner Button */}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Sửa thông tin khách hàng / nhà cung cấp"
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Debt adjustment button */}
                          <button
                            onClick={() => {
                              setSelectedPartner(p);
                              setIsDebtModalOpen(true);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-sm active:scale-95 badge-nowrap ${
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
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="VD: 0988123456..."
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
                  placeholder="VD: 123 Lê Duẩn, Đà Nẵng..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  CCCD / CMND (Không bắt buộc)
                </label>
                <input
                  type="text"
                  value={newCccd}
                  onChange={(e) => setNewCccd(e.target.value)}
                  placeholder="Số CCCD..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-glow-cyan"
                >
                  Lưu Đối Tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Partner Modal */}
      {isEditOpen && editingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Sửa Thông Tin: {editingPartner.name}</h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePartner} className="p-5 space-y-3.5 text-xs">
              {editError && (
                <div className="p-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Loại đối tác *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditType('customer')}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition badge-nowrap ${
                      editType === 'customer'
                        ? 'bg-cyan-500 text-slate-950 font-black border-cyan-500 shadow-glow-cyan'
                        : 'bg-slate-950 text-slate-400 border-slate-700'
                    }`}
                  >
                    Khách Hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('supplier')}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition badge-nowrap ${
                      editType === 'supplier'
                        ? 'bg-purple-500 text-white font-black border-purple-500'
                        : 'bg-slate-950 text-slate-400 border-slate-700'
                    }`}
                  >
                    Nhà Cung Cấp
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('both')}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition badge-nowrap ${
                      editType === 'both'
                        ? 'bg-emerald-500 text-slate-950 font-black border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-700'
                    }`}
                  >
                    Cả Hai
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Số điện thoại *</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">CCCD / CMND</label>
                <input
                  type="text"
                  value={editCccd}
                  onChange={(e) => setEditCccd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-glow-cyan"
                >
                  {editLoading ? 'Đang Lưu...' : 'Cập Nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partner Purchase History Modal */}
      {isHistoryOpen && historyPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase">
                    Lịch Sử Mua Hàng: {historyPartner.name}
                  </h3>
                  <div className="text-[11px] font-mono text-cyan-300">
                    SĐT: {historyPartner.phone} • Tổng đơn: {partnerOrders.length}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto text-xs space-y-3">
              {historyLoading ? (
                <div className="text-center py-12 text-slate-400 animate-pulse">
                  Đang tải danh sách hóa đơn...
                </div>
              ) : partnerOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  Khách hàng này chưa có đơn mua hàng nào trong hệ thống.
                </div>
              ) : (
                partnerOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded border border-emerald-500/30">
                          #{order.code}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(order.created_at).toLocaleDateString('vi-VN')} lúc{' '}
                          {new Date(order.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrderForPrint(order);
                            setIsInvoiceOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3 text-cyan-400" />
                          <span>In A4</span>
                        </button>

                        {onNavigateToOrder && (
                          <button
                            onClick={() => {
                              setIsHistoryOpen(false);
                              onNavigateToOrder(order.code);
                            }}
                            className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-lg text-[11px] flex items-center space-x-1 shadow-glow-cyan"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Mở Tab Hóa Đơn</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-1 pt-1">
                      {order.items?.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white">{it.product_name}</span>
                            {it.storage && <span className="text-cyan-400 font-bold">{it.storage}</span>}
                            <span className="font-mono text-slate-400 bg-slate-900 px-1 rounded border border-slate-800">
                              IMEI: {it.imei}
                            </span>
                            {it.warranty_months && (
                              <span className="text-emerald-400 font-semibold flex items-center space-x-0.5">
                                <ShieldCheck className="w-3 h-3" />
                                <span>BH {it.warranty_months}T</span>
                              </span>
                            )}
                          </div>
                          <span className="font-sans font-bold text-cyan-300">
                            {formatVND(it.price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Summary Row */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="text-slate-400">
                        Đã thanh toán:{' '}
                        <span className="text-emerald-400 font-bold font-sans">
                          {formatVND(order.paid_amount)}
                        </span>
                      </div>
                      <div className="font-black text-cyan-300 font-sans">
                        Tổng tiền: {formatVND(order.final_payment)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debt Action Modal */}
      {selectedPartner && (
        <DebtModal
          isOpen={isDebtModalOpen}
          onClose={() => {
            setIsDebtModalOpen(false);
            setSelectedPartner(null);
          }}
          partner={selectedPartner}
          onSuccess={() => {
            fetchPartners();
          }}
        />
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setSelectedOrderForPrint(null);
        }}
        order={selectedOrderForPrint}
      />
    </div>
  );
}
