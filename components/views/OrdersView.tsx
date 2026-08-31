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
  RotateCcw
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Order } from '@/types/database';
import InvoiceModal from '@/components/InvoiceModal';

interface OrdersViewProps {
  user: any;
}

export default function OrdersView({ user }: OrdersViewProps) {
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'sell' | 'import'>('all');
  const [search, setSearch] = useState('');

  // Time Range Filter
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'this_month' | 'all' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected Order for Re-printing
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Delete Order Confirmation Modal
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
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
  }, [typeFilter, search, timeRange, dateFrom, dateTo]);

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);

      const res = await fetch(`/api/orders?id=${orderToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi xóa đơn');
      }

      setOrderToDelete(null);
      fetchOrders();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Lịch Sử Hóa Đơn & Giao Dịch
            </h2>
            <p className="text-xs text-slate-400">
              Tra cứu hóa đơn bán lẻ (#HD), phiếu nhập kho (#NH), lọc theo thời gian và in lại hóa đơn chuẩn A4.
            </p>
          </div>
        </div>
      </div>

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
              <option value="all">📅 Toàn bộ thời gian</option>
              <option value="today">📅 Hôm nay</option>
              <option value="7days">📅 7 ngày qua</option>
              <option value="this_month">📅 Tháng này</option>
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
                  <th className="px-4 py-3.5">Chi Tiết Máy & IMEI</th>
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
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="space-y-1">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-1 flex-wrap">
                              <span className="font-bold text-slate-200">{item.product_name}</span>
                              <span className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 font-bold border border-slate-800 badge-nowrap">
                                {item.imei}
                              </span>
                            </div>
                          ))}
                          {order.trade_in_value > 0 && (
                            <div className="text-[10px] font-bold text-amber-300 badge-nowrap">
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
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1 transition badge-nowrap shadow-sm"
                            >
                              <Printer className="w-3.5 h-3.5 text-cyan-400" />
                              <span>In A4</span>
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
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {deleteError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl font-medium">
                  {deleteError}
                </div>
              )}

              <p className="text-slate-200 font-semibold leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng <b className="text-rose-400 font-mono">#{orderToDelete.code}</b>?
              </p>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                <div className="font-bold text-white">Khi xóa đơn này, hệ thống sẽ tự động:</div>
                {orderToDelete.type === 'sell' ? (
                  <>
                    <div>• Hoàn trả trạng thái các máy đã bán trong đơn về <b className="text-emerald-400">Còn Hàng (in_stock)</b>.</div>
                    <div>• Hủy bỏ và hoàn trả công nợ khách hàng đã ghi nhận (+{formatVND(orderToDelete.debt_added)}).</div>
                    <div>• Xóa phiếu thu tiền liên quan trong Sổ Quỹ.</div>
                  </>
                ) : (
                  <>
                    <div>• Xóa các máy nhập kho nếu chưa được bán ra.</div>
                    <div>• Hoàn lại công nợ đối với Nhà cung cấp.</div>
                    <div>• Xóa phiếu chi tiền nhập hàng trong Sổ Quỹ.</div>
                  </>
                )}
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
                >
                  {deleting ? 'Đang Xóa...' : 'Xác Nhận Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
