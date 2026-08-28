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
  X
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
  }, [typeFilter, search]);

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
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-gray-950 text-white rounded-xl">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
              Lịch Sử Hóa Đơn & Giao Dịch
            </h2>
            <p className="text-xs text-gray-500">
              Tra cứu hóa đơn bán lẻ (#HD), phiếu nhập kho (#NH) và in lại hóa đơn chuẩn A4.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Mã hóa đơn #HD..., tên khách hàng, SĐT hoặc IMEI..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none"
            >
              <option value="all">Tất cả Loại đơn</option>
              <option value="sell">🛒 Hóa đơn Bán hàng</option>
              <option value="import">📥 Phiếu Nhập hàng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-gray-400">Đang tải lịch sử đơn...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-xs text-gray-500">
            Không tìm thấy hóa đơn nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Mã Đơn</th>
                  <th className="px-4 py-3">Thời Gian</th>
                  <th className="px-4 py-3">Khách Hàng / NCC</th>
                  <th className="px-4 py-3">Chi Tiết Máy & IMEI</th>
                  <th className="px-4 py-3">Khách Cần Trả</th>
                  <th className="px-4 py-3">Đã Thanh Toán</th>
                  <th className="px-4 py-3">Công Nợ</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const isSell = order.type === 'sell';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-4 py-3 font-extrabold text-gray-950 font-mono">
                        <div className="flex items-center space-x-1.5">
                          {isSell ? (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded">
                              HD
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded">
                              NH
                            </span>
                          )}
                          <span>#{order.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{new Date(order.created_at).toLocaleDateString('vi-VN')}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-950">{order.partner_name || 'Khách lẻ'}</div>
                        <div className="text-[10px] font-mono text-gray-500">{order.partner_phone || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="space-y-1">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-1">
                              <span className="font-bold text-gray-900">{item.product_name}</span>
                              <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-bold">
                                {item.imei}
                              </span>
                            </div>
                          ))}
                          {order.trade_in_value > 0 && (
                            <div className="text-[10px] font-bold text-amber-800">
                              🔄 Thu cũ đổi mới: -{formatVND(order.trade_in_value)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-black text-sm font-mono text-gray-950">
                        {formatVND(order.final_payment)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700 font-mono">
                        {formatVND(order.paid_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {order.debt_added > 0 ? (
                          <span className="text-red-600 font-bold font-mono">
                            +{formatVND(order.debt_added)}
                          </span>
                        ) : order.debt_added < 0 ? (
                          <span className="text-emerald-700 font-bold font-mono">
                            -{formatVND(Math.abs(order.debt_added))}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">Đủ tiền</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isSell && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsInvoiceOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center space-x-1 transition shadow-sm"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-400" />
                              <span>In A4</span>
                            </button>
                          )}

                          {isAdminOrOwner && (
                            <button
                              onClick={() => setOrderToDelete(order)}
                              title="Xóa/Hủy hóa đơn (Admin)"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200">
            <div className="px-5 py-4 bg-red-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h3 className="text-sm font-bold">Xác Nhận Hủy / Xóa Đơn #{orderToDelete.code}</h3>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                  {deleteError}
                </div>
              )}

              <p className="text-gray-800 font-semibold leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng <b className="text-red-600 font-mono">#{orderToDelete.code}</b>?
              </p>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5 text-[11px] text-gray-600">
                <div className="font-bold text-gray-900">Khi xóa đơn này, hệ thống sẽ tự động:</div>
                {orderToDelete.type === 'sell' ? (
                  <>
                    <div>• Hoàn trả trạng thái các máy đã bán trong đơn về <b>Còn Hàng (in_stock)</b>.</div>
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
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
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
