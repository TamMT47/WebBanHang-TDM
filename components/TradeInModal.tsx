'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Smartphone, Camera, Search, Plus, Check, Sparkles } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { TradeInItemInput, ProductCondition, Product } from '@/types/database';
import {
  getAllMasterColors,
  saveCustomColor,
  DEFAULT_MASTER_STORAGES,
  DEFAULT_MASTER_CONDITIONS,
  DEFAULT_MASTER_CATEGORIES
} from '@/lib/masterAttributes';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Search / Selection for existing catalog model
  const [searchQuery, setSearchQuery] = useState('iPhone 13');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Master Attributes
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [isAddingNewColor, setIsAddingNewColor] = useState(false);
  const [newCustomColorName, setNewCustomColorName] = useState('');

  // Selected Item Specs
  const [category, setCategory] = useState('iPhone');
  const [condition, setCondition] = useState<ProductCondition>('99%');
  const [color, setColor] = useState('Midnight (Đen Đêm)');
  const [storage, setStorage] = useState('128GB');
  const [imei, setImei] = useState(scannedImei || '');
  const [batteryHealth, setBatteryHealth] = useState<number>(86);
  const [tradeInValue, setTradeInValue] = useState<number>(8500000);
  const [error, setError] = useState<string | null>(null);

  // Fetch Existing Products Catalog and Master Colors
  useEffect(() => {
    if (isOpen) {
      setAvailableColors(getAllMasterColors());
      fetchProducts();
    }
  }, [isOpen]);

  // Sync scanned IMEI if provided
  useEffect(() => {
    if (scannedImei) {
      setImei(scannedImei);
    }
  }, [scannedImei]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setSearchQuery(prod.name);
    setCategory(prod.category || 'iPhone');
    setIsDropdownOpen(false);
  };

  const handleCreateNewCustomColor = () => {
    if (newCustomColorName.trim()) {
      const updated = saveCustomColor(newCustomColorName.trim());
      setAvailableColors(getAllMasterColors());
      setColor(newCustomColorName.trim());
      setNewCustomColorName('');
      setIsAddingNewColor(false);
    }
  };

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalModelName = selectedProduct ? selectedProduct.name : searchQuery.trim();

    if (!finalModelName) {
      setError('Vui lòng chọn hoặc nhập tên dòng máy cũ thu lại');
      return;
    }

    if (!imei.trim() || !tradeInValue || tradeInValue <= 0) {
      setError('Vui lòng điền đầy đủ số IMEI và giá thu mua thỏa thuận');
      return;
    }

    onConfirm({
      name: `${finalModelName} [Hàng Trade-in]`.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-700/60 rounded-xl">
              <RefreshCw className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Thu Cũ Đổi Mới (Trade-in)
              </h3>
              <p className="text-[11px] text-amber-100 font-medium">
                Đồng bộ thuộc tính Master và tự động lưu vào kho với nhãn &ldquo;Hàng Trade-in&rdquo;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-amber-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Search/Select Existing Product Model with Master Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-black text-gray-900 mb-1">
              1. Chọn hoặc tìm dòng máy trong Danh mục kho *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Gõ tên máy (VD: iPhone 13, 14 Pro Max...)"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            {/* Dropdown Results */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-gray-100 animate-in fade-in">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-3 hover:bg-amber-50/70 cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <span className="font-black text-gray-950">{p.name}</span>
                      <span className="ml-2 text-[10px] uppercase font-bold text-gray-500">
                        {p.category}
                      </span>
                    </div>
                    {selectedProduct?.id === p.id && (
                      <Check className="w-4 h-4 text-amber-600 font-bold" />
                    )}
                  </div>
                ))}

                {searchQuery.trim() && !products.some((p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                  <div
                    onClick={() => {
                      setSelectedProduct(null);
                      setIsDropdownOpen(false);
                    }}
                    className="p-3 bg-amber-50 hover:bg-amber-100 cursor-pointer text-amber-950 font-bold flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4 text-amber-700" />
                    <span>+ Thu máy dòng mới chưa có trong kho: &ldquo;{searchQuery.trim()}&rdquo;</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Master Attributes: Storage, Color, Condition, Battery */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="font-black text-gray-800 uppercase tracking-wide text-[11px]">
              2. Chuẩn Hóa Thuộc Tính Máy Thu Vào
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Storage */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Dung lượng</label>
                <select
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                >
                  {DEFAULT_MASTER_STORAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Ngoại hình</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                >
                  {DEFAULT_MASTER_CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color Master Dropdown & Quick Add New Color */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-gray-700">Màu sắc chuẩn</label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewColor(!isAddingNewColor)}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-900"
                >
                  {isAddingNewColor ? 'Đóng' : '+ Thêm màu mới'}
                </button>
              </div>

              {isAddingNewColor ? (
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <input
                    type="text"
                    value={newCustomColorName}
                    onChange={(e) => setNewCustomColorName(e.target.value)}
                    placeholder="Nhập tên màu mới (VD: Xanh Mint)..."
                    className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCustomColor}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                  >
                    Lưu Màu
                  </button>
                </div>
              ) : (
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                >
                  {availableColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Battery Health */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Tình trạng Pin (% Pin hiện tại)
              </label>
              <input
                type="number"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold font-mono"
                min={50}
                max={100}
                required
              />
            </div>
          </div>

          {/* IMEI & Camera Scanner */}
          <div>
            <label className="block text-xs font-black text-gray-900 mb-1">
              3. Số IMEI máy cũ (15 số) *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="Nhập hoặc quét mã 15 số IMEI..."
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-black focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-3.5 py-2.5 bg-gray-950 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-black active:scale-95 transition"
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Quét</span>
                </button>
              )}
            </div>
          </div>

          {/* Trade-in Value Auto-formatted */}
          <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-amber-950 uppercase">
                4. Giá thỏa thuận thu lại *
              </label>
              <span className="text-[10px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                Trừ vào tổng đơn bán
              </span>
            </div>
            <MoneyInput
              value={tradeInValue}
              onValueChange={(num) => setTradeInValue(num)}
              placeholder="VD: 8.500.000"
              className="px-3.5 py-2.5 bg-white border-2 border-amber-500 rounded-xl text-base font-black text-amber-950 focus:ring-2 focus:ring-amber-600 font-mono"
            />
            <div className="flex justify-between text-xs text-amber-900 font-black pt-1">
              <span>Số tiền trừ vào đơn:</span>
              <span className="font-mono text-sm">-{formatVND(tradeInValue)}</span>
            </div>
            <p className="text-[10px] text-amber-800/80 leading-tight pt-1">
              💡 Máy này sẽ được tự động lưu vào Kho hàng với nhãn <b>&ldquo;Hàng Trade-in&rdquo;</b> và giá vốn bằng đúng giá thu này.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-lg shadow-amber-600/20 transition active:scale-[0.99]"
            >
              ÁP DỤNG THU CŨ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
