'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Printer,
  Calendar,
  Phone,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  Trash2,
  AlertTriangle,
  X,
  Filter,
  RotateCcw,
  Edit3,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Order } from '@/types/database';
import InvoiceModal from '@/components/InvoiceModal';
import EditOrderModal from '@/components/EditOrderModal';

interface OrdersViewProps {
  user: any;
  initialSearch?: string;
}

export default function OrdersView({ user, initialSearch = '' }: OrdersViewProps) {
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);
  const isManagerOrOwner = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isStaff = user?.role === 'staff';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'personal'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sell' | 'import'>('all');
  const [search, setSearch] = useState(initialSearch);

  // Time Range Filter (Tháng này mặc định cho tab cá nhân hoặc All)
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'this_month' | 'all' | 'custom'>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected Order for Re-printing
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Edit Order State
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);

  // Delete Order Confirmation Modal
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (scopeFilter === 'personal') params.append('only_mine', 'true');
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (search.trim()) params.append('search', search.trim());

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (timeRange === 'today') {
        params.append('dateFrom', todayStr);
        params.append('dateTo', todayStr);
      } else if (timeRange === '7days') {
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        params.append('dateFrom', d7);
        params.append('dateTo', todayStr);
      } else if (timeRange === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        params.append('dateFrom', firstDay);
        params.append('dateTo', todayStr);
      } else if (timeRange === 'custom' && dateFrom && dateTo) {
        params.append('dateFrom', dateFrom);
        params.append('dateTo', dateTo);
      }

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [scopeFilter, typeFilter, search, timeRange, dateFrom, dateTo]);

  // Personal metrics calculation
  const personalOrdersCount = orders.length;
  const personalTotalSales = orders.reduce((sum, o) => sum + parseFloat(o.final_payment || 0), 0);
  const personalTotalCommission = orders.reduce(
    (sum, o) => sum + (o.seller_id === user?.id ? parseFloat(o.commission_amount || 0) : 0),
    0
  );
  const personalDevicesWithCommissionCount = orders.reduce(
    (count, o) => count + (o.seller_id === user?.id ? (o.items?.length || 0) : 0),
    0
  );

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    const prevOrders = [...orders];
    const deletedId = orderToDelete.id;

    // Optimistically remove from list immediately
    setOrders((prev) => prev.filter((o) => o.id !== deletedId));
    setOrderToDelete(null);

    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetch(`/api/orders?id=${deletedId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setOrders(prevOrders);
        throw new Error(data.error || 'Có lỗi xảy ra khi xóa đơn');
      }
    } catch (err: any) {
      setOrders(prevOrders);
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Header Card with Scope Navigation */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              {scopeFilter === 'personal' ? 'Hóa Đơn & Hoa Hồng Cá Nhân' : 'Lịch Sử Hóa Đơn & Giao Dịch'}
            </h2>
            <p className="text-xs text-slate-400">
              {scopeFilter === 'personal'
                ? `Danh sách các hóa đơn do bạn (${user?.full_name}) tạo hoặc được Quản lý gán hoa hồng bán hàng.`
                : 'Tra cứu toàn bộ hóa đơn bán lẻ (#HD), phiếu nhập (#NH), bảo hành & in phiếu.'}
            </p>
          </div>
        </div>

        {/* Scope Toggle: Tất cả vs Hóa đơn cá nhân */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition badge-nowrap ${
              scopeFilter === 'all'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏢 Tất Cả Hóa Đơn
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('personal')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition badge-nowrap flex items-center space-x-1.5 ${
              scopeFilter === 'personal'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-glow-emerald'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⭐ Hóa Đơn Cá Nhân</span>
            {personalTotalCommission > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 text-[10px] rounded-full font-sans font-bold">
                +{formatVND(personalTotalCommission)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Dashboard Card for Personal Invoices Mode */}
      {scopeFilter === 'personal' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in">
          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đơn Hàng Của Bạn</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-sans">
              {personalOrdersCount} <span className="text-xs text-slate-400 font-normal">đơn</span>
            </div>
            <div className="text-[10px] text-slate-400">Do bạn tạo hoặc nhận hoa hồng</div>
          </div>

          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center space-x-1">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Máy Được Gán Hoa Hồng</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-cyan-300 font-sans">
              {personalDevicesWithCommissionCount} <span className="text-xs text-slate-400 font-normal">máy</span>
            </div>
            <div className="text-[10px] text-slate-400">Máy bán được gán hoa hồng</div>
          </div>

          <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center space-x-1">
              <span className="text-amber-400">💰</span>
              <span>Tổng Doanh Số Đơn</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-sans">
              {formatVND(personalTotalSales)}
            </div>
            <div className="text-[10px] text-slate-400">Trong khoảng thời gian đã chọn</div>
          </div>

          <div className="p-4 bg-gradient-to-br from-emerald-950/60 to-slate-900 rounded-2xl border border-emerald-500/40 shadow-glow-emerald space-y-1">
            <div className="text-[11px] font-bold text-emerald-300 uppercase flex items-center space-x-1">
              <span className="text-emerald-400">🎁</span>
              <span>Hoa Hồng Nhận Được</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-sans">
              +{formatVND(personalTotalCommission)}
            </div>
            <div className="text-[10px] text-emerald-300/80 font-semibold">Tự động cộng dồn vào bảng lương</div>
          </div>
        </div>
      )}

      {/* Filter Bar with Time Range */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          
          {/* Search Box (5 cols) */}
          <div className="relative sm:col-span-5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Mã #HD..., tên khách, SĐT, IMEI..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type Filter (3 cols) */}
          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả Loại đơn</option>
              <option value="sell">🛒 Hóa đơn Bán hàng</option>
              <option value="import">📥 Phiếu Nhập hàng</option>
            </select>
          </div>

          {/* Time Range Preset (4 cols) */}
          <div className="sm:col-span-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
            >
              <option value="this_month">📅 Tháng này (Mặc định)</option>
              <option value="today">📅 Hôm nay</option>
              <option value="7days">📅 7 ngày qua</option>
              <option value="all">📅 Toàn bộ thời gian</option>
              <option value="custom">📅 Tùy chọn khoảng ngày...</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {timeRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs animate-in fade-in">
            <span className="font-bold text-slate-300">Từ ngày:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white"
            />
            <span className="font-bold text-slate-300">Đến ngày:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white"
            />
            <button
              type="button"
              onClick={fetchOrders}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-lg font-bold text-xs shadow-glow-cyan badge-nowrap"
            >
              Lọc Ngay
            </button>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">Đang tải lịch sử đơn...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            Không tìm thấy hóa đơn nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Mã Đơn</th>
                  <th className="px-4 py-3.5">Thời Gian</th>
                  <th className="px-4 py-3.5">Khách Hàng / NCC</th>
                  <th className="px-4 py-3.5">Chi Tiết Máy, IMEI & Bảo Hành</th>
                  <th className="px-4 py-3.5">Khách Cần Trả</th>
                  <th className="px-4 py-3.5">Đã Thanh Toán</th>
                  <th className="px-4 py-3.5">Công Nợ</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {orders.map((order) => {
                  const isSell = order.type === 'sell';
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/50 transition duration-150">
                      <td className="px-4 py-3.5 font-extrabold text-white font-mono">
                        <div className="flex items-center space-x-1.5 badge-nowrap">
                          {isSell ? (
                            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded border border-emerald-500/30">
                              HD
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] font-black rounded border border-cyan-500/30">
                              NH
                            </span>
                          )}
                          <span>#{order.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="badge-nowrap">{new Date(order.created_at).toLocaleDateString('vi-VN')}</div>
                        <div className="text-[10px] text-slate-500 badge-nowrap">
                          {new Date(order.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white">{order.partner_name || 'Khách lẻ'}</div>
                        <div className="text-[10px] font-mono text-slate-400 badge-nowrap">{order.partner_phone || 'N/A'}</div>
                        {order.partner_address && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{order.partner_address}</div>
                        )}
                        <div className="mt-1 space-y-0.5">
                          {order.created_by === user?.id && (
                            <div className="text-[9px] font-bold text-blue-300 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40 w-fit badge-nowrap">
                              ✍️ Bạn tạo đơn
                            </div>
                          )}
                          {order.seller_id === user?.id ? (
                            <div className="flex items-center space-x-1 text-[10px] text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded-lg border border-emerald-500/40 w-fit badge-nowrap font-bold">
                              <span>🎁 Hoa hồng của bạn:</span>
                              <span className="font-sans font-black">+{formatVND(order.commission_amount || 0)}</span>
                            </div>
                          ) : order.seller_name ? (
                            <div className="flex items-center space-x-1 text-[10px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 w-fit badge-nowrap">
                              <span>👤 Bán:</span>
                              <span className="font-bold">{order.seller_name}</span>
                            </div>
                          ) : (
                            <div className="text-[9px] text-slate-500 italic">
                              🏢 Khách của cửa hàng
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="space-y-1.5">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <span className="font-bold text-slate-200">{item.product_name}</span>
                                {item.storage && (
                                  <span className="text-[10px] text-cyan-400 font-bold badge-nowrap">
                                    {item.storage}
                                  </span>
                                )}
                                {item.color && (
                                  <span className="text-[10px] text-slate-400 badge-nowrap">
                                    ({item.color})
                                  </span>
                                )}
                                <span className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 font-bold border border-slate-800 badge-nowrap">
                                  {item.imei}
                                </span>
                              </div>
                              
                              {/* Warranty Details */}
                              {isSell && (
                                <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold badge-nowrap">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                  <span>
                                    BH {item.warranty_months !== undefined ? item.warranty_months : 12}T
                                    {item.warranty_until && ` (Đến ${new Date(item.warranty_until).toLocaleDateString('vi-VN')})`}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {order.trade_in_value > 0 && (
                            <div className="text-[10px] font-bold text-amber-300 badge-nowrap pt-0.5">
                              🔄 Thu cũ đổi mới: -{formatVND(order.trade_in_value)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-black text-sm font-sans text-cyan-300 tracking-tight badge-nowrap">
                        {formatVND(order.final_payment)}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-emerald-400 font-sans tracking-tight badge-nowrap">
                        {formatVND(order.paid_amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        {order.debt_added > 0 ? (
                          <span className="text-rose-400 font-bold font-sans tracking-tight badge-nowrap">
                            +{formatVND(order.debt_added)}
                          </span>
                        ) : order.debt_added < 0 ? (
                          <span className="text-emerald-400 font-bold font-sans tracking-tight badge-nowrap">
                            -{formatVND(Math.abs(order.debt_added))}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium badge-nowrap">Đủ tiền</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isSell && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsInvoiceOpen(true);
                              }}
                              title="In hóa đơn chuẩn A4"
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1 transition badge-nowrap shadow-sm"
                            >
                              <Printer className="w-3.5 h-3.5 text-cyan-400" />
                              <span>In A4</span>
                            </button>
                          )}

                          {isManagerOrOwner && isSell && (
                            <button
                              onClick={() => {
                                setEditingOrder(order);
                                setIsEditOrderOpen(true);
                              }}
                              title="Chỉnh sửa hóa đơn & bảo hành"
                              className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-xl flex items-center space-x-1 transition badge-nowrap shadow-sm"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Sửa</span>
                            </button>
                          )}

                          {isAdminOrOwner && (
                            <button
                              onClick={() => setOrderToDelete(order)}
                              title="Xóa/Hủy hóa đơn (Admin)"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Edit Order Modal */}
      {isEditOrderOpen && editingOrder && (
        <EditOrderModal
          isOpen={isEditOrderOpen}
          onClose={() => {
            setIsEditOrderOpen(false);
            setEditingOrder(null);
          }}
          order={editingOrder}
          currentUser={user}
          onOrderUpdated={() => {
            fetchOrders();
          }}
        />
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-rose-950 text-white flex items-center justify-between border-b border-rose-900/60">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">Xác Nhận Hủy / Xóa Đơn #{orderToDelete.code}</h3>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Bạn có chắc chắn muốn xóa đơn hàng <b>#{orderToDelete.code}</b> ({orderToDelete.type === 'sell' ? 'Hóa đơn Bán lẻ' : 'Phiếu Nhập hàng'})?
              </p>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                <div>• Đối tác: <b className="text-white">{orderToDelete.partner_name || 'Khách lẻ'}</b></div>
                <div>• Tổng thanh toán: <b className="text-cyan-300">{formatVND(orderToDelete.final_payment)}</b></div>
                <div className="text-amber-300 font-semibold">
                  ⚠️ Lưu ý: Khi xóa, các máy trong đơn sẽ tự động hoàn kho / cập nhật lại công nợ đối tác & sổ quỹ tương ứng.
                </div>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-glow-rose transition active:scale-95 disabled:opacity-50"
                >
                  {deleting ? 'Đang Xóa...' : 'Xóa Hóa Đơn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Re-printing A4 */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </div>
  );
}
