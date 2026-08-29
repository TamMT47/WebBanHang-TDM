'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  RefreshCw,
  Camera,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  ChevronDown,
  Layers,
  Palette,
  RotateCcw
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { TradeInItemInput } from '@/types/database';
import {
  getAllMasterColors,
  DEFAULT_MASTER_MODELS,
  DEFAULT_MASTER_STORAGES,
  DEFAULT_MASTER_CONDITIONS,
  sortItemsAZ,
  formatProductTitle
} from '@/lib/masterAttributes';
import MoneyInput from '@/components/ui/MoneyInput';
import ScannerModal from '@/components/ScannerModal';

interface TradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: TradeInItemInput) => void;
  initialItem?: TradeInItemInput | null;
}

export default function TradeInModal({
  isOpen,
  onClose,
  onConfirm,
  initialItem,
}: TradeInModalProps) {
  // 1. Modular Product Specs
  const [modelName, setModelName] = useState('iPhone 12');
  const [storage, setStorage] = useState('64GB');
  const [condition, setCondition] = useState('99%');
  const [category, setCategory] = useState('iPhone');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // 2. Flexible Color & Battery %
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [color, setColor] = useState('Midnight (Đen Đêm)');
  const [batteryHealth, setBatteryHealth] = useState<number | string>(85);

  // 3. IMEI & Scanner
  const [imei, setImei] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 4. Trade-in Value
  const [tradeInValue, setTradeInValue] = useState<number>(6500000);

  // Validation Errors
  const [errors, setErrors] = useState<{
    modelName?: string;
    color?: string;
    batteryHealth?: string;
    imei?: string;
    tradeInValue?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      setAvailableColors(getAllMasterColors());
      if (initialItem) {
        setModelName(initialItem.name || 'iPhone 12');
        setStorage(initialItem.storage || '64GB');
        setCondition(initialItem.condition || '99%');
        setColor(initialItem.color || 'Midnight (Đen Đêm)');
        setBatteryHealth(initialItem.battery_health || 85);
        setImei(initialItem.imei || '');
        setTradeInValue(initialItem.trade_in_value || 6500000);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialItem]);

  const resetForm = () => {
    setModelName('iPhone 12');
    setStorage('64GB');
    setCondition('99%');
    setColor('Midnight (Đen Đêm)');
    setBatteryHealth(85);
    setImei('');
    setTradeInValue(6500000);
    setErrors({});
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModels = useMemo(() => {
    if (!modelName.trim()) return DEFAULT_MASTER_MODELS;
    const q = modelName.toLowerCase().trim();
    return DEFAULT_MASTER_MODELS.filter((m) => m.toLowerCase().includes(q));
  }, [modelName]);

  const validate = (): boolean => {
    const errs: typeof errors = {};

    if (!modelName.trim()) {
      errs.modelName = 'Vui lòng chọn hoặc nhập Tên dòng máy';
    }
    if (!color.trim()) {
      errs.color = 'Vui lòng nhập hoặc chọn Màu sắc';
    }
    const numBat = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;
    if (isNaN(numBat) || numBat <= 0 || numBat > 100) {
      errs.batteryHealth = 'Vui lòng nhập % Pin từ 1 đến 100';
    }
    if (!imei.trim()) {
      errs.imei = 'Vui lòng nhập hoặc quét mã IMEI máy thu cũ';
    }
    if (!tradeInValue || tradeInValue <= 0) {
      errs.tradeInValue = 'Vui lòng nhập giá thu thỏa thuận';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const numBat = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;

    // Output clean product model name (NO junk suffixes)
    onConfirm({
      name: modelName.trim(),
      category,
      storage,
      condition,
      color: color.trim(),
      imei: imei.trim(),
      battery_health: isNaN(numBat) ? 85 : numBat,
      trade_in_value: tradeInValue,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gray-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 text-gray-950 rounded-xl font-black">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Thu Cũ Đổi Mới (Trade-in)
              </h3>
              <p className="text-[11px] text-gray-400">
                Form chuẩn hóa như Nhập Hàng • Tự động gán NCC: <b>Khách Trade-in</b>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Identical layout to ImportView) */}
        <form onSubmit={handleConfirm} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* Section 1: Model Specs */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <span className="text-xs font-black text-gray-950 uppercase tracking-wide flex items-center space-x-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Thông Số Dòng Máy Thu Lại</span>
            </span>

            {/* Model Name */}
            <div className="relative" ref={modelDropdownRef}>
              <label className="block text-xs font-black text-gray-900 mb-1">
                Tên dòng máy *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => {
                    setModelName(e.target.value);
                    setIsModelDropdownOpen(true);
                    setErrors((prev) => ({ ...prev, modelName: undefined }));
                  }}
                  onFocus={() => setIsModelDropdownOpen(true)}
                  placeholder="VD: iPhone 11, iPhone 12 Pro..."
                  className={`w-full pl-9 pr-8 py-2 bg-white border rounded-xl text-xs font-bold text-gray-950 ${
                    errors.modelName ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-300'
                  }`}
                />
                <ChevronDown
                  className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                />
              </div>

              {errors.modelName && (
                <p className="text-[10px] text-red-600 font-bold mt-1">{errors.modelName}</p>
              )}

              {/* Suggestions */}
              {isModelDropdownOpen && filteredModels.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredModels.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setModelName(m);
                        setIsModelDropdownOpen(false);
                      }}
                      className="px-3 py-2 hover:bg-amber-50 text-xs font-bold text-gray-800 cursor-pointer flex justify-between"
                    >
                      <span>{m}</span>
                      {modelName === m && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Storage & Condition */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Dung lượng *</label>
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

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Tình trạng *</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
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

            <div className="text-[11px] text-gray-500">
              Tên sản phẩm nhập kho: <b className="text-gray-900">{formatProductTitle(modelName, storage, condition)}</b>
            </div>
          </div>

          {/* Section 2: Color & Battery */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
            <span className="text-xs font-black text-gray-950 uppercase tracking-wide flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-600" />
              <span>2. Màu Sắc & Tình Trạng Pin</span>
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Màu sắc *</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setErrors((prev) => ({ ...prev, color: undefined }));
                  }}
                  placeholder="VD: Midnight, Gold..."
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold ${
                    errors.color ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">% Pin thực tế *</label>
                <input
                  type="number"
                  value={batteryHealth}
                  onChange={(e) => {
                    setBatteryHealth(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                    setErrors((prev) => ({ ...prev, batteryHealth: undefined }));
                  }}
                  placeholder="VD: 85"
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold font-mono ${
                    errors.batteryHealth ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-300'
                  }`}
                  min={1}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Section 3: IMEI */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
            <label className="block text-xs font-black text-gray-900 mb-1">
              Mã IMEI máy thu lại *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={imei}
                onChange={(e) => {
                  setImei(e.target.value);
                  setErrors((prev) => ({ ...prev, imei: undefined }));
                }}
                placeholder="Nhập hoặc quét mã IMEI 15 số..."
                className={`flex-1 px-3 py-2 bg-white border rounded-xl text-xs font-mono font-bold ${
                  errors.imei ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-2 bg-gray-950 text-white rounded-xl text-xs font-bold flex items-center space-x-1 hover:bg-black"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Quét</span>
              </button>
            </div>
            {errors.imei && <p className="text-[10px] text-red-600 font-bold">{errors.imei}</p>}
          </div>

          {/* Section 4: Agreed Value */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-300 space-y-2">
            <label className="block text-xs font-black text-amber-950 mb-1">
              Giá Thỏa Thuận Thu Lại * (Khấu trừ vào đơn bán)
            </label>
            <MoneyInput
              value={tradeInValue}
              onValueChange={(num) => {
                setTradeInValue(num);
                setErrors((prev) => ({ ...prev, tradeInValue: undefined }));
              }}
              placeholder="0"
              className="px-3.5 py-2.5 bg-white border-2 border-amber-500 rounded-xl text-sm font-black text-amber-950 font-mono"
            />
            <div className="flex justify-between items-center text-xs font-bold text-amber-900 pt-1">
              <span>Nhà Cung Cấp tự động:</span>
              <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-black">
                Khách Trade-in
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black shadow-md transition active:scale-[0.99]"
            >
              Xác Nhận Thu Máy
            </button>
          </div>
        </form>
      </div>

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => setImei(code)}
        title="Quét IMEI Máy Cũ Thu Lại"
      />
    </div>
  );
}
