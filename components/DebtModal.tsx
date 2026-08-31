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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className={`px-5 py-4 text-white flex items-center justify-between border-b ${isCustomer ? 'bg-emerald-950/80 border-emerald-800/60' : 'bg-blue-950/80 border-blue-800/60'}`}>
          <div className="flex items-center space-x-2">
            {isCustomer ? <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> : <ArrowUpRight className="w-5 h-5 text-cyan-400" />}
            <h3 className="text-sm font-bold">
              {isCustomer ? 'Thu Tiền Nợ Khách Hàng' : 'Trả Tiền Nợ Nhà Cung Cấp'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Partner Info Box */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Đối tác:</span>
              <span className="font-bold text-white">{partner.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Số điện thoại:</span>
              <span className="font-mono text-slate-300">{partner.phone}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-800 text-sm">
              <span className="font-semibold text-slate-300">Công nợ hiện tại:</span>
              <span className={`font-black font-mono badge-nowrap ${isCustomer ? 'text-rose-400' : 'text-cyan-400'}`}>
                {formatVND(currentDebt)}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Amount input Auto-formatted */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-300">
                Số tiền {isCustomer ? 'thu nợ' : 'trả nợ'} *
              </label>
              <button
                type="button"
                onClick={() => setAmount(currentDebt)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded-lg text-cyan-300 border border-slate-700 transition badge-nowrap"
              >
                Trả hết ({formatVND(currentDebt)})
              </button>
            </div>

            <MoneyInput
              value={amount}
              onValueChange={(num) => setAmount(num)}
              placeholder="VD: 1.000.000"
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-black text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
            {amount > 0 && (
              <div className="text-[11px] text-cyan-400 mt-1 font-semibold badge-nowrap">
                Bằng chữ: {formatVND(amount)}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Hình thức thanh toán
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition badge-nowrap ${
                  paymentMethod === 'cash'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>💵 Tiền mặt</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition badge-nowrap ${
                  paymentMethod === 'transfer'
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>💳 Chuyển khoản</span>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Thu nợ đợt 1 / Khách CK Vietcombank..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition badge-nowrap ${
                isCustomer ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
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
