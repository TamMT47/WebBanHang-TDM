'use client';

import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Shield,
  Calendar,
  Phone,
  User,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Save,
  Clock,
  Sparkles
} from 'lucide-react';
import { formatVND } from '@/lib/format';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onOrderUpdated: () => void;
}

export default function EditOrderModal({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
}: EditOrderModalProps) {
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerAddress, setPartnerAddress] = useState('');
  const [partnerCccd, setPartnerCccd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'both'>('transfer');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [items, setItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setPartnerName(order.partner_name || '');
      setPartnerPhone(order.partner_phone || '');
      setPartnerAddress(order.partner_address || '');
      setPartnerCccd(order.partner_cccd || '');
      setPaymentMethod(order.payment_method || 'transfer');
      setDiscount(parseFloat(order.discount || 0));
      setPaidAmount(parseFloat(order.paid_amount || 0));

      const mappedItems = (order.items || []).map((it: any) => {
        let until = it.warranty_until;
        if (!until && it.warranty_months) {
          const d = new Date(order.created_at || new Date());
          d.setMonth(d.getMonth() + parseInt(it.warranty_months, 10));
          until = d.toISOString();
        }
        return {
          id: it.id,
          product_name: it.product_name,
          imei: it.imei,
          color: it.color,
          storage: it.storage,
          condition: it.condition,
          battery_health: it.battery_health,
          price: parseFloat(it.price || 0),
          warranty_months: it.warranty_months !== undefined ? parseInt(it.warranty_months, 10) : 12,
          warranty_until: until ? until.slice(0, 10) : '',
        };
      });
      setItems(mappedItems);
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleWarrantyMonthsChange = (index: number, months: number) => {
    const newItems = [...items];
    const item = newItems[index];
    item.warranty_months = months;
    
    // Calculate new date based on order creation date
    const d = new Date(order.created_at || new Date());
    d.setMonth(d.getMonth() + months);
    item.warranty_until = d.toISOString().slice(0, 10);
    
    setItems(newItems);
  };

  const handleWarrantyDateChange = (index: number, dateStr: string) => {
    const newItems = [...items];
    const item = newItems[index];
    item.warranty_until = dateStr;
    
    if (dateStr) {
      const orderDate = new Date(order.created_at || new Date()).getTime();
      const targetDate = new Date(dateStr).getTime();
      const diffMonths = Math.max(0, Math.round((targetDate - orderDate) / (1000 * 60 * 60 * 24 * 30.4375)));
      item.warranty_months = diffMonths;
    }
    setItems(newItems);
  };

  const handlePriceChange = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].price = price;
    setItems(newItems);
  };

  // Financial calculations
  const totalAmount = items.reduce((sum, it) => sum + (parseFloat(it.price) || 0), 0);
  const tradeInVal = parseFloat(order.trade_in_value || 0);
  const finalPayment = Math.max(0, totalAmount - (parseFloat(discount as any) || 0) - tradeInVal);
  const debtAdded = finalPayment - (parseFloat(paidAmount as any) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const payload = {
        order_id: order.id,
        partner_name: partnerName.trim(),
        partner_phone: partnerPhone.trim(),
        partner_address: partnerAddress.trim(),
        partner_cccd: partnerCccd.trim(),
        payment_method: paymentMethod,
        discount: parseFloat(discount as any) || 0,
        paid_amount: parseFloat(paidAmount as any) || 0,
        items: items.map((it) => ({
          id: it.id,
          warranty_months: it.warranty_months,
          warranty_until: it.warranty_until ? new Date(it.warranty_until).toISOString() : null,
          price: it.price,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật hóa đơn');

      onOrderUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const warrantyPresets = [
    { label: '1 Tháng', months: 1 },
    { label: '3 Tháng', months: 3 },
    { label: '6 Tháng', months: 6 },
    { label: '12 Tháng (Chuẩn)', months: 12 },
    { label: '18 Tháng', months: 18 },
    { label: '24 Tháng', months: 24 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-glow-cyan">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Chỉnh Sửa Hóa Đơn #{order.code}
              </h3>
              <div className="text-[11px] text-slate-400">
                Ngày lập: {new Date(order.created_at).toLocaleDateString('vi-VN')} • Quyền hạn: Quản lý / Chủ cửa hàng
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-2xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Customer Info */}
          <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="font-bold text-slate-200 uppercase text-[11px] flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Thông Tin Khách Hàng / Người Mua</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Họ và tên khách</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Họ tên khách hàng..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="Số điện thoại..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={partnerAddress}
                  onChange={(e) => setPartnerAddress(e.target.value)}
                  placeholder="Địa chỉ giao nhận / cư trú..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">CCCD / CMND (nếu có)</label>
                <input
                  type="text"
                  value={partnerCccd}
                  onChange={(e) => setPartnerCccd(e.target.value)}
                  placeholder="Số CCCD..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Items & Warranty Package Adjustment */}
          <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="font-bold text-slate-200 uppercase text-[11px] flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chỉnh Sửa Gói Bảo Hành & Đơn Giá Từng Sản Phẩm</span>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="font-black text-white text-xs flex items-center space-x-2">
                        <span>{it.product_name}</span>
                        {it.storage && <span className="text-cyan-400 font-bold">{it.storage}</span>}
                        {it.color && <span className="text-slate-400">({it.color})</span>}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        IMEI: <span className="text-cyan-300 font-bold">{it.imei}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Đơn giá bán:</span>
                      <input
                        type="number"
                        value={it.price}
                        onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-32 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-sans font-bold text-cyan-300 text-right focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Warranty Controls */}
                  <div className="pt-1.5 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Thời Hạn Bảo Hành Phần Cứng:</span>
                      </span>
                      <span className="text-[11px] font-black text-white">
                        {it.warranty_months} Tháng
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {warrantyPresets.map((wp) => (
                        <button
                          key={wp.months}
                          type="button"
                          onClick={() => handleWarrantyMonthsChange(idx, wp.months)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition badge-nowrap ${
                            it.warranty_months === wp.months
                              ? 'bg-emerald-600 text-slate-950 font-black border-emerald-500 shadow-glow-emerald'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {wp.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Expiry Date */}
                    <div className="flex items-center space-x-2 pt-1">
                      <label className="text-[11px] text-slate-400 font-semibold badge-nowrap">
                        Hoặc chọn trực tiếp ngày hết hạn:
                      </label>
                      <input
                        type="date"
                        value={it.warranty_until}
                        onChange={(e) => handleWarrantyDateChange(idx, e.target.value)}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Financials & Payment Method */}
          <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="font-bold text-slate-200 uppercase text-[11px] flex items-center space-x-1.5">
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tổng Tiền & Hình Thức Thanh Toán</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Giảm giá chiết khấu</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-sans font-bold text-amber-300 focus:outline-none focus:border-cyan-500 text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tiền khách đã trả</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-sans font-bold text-emerald-400 focus:outline-none focus:border-cyan-500 text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hình thức thanh toán</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="transfer">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="both">Hỗn hợp (Tiền mặt + CK)</option>
                </select>
              </div>
            </div>

            {/* Live Financial Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Tổng tiền máy</span>
                <span className="font-sans font-bold text-slate-200 tracking-tight">{formatVND(totalAmount)}</span>
              </div>
              {tradeInVal > 0 && (
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">Khấu trừ Trade-in</span>
                  <span className="font-sans font-bold text-amber-300 tracking-tight">-{formatVND(tradeInVal)}</span>
                </div>
              )}
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-cyan-400 uppercase font-bold block">Khách cần thanh toán</span>
                <span className="font-sans font-black text-cyan-300 tracking-tight">{formatVND(finalPayment)}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-rose-400 uppercase font-bold block">Công nợ đơn hàng</span>
                <span className={`font-sans font-black tracking-tight ${debtAdded > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {debtAdded > 0 ? `+${formatVND(debtAdded)}` : 'Đủ tiền (0 đ)'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
            >
              Đóng / Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-glow-cyan transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Đang Lưu Thay Đổi...' : 'Lưu & Cập Nhật Hóa Đơn'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
