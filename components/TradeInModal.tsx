'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, RefreshCw, Smartphone, Camera, Search, Plus, Check, Sparkles, AlertCircle } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { TradeInItemInput, ProductCondition, Product } from '@/types/database';
import {
  getAllMasterColors,
  saveCustomColor,
  DEFAULT_MASTER_SKUS,
  sortItemsAZ
} from '@/lib/masterAttributes';
import MoneyInput from '@/components/ui/MoneyInput';

interface TradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: TradeInItemInput) => void;
  onOpenScanner?: () => void;
  scannedImei?: string;
  initialItem?: TradeInItemInput | null;
}

export default function TradeInModal({
  isOpen,
  onClose,
  onConfirm,
  onOpenScanner,
  scannedImei,
  initialItem,
}: TradeInModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Search / Selection for Master SKU (Tên + Dung lượng + Tình trạng)
  const [searchQuery, setSearchQuery] = useState('iPhone 12 - 64GB - 99%');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Master Colors
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [isAddingNewColor, setIsAddingNewColor] = useState(false);
  const [newCustomColorName, setNewCustomColorName] = useState('');

  // 3 Mandatory Fields
  const [color, setColor] = useState('Midnight (Đen Đêm)');
  const [batteryHealth, setBatteryHealth] = useState<number | string>(86);
  const [imei, setImei] = useState(scannedImei || '');

  // Specs & Value
  const [category, setCategory] = useState('iPhone');
  const [tradeInValue, setTradeInValue] = useState<number>(6500000);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    productName?: string;
    color?: string;
    batteryHealth?: string;
    imei?: string;
    tradeInValue?: string;
  }>({});

  // Fetch Existing Products Catalog and Master Colors
  useEffect(() => {
    if (isOpen) {
      setAvailableColors(getAllMasterColors());
      fetchProducts();
      setFieldErrors({});

      if (initialItem) {
        setSearchQuery(initialItem.name.replace(' [Hàng Trade-in]', ''));
        setColor(initialItem.color || 'Midnight (Đen Đêm)');
        setBatteryHealth(initialItem.battery_health || 86);
        setImei(initialItem.imei || '');
        setTradeInValue(initialItem.trade_in_value || 6500000);
      }
    }
  }, [isOpen, initialItem]);

  // Sync scanned IMEI if provided
  useEffect(() => {
    if (scannedImei) {
      setImei(scannedImei);
      setFieldErrors((prev) => ({ ...prev, imei: undefined }));
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

  const allMasterSkuOptions = useMemo(() => {
    const fromDb = products.map((p) => p.name);
    const combined = Array.from(new Set([...fromDb, ...DEFAULT_MASTER_SKUS]));
    return sortItemsAZ(combined, (s) => s);
  }, [products]);

  const filteredMasterSkus = useMemo(() => {
    if (!searchQuery.trim()) return allMasterSkuOptions;
    const q = searchQuery.toLowerCase().trim();
    return allMasterSkuOptions.filter((sku) => sku.toLowerCase().includes(q));
  }, [allMasterSkuOptions, searchQuery]);

  const handleSelectSku = (skuName: string) => {
    setSearchQuery(skuName);
    setFieldErrors((prev) => ({ ...prev, productName: undefined }));
    if (skuName.toLowerCase().includes('ipad')) setCategory('iPad');
    else if (skuName.toLowerCase().includes('macbook')) setCategory('Macbook');
    else if (skuName.toLowerCase().includes('airpods')) setCategory('Airpods');
    else setCategory('iPhone');
    setIsDropdownOpen(false);
  };

  const handleCreateNewCustomColor = () => {
    if (newCustomColorName.trim()) {
      saveCustomColor(newCustomColorName.trim());
      setAvailableColors(getAllMasterColors());
      setColor(newCustomColorName.trim());
      setFieldErrors((prev) => ({ ...prev, color: undefined }));
      setNewCustomColorName('');
      setIsAddingNewColor(false);
    }
  };

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!searchQuery.trim()) {
      errors.productName = 'Bắt buộc chọn hoặc nhập tên dòng máy mẫu';
    }
    if (!color || !color.trim()) {
      errors.color = 'Bắt buộc chọn màu sắc máy';
    }
    const numBattery = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;
    if (isNaN(numBattery) || numBattery <= 0 || numBattery > 100) {
      errors.batteryHealth = 'Bắt buộc nhập % Pin cụ thể từ 1% đến 100%';
    }
    if (!imei || !imei.trim()) {
      errors.imei = 'Bắt buộc nhập hoặc quét mã IMEI máy cũ';
    }
    if (!tradeInValue || tradeInValue <= 0) {
      errors.tradeInValue = 'Bắt buộc nhập giá thu mua thỏa thuận lớn hơn 0đ';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const numBattery = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;

    onConfirm({
      name: `${searchQuery.trim()} [Hàng Trade-in]`,
      category,
      condition: '99%',
      color: color.trim(),
      storage: '',
      imei: imei.trim(),
      battery_health: numBattery,
      trade_in_value: tradeInValue,
    });
    onClose();
  };

  if (!isOpen) return null;

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
                Chuẩn hóa Master SKU & thông tin bắt buộc (% Pin, Màu sắc, IMEI, Giá thu)
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
          
          {/* Master SKU Autocomplete (Tên + Dung lượng + Tình trạng) */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-black text-gray-900 mb-1">
              1. Tên Sản phẩm mẫu thu lại (Tên + Dung lượng + Ngoại hình) *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  setFieldErrors((prev) => ({ ...prev, productName: undefined }));
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Gõ tìm mẫu máy (VD: iPhone 11 - 64GB - 99%, 13 - 128GB)..."
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none ${
                  fieldErrors.productName ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-gray-300'
                }`}
              />
            </div>

            {fieldErrors.productName && (
              <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fieldErrors.productName}</span>
              </p>
            )}

            {/* Dropdown Results */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-gray-100 animate-in fade-in">
                {filteredMasterSkus.map((sku, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSku(sku)}
                    className="p-3 hover:bg-amber-50/70 cursor-pointer flex items-center justify-between transition"
                  >
                    <span className="font-bold text-gray-950">{sku}</span>
                    {searchQuery.toLowerCase() === sku.toLowerCase() && (
                      <Check className="w-4 h-4 text-amber-600 font-bold" />
                    )}
                  </div>
                ))}

                {searchQuery.trim() && !filteredMasterSkus.some((s) => s.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                  <div
                    onClick={() => handleSelectSku(searchQuery.trim())}
                    className="p-3 bg-amber-50 hover:bg-amber-100 cursor-pointer text-amber-950 font-bold flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4 text-amber-700" />
                    <span>+ Thu máy dòng mới: &ldquo;{searchQuery.trim()}&rdquo;</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3 Mandatory Fields: Color, Battery, IMEI */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="font-black text-gray-800 uppercase tracking-wide text-[11px] flex items-center justify-between">
              <span>2. 3 Thông Tin Bắt Buộc</span>
              <span className="text-[10px] text-amber-800 font-bold">Màu, % Pin, IMEI</span>
            </div>

            {/* Color Master Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-800">Màu sắc máy *</label>
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
                    placeholder="Nhập tên màu mới..."
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
                  onChange={(e) => {
                    setColor(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, color: undefined }));
                  }}
                  className={`w-full px-2.5 py-2 bg-white border rounded-xl text-xs font-bold text-gray-900 ${
                    fieldErrors.color ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Chọn màu sắc --</option>
                  {availableColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {fieldErrors.color && (
                <p className="text-[10px] font-bold text-red-600 mt-1">{fieldErrors.color}</p>
              )}
            </div>

            {/* Battery Health */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Tình trạng Pin (% Pin hiện tại) *
              </label>
              <input
                type="number"
                value={batteryHealth}
                onChange={(e) => {
                  setBatteryHealth(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                  setFieldErrors((prev) => ({ ...prev, batteryHealth: undefined }));
                }}
                placeholder="VD: 86"
                className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold font-mono ${
                  fieldErrors.batteryHealth ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                }`}
                min={1}
                max={100}
              />
              {fieldErrors.batteryHealth && (
                <p className="text-[10px] font-bold text-red-600 mt-1">{fieldErrors.batteryHealth}</p>
              )}
            </div>

            {/* IMEI & Scanner */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Mã IMEI máy thu lại *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={imei}
                  onChange={(e) => {
                    setImei(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, imei: undefined }));
                  }}
                  placeholder="Nhập hoặc quét 15 số IMEI..."
                  className={`flex-1 px-3 py-2 bg-white border rounded-xl text-xs font-mono font-bold ${
                    fieldErrors.imei ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                  }`}
                />
                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={onOpenScanner}
                    className="px-3 py-2 bg-gray-950 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-black active:scale-95 transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quét</span>
                  </button>
                )}
              </div>
              {fieldErrors.imei && (
                <p className="text-[10px] font-bold text-red-600 mt-1">{fieldErrors.imei}</p>
              )}
            </div>
          </div>

          {/* Trade-in Value Auto-formatted */}
          <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-amber-950 uppercase">
                3. Giá Thỏa Thuận Thu Lại *
              </label>
              <span className="text-[10px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                Trừ vào tổng đơn bán
              </span>
            </div>
            <MoneyInput
              value={tradeInValue}
              onValueChange={(num) => {
                setTradeInValue(num);
                setFieldErrors((prev) => ({ ...prev, tradeInValue: undefined }));
              }}
              placeholder="VD: 6.500.000"
              className={`px-3.5 py-2.5 bg-white border-2 rounded-xl text-base font-black text-amber-950 focus:ring-2 focus:ring-amber-600 font-mono ${
                fieldErrors.tradeInValue ? 'border-red-500' : 'border-amber-500'
              }`}
            />
            {fieldErrors.tradeInValue && (
              <p className="text-[10px] font-bold text-red-600">{fieldErrors.tradeInValue}</p>
            )}

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
