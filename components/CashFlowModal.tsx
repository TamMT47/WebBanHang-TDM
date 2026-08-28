'use client';

import React, { useState } from 'react';
import { X, DollarSign, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatVND } from '@/lib/format';
import MoneyInput from '@/components/ui/MoneyInput';

interface CashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CashFlowModal({ isOpen, onClose, onSuccess }: CashFlowModalProps) {
  const [type, setType] = useState<'thu' | 'chi'>('chi');
  const [category, setCategory] = useState('chi_phi_khac');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/cash-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          amount,
          payment_method: paymentMethod,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi tạo phiếu thu chi');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200">
        {/* Header */}
        <div className={`px-5 py-4 text-white flex items-center justify-between ${type === 'thu' ? 'bg-emerald-800' : 'bg-rose-800'}`}>
          <div className="flex items-center space-x-2">
            {type === 'thu' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            <h3 className="text-sm font-bold">
              {type === 'thu' ? 'Lập Phiếu Thu Ngoài' : 'Lập Phiếu Chi Ngoài'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-black/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('thu');
                setCategory('chi_phi_khac');
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                type === 'thu'
                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Phiếu Thu (+)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('chi');
                setCategory('chi_phi_khac');
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                type === 'chi'
                  ? 'border-rose-700 bg-rose-700 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Phiếu Chi (-)</span>
            </button>
          </div>

          {/* Amount Auto-formatted */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Số tiền *
            </label>
            <MoneyInput
              value={amount}
              onValueChange={(num) => setAmount(num)}
              placeholder="VD: 500.000"
              className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-base font-black text-gray-950 focus:ring-2 focus:ring-gray-900 font-mono"
            />
            {amount > 0 && (
              <div className="text-[11px] text-gray-500 mt-1 font-semibold">
                Bằng chữ: {formatVND(amount)}
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Hạng mục thu / chi
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-gray-900"
            >
              <option value="chi_phi_khac">Chi phí điện, nước, internet, mặt bằng</option>
              <option value="chi_phi_khac">Tiền ăn uống, tiếp khách, sinh hoạt</option>
              <option value="chi_phi_khac">Chi lương / thưởng nhân viên</option>
              <option value="chi_phi_khac">Quảng cáo Facebook / TikTok Ads</option>
              <option value="chi_phi_khac">Hạng mục thu chi khác</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Nguồn tiền quỹ
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  paymentMethod === 'cash'
                    ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>💵 Quỹ Tiền Mặt</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  paymentMethod === 'transfer'
                    ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>💳 Quỹ Chuyển Khoản</span>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Ghi chú nội dung thu chi *
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Thanh toán tiền điện tháng 8 / Mua văn phòng phẩm..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition ${
                type === 'thu' ? 'bg-emerald-800 hover:bg-emerald-900' : 'bg-rose-800 hover:bg-rose-900'
              } disabled:opacity-50`}
            >
              {loading ? 'Đang lưu...' : 'Lưu Phiếu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
