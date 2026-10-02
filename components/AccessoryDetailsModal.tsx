'use client';

import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Gift,
  Plus,
  Minus,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import MoneyInput from '@/components/ui/MoneyInput';
import { POSCartItem } from '@/types/database';

interface AccessoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: POSCartItem) => void;
  initialAccessoryName?: string;
  initialPrice?: number;
}

const POPULAR_ACCESSORIES = [
  { name: 'Củ Sạc 20W Type-C Apple Zin', defaultPrice: 450000, warrantyMonths: 12 },
  { name: 'Cáp Sạc Type-C to Lightning / Type-C', defaultPrice: 250000, warrantyMonths: 12 },
  { name: 'Combo Củ + Cáp Sạc 20W Nhanh', defaultPrice: 600000, warrantyMonths: 12 },
  { name: 'Ốp Lưng Magsafe Chống Sốc Trong Suốt', defaultPrice: 150000, warrantyMonths: 0 },
  { name: 'Kính Cường Lực KingKong / Hoda Cao Cấp', defaultPrice: 120000, warrantyMonths: 0 },
  { name: 'Tai Nghe Lightning / Type-C Chính Hãng', defaultPrice: 350000, warrantyMonths: 6 },
  { name: 'Pin Sạc Dự Phòng 10000mAh Magsafe', defaultPrice: 550000, warrantyMonths: 12 },
  { name: 'Dán Cường Lực Camera / Viền Bảo Vệ', defaultPrice: 80000, warrantyMonths: 0 },
];

export default function AccessoryDetailsModal({
  isOpen,
  onClose,
  onAddToCart,
  initialAccessoryName = '',
  initialPrice = 250000,
}: AccessoryDetailsModalProps) {
  const [name, setName] = useState(initialAccessoryName || 'Củ Sạc 20W Type-C Apple Zin');
  const [price, setPrice] = useState<number>(initialPrice);
  const [quantity, setQuantity] = useState<number>(1);
  const [isGift, setIsGift] = useState<boolean>(false);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (acc: typeof POPULAR_ACCESSORIES[0]) => {
    setName(acc.name);
    setPrice(acc.defaultPrice);
    setWarrantyMonths(acc.warrantyMonths);
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalPrice = isGift ? 0 : price;

    const cartItem: POSCartItem = {
      cart_id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item_type: 'accessory',
      inventory_id: null,
      product_id: null,
      product_name: name.trim(),
      category: 'PhuKien',
      condition: 'new',
      color: 'Phụ Kiện',
      storage: '',
      imei: '',
      price: finalPrice,
      original_price: price,
      quantity: Math.max(1, quantity),
      warranty_months: warrantyMonths,
      note: note.trim() || (isGift ? 'Quà tặng khuyến mãi kèm máy' : ''),
      is_gift: isGift,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-slate-900 to-cyan-500/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-500 to-cyan-500 text-slate-950 font-black rounded-2xl shadow-glow-cyan">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Thêm Phụ Kiện Bán Kèm
              </h3>
              <p className="text-xs text-slate-400">
                Không cần nhập IMEI • Chọn số lượng & Quà tặng 0đ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmAdd} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Preset Accessories */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Phụ Kiện Bán Chạy Thường Gặp:</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
              {POPULAR_ACCESSORIES.map((acc) => (
                <button
                  key={acc.name}
                  type="button"
                  onClick={() => handleSelectPreset(acc)}
                  className={`p-2 rounded-xl text-left text-xs font-bold transition flex flex-col justify-between border ${
                    name === acc.name
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm'
                      : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="truncate">{acc.name}</span>
                  <span className="text-[10px] font-mono text-cyan-400 mt-1">
                    {formatVND(acc.defaultPrice)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tên Phụ Kiện */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Tên Phụ Kiện:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Củ Sạc 20W Apple, Ốp Magsafe..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Số Lượng & Quà Tặng Khuyến Mãi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Bộ đếm số lượng */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Số Lượng Mua:
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="flex-1 text-center py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-black font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-sm flex items-center justify-center transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checkbox Quà Tặng Khuyến Mãi 0đ */}
            <div className="space-y-1.5 flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setIsGift(!isGift)}
                className={`w-full py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center space-x-2 ${
                  isGift
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-400 shadow-md shadow-rose-500/20 font-black'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Gift className="w-4 h-4 text-pink-300" />
                <span>{isGift ? '🎁 Hàng Tặng Kèm (Giá 0đ)' : 'Đánh dấu Hàng Tặng (0đ)'}</span>
              </button>
            </div>

          </div>

          {/* Đơn Giá Bán & Thành Tiền */}
          <div className="p-3.5 bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/30 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                Đơn Giá Bán (Tùy Chỉnh):
              </label>
              {isGift && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  Miễn phí 0đ
                </span>
              )}
            </div>

            <MoneyInput
              value={isGift ? 0 : price}
              onValueChange={(val: number) => {
                setPrice(val);
                if (isGift && val > 0) setIsGift(false);
              }}
              placeholder="Nhập giá phụ kiện..."
              className="w-full text-base font-black text-cyan-400"
            />

            <div className="pt-1 flex items-center justify-between text-xs text-slate-300 border-t border-slate-800/60 font-bold">
              <span>Thành Tiền ({quantity} sản phẩm):</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {formatVND((isGift ? 0 : price) * quantity)}
              </span>
            </div>
          </div>

          {/* Bảo Hành & Ghi Chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Bảo Hành:
              </label>
              <select
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={0}>Không bảo hành / Bao test</option>
                <option value={1}>1 tháng (30 ngày)</option>
                <option value={3}>3 tháng</option>
                <option value={6}>6 tháng</option>
                <option value={12}>12 tháng (1 đổi 1)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Ghi Chú Thêm:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Khách mua kèm máy 15 Pro Max..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950 font-black" />
              <span>+ Thêm Phụ Kiện</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
