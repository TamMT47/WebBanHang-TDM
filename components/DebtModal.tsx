'use client';

import React, { useState } from 'react';
import { X, DollarSign, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Partner } from '@/types/database';
import MoneyInput from '@/components/ui/MoneyInput';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  onSuccess: () => void;
}

export default function DebtModal({ isOpen, onClose, partner, onSuccess }: DebtModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !partner) return null;

  const isCustomer = partner.type === 'customer' || partner.debt >= 0;
  const currentDebt = Math.abs(partner.debt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const action = isCustomer ? 'thu_no' : 'tra_no';
      const res = await fetch('/api/partners/adjust-debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partner.id,
          action,
          amount,
          payment_method: paymentMethod,
          note: note || (isCustomer ? `Thu tiền nợ khách ${partner.name}` : `Trả nợ nhà cung cấp ${partner.name}`),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi xử lý công nợ');
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
        <div className={`px-5 py-4 text-white flex items-center justify-between ${isCustomer ? 'bg-emerald-800' : 'bg-blue-900'}`}>
          <div className="flex items-center space-x-2">
            {isCustomer ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            <h3 className="text-sm font-bold">
              {isCustomer ? 'Thu Tiền Nợ Khách Hàng' : 'Trả Tiền Nợ Nhà Cung Cấp'}
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
          
          {/* Partner Info Box */}
          <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Đối tác:</span>
              <span className="font-bold text-gray-900">{partner.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số điện thoại:</span>
              <span className="font-mono">{partner.phone}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-200 text-sm">
              <span className="font-semibold text-gray-700">Công nợ hiện tại:</span>
              <span className={`font-bold font-mono ${isCustomer ? 'text-red-600' : 'text-blue-700'}`}>
                {formatVND(currentDebt)}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Amount input Auto-formatted */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-700">
                Số tiền {isCustomer ? 'thu nợ' : 'trả nợ'} *
              </label>
              <button
                type="button"
                onClick={() => setAmount(currentDebt)}
                className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-[10px] font-bold rounded-md text-gray-800 transition"
              >
                Trả hết ({formatVND(currentDebt)})
              </button>
            </div>

            <MoneyInput
              value={amount}
              onValueChange={(num) => setAmount(num)}
              placeholder="VD: 1.000.000"
              className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-base font-black text-gray-950 focus:ring-2 focus:ring-gray-900 font-mono"
            />
            {amount > 0 && (
              <div className="text-[11px] text-gray-500 mt-1 font-semibold">
                Bằng chữ: {formatVND(amount)}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Hình thức thanh toán
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
                <span>💵 Tiền mặt</span>
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
                <span>💳 Chuyển khoản</span>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Thu nợ đợt 1 / Khách CK Vietcombank..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
            />
          </div>

          {/* Submit */}
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
                isCustomer ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-blue-800 hover:bg-blue-900'
              } disabled:opacity-50`}
            >
              {loading ? 'Đang xử lý...' : isCustomer ? 'Xác Nhận Thu Nợ' : 'Xác Nhận Trả Nợ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
