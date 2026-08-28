'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Smartphone, Camera } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { TradeInItemInput, ProductCondition } from '@/types/database';
import MoneyInput from '@/components/ui/MoneyInput';

interface TradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: TradeInItemInput) => void;
  onOpenScanner?: () => void;
  scannedImei?: string;
}

export default function TradeInModal({
  isOpen,
  onClose,
  onConfirm,
  onOpenScanner,
  scannedImei,
}: TradeInModalProps) {
  const [name, setName] = useState('iPhone 13 128GB');
  const [category, setCategory] = useState('iPhone');
  const [condition, setCondition] = useState<ProductCondition>('99%');
  const [color, setColor] = useState('Đen Midnight');
  const [storage, setStorage] = useState('128GB');
  const [imei, setImei] = useState(scannedImei || '');
  const [batteryHealth, setBatteryHealth] = useState<number>(86);
  const [tradeInValue, setTradeInValue] = useState<number>(8500000);
  const [error, setError] = useState<string | null>(null);

  // Sync scanned IMEI if provided
  React.useEffect(() => {
    if (scannedImei) {
      setImei(scannedImei);
    }
  }, [scannedImei]);

  if (!isOpen) return null;

  const popularModels = [
    'iPhone 11 64GB',
    'iPhone 11 128GB',
    'iPhone 12 128GB',
    'iPhone 12 Pro 128GB',
    'iPhone 13 128GB',
    'iPhone 13 Pro 128GB',
    'iPhone 13 Pro Max 128GB',
    'iPhone 14 Pro Max 128GB',
    'iPad Pro 11 inch M1',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !imei || !tradeInValue || tradeInValue <= 0) {
      setError('Vui lòng điền đầy đủ tên máy, IMEI và giá thu máy cũ');
      return;
    }

    onConfirm({
      name: `${name} ${storage} ${color} (${condition})`.trim(),
      category,
      condition,
      color,
      storage,
      imei: imei.trim(),
      battery_health: batteryHealth,
      trade_in_value: tradeInValue,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5" />
            <h3 className="text-sm font-bold">Thêm Máy Thu Cũ Đổi Mới (Trade-in)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-black/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Quick Model Chips */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Gợi ý model phổ biến
            </label>
            <div className="flex flex-wrap gap-1.5">
              {popularModels.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setName(m)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    name === m
                      ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tên dòng máy *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: iPhone 13 Pro Max"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Danh mục
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="iPhone">iPhone</option>
                <option value="iPad">iPad</option>
                <option value="Macbook">Macbook</option>
                <option value="Airpods">Airpods</option>
                <option value="AppleWatch">Apple Watch</option>
              </select>
            </div>
          </div>

          {/* Attributes: Storage, Color, Condition, Battery */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Dung lượng</label>
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              >
                <option value="64GB">64GB</option>
                <option value="128GB">128GB</option>
                <option value="256GB">256GB</option>
                <option value="512GB">512GB</option>
                <option value="1TB">1TB</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu sắc</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Xanh / Đen..."
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Ngoại hình</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              >
                <option value="99%">99% (Keng)</option>
                <option value="98%">98% (Phẩy nhẹ)</option>
                <option value="97%">97% (Cấn xước)</option>
                <option value="thanh_ly">Thanh lý / Kính vỡ</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">% Pin</label>
              <input
                type="number"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-bold"
              />
            </div>
          </div>

          {/* IMEI & Scanner */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Số IMEI máy cũ *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="Nhập 15 số IMEI của máy cũ..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 hover:bg-black"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Quét</span>
                </button>
              )}
            </div>
          </div>

          {/* Trade-in Value Auto-formatted */}
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-amber-950">
              Giá thỏa thuận thu lại *
            </label>
            <MoneyInput
              value={tradeInValue}
              onValueChange={(num) => setTradeInValue(num)}
              placeholder="VD: 8.500.000"
              className="px-3.5 py-2.5 bg-white border border-amber-400 rounded-xl text-base font-black text-amber-950 focus:ring-2 focus:ring-amber-500 font-mono"
            />
            <div className="text-xs text-amber-900 font-bold">
              Trừ vào tổng đơn: -{formatVND(tradeInValue)}
            </div>
            <p className="text-[10px] text-amber-700">
              * Máy này sẽ tự động nhập vào kho với giá vốn = giá thu để TD Mobile Store bán tiếp.
            </p>
          </div>

          {/* Action Buttons */}
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
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              Áp Dụng Thu Cũ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
