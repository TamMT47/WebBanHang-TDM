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
  RotateCcw,
  Plus,
  Sparkles
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { TradeInItemInput, Product } from '@/types/database';
import {
  getAllMasterColors,
  getAllMasterModels,
  saveCustomModel,
  DEFAULT_MASTER_STORAGES,
  DEFAULT_MASTER_CONDITIONS,
  DEFAULT_MASTER_CATEGORIES,
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
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [storage, setStorage] = useState('64GB');
  const [condition, setCondition] = useState('99%');
  const [category, setCategory] = useState('iPhone');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Sub-modal for creating a new product model template
  const [isAddNewModelOpen, setIsAddNewModelOpen] = useState(false);
  const [customNewModelName, setCustomNewModelName] = useState('');
  const [customNewCategory, setCustomNewCategory] = useState('iPhone');

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

  // Fetch all master models + custom ones
  const [masterModels, setMasterModels] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAvailableColors(getAllMasterColors());
      const allModels = getAllMasterModels();
      setMasterModels(sortItemsAZ(allModels, (m) => m));

      if (initialItem) {
        setModelName(initialItem.name || 'iPhone 12');
        setModelSearchQuery(initialItem.name || 'iPhone 12');
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
    setModelSearchQuery('iPhone 12');
    setStorage('64GB');
    setCondition('99%');
    setColor('Midnight (Đen Đêm)');
    setBatteryHealth(85);
    setImei('');
    setTradeInValue(6500000);
    setErrors({});
    setIsAddNewModelOpen(false);
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
    if (!modelSearchQuery.trim()) return masterModels;
    const q = modelSearchQuery.toLowerCase().trim();
    return masterModels.filter((m) => m.toLowerCase().includes(q));
  }, [masterModels, modelSearchQuery]);

  // Handle creating new model template
  const handleAddNewModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNewModelName.trim()) return;

    const clean = customNewModelName.trim();
    saveCustomModel(clean);

    const updated = getAllMasterModels();
    setMasterModels(sortItemsAZ(updated, (m) => m));

    setModelName(clean);
    setModelSearchQuery(clean);
    setCategory(customNewCategory);
    setCustomNewModelName('');
    setIsAddNewModelOpen(false);
    setIsModelDropdownOpen(false);
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};

    if (!modelName.trim()) {
      errs.modelName = 'Vui lòng chọn hoặc thêm Tên dòng máy thu lại';
    }
    if (!color.trim()) {
      errs.color = 'Vui lòng nhập hoặc chọn Màu sắc máy';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 rounded-xl font-black shadow-glow-amber">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-white flex items-center space-x-1.5">
                <span>Thu Cũ Đổi Mới (Trade-in)</span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full badge-nowrap">
                  KHẤU TRỪ VÀO ĐƠN
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Ràng buộc danh mục mẫu máy chuẩn • Gán NCC tự động: <b className="text-amber-300">Khách Trade-in</b>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
          
          {/* Section 1: Model Specs */}
          <div className="p-3.5 bg-slate-850/80 rounded-2xl border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Chọn Mẫu Máy Thu Lại *</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddNewModelOpen(true)}
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 transition flex items-center space-x-1 badge-nowrap"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm Mẫu Mới</span>
              </button>
            </div>

            {/* Model Name Select / Autocomplete */}
            <div className="relative" ref={modelDropdownRef}>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tên dòng máy (Tìm kiếm hoặc chọn từ danh mục chuẩn) *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modelSearchQuery}
                  onChange={(e) => {
                    setModelSearchQuery(e.target.value);
                    setIsModelDropdownOpen(true);
                    setErrors((prev) => ({ ...prev, modelName: undefined }));
                  }}
                  onFocus={() => setIsModelDropdownOpen(true)}
                  placeholder="Gõ để tìm kiếm: iPhone 13 Pro Max, iPad Pro..."
                  className={`w-full pl-9 pr-8 py-2 bg-slate-900 border rounded-xl text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    errors.modelName ? 'border-rose-500' : 'border-slate-700'
                  }`}
                />
                <ChevronDown
                  className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                />
              </div>

              {errors.modelName && (
                <p className="text-[10px] text-rose-400 font-bold mt-1">{errors.modelName}</p>
              )}

              {/* Suggestions dropdown */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setModelName(m);
                          setModelSearchQuery(m);
                          setIsModelDropdownOpen(false);
                          setErrors((prev) => ({ ...prev, modelName: undefined }));
                        }}
                        className="px-3.5 py-2.5 hover:bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer flex justify-between items-center transition"
                      >
                        <span>{m}</span>
                        {modelName === m && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-400">
                      <p className="text-[11px]">Không tìm thấy mẫu máy &quot;{modelSearchQuery}&quot;</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomNewModelName(modelSearchQuery);
                          setIsAddNewModelOpen(true);
                          setIsModelDropdownOpen(false);
                        }}
                        className="mt-1.5 px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-[11px] font-black"
                      >
                        + Tạo mẫu &quot;{modelSearchQuery}&quot; ngay
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Storage & Condition */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Dung lượng *</label>
                <select
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  {DEFAULT_MASTER_STORAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tình trạng *</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  {DEFAULT_MASTER_CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
              <span>Tên máy chuẩn nhập kho:</span>
              <span className="font-bold text-white font-mono badge-nowrap">
                {formatProductTitle(modelName, storage, condition)}
              </span>
            </div>
          </div>

          {/* Section 2: Color & Battery */}
          <div className="p-3.5 bg-slate-850/80 rounded-2xl border border-slate-700/60 space-y-2.5">
            <span className="text-xs font-black text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>2. Màu Sắc & Tình Trạng Pin</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Màu sắc *</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setErrors((prev) => ({ ...prev, color: undefined }));
                  }}
                  placeholder="VD: Midnight, Gold, Titan..."
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs font-bold text-white focus:outline-none ${
                    errors.color ? 'border-rose-500' : 'border-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">% Pin thực tế (1-100) *</label>
                <input
                  type="number"
                  value={batteryHealth}
                  onChange={(e) => {
                    setBatteryHealth(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                    setErrors((prev) => ({ ...prev, batteryHealth: undefined }));
                  }}
                  placeholder="VD: 85"
                  className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs font-bold font-mono text-white focus:outline-none ${
                    errors.batteryHealth ? 'border-rose-500' : 'border-slate-700'
                  }`}
                  min={1}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Section 3: IMEI */}
          <div className="p-3.5 bg-slate-850/80 rounded-2xl border border-slate-700/60 space-y-2">
            <label className="block text-xs font-black text-slate-200 mb-1">
              Mã IMEI Máy Thu Lại * (Cho phép nhập lại máy đã bán)
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
                className={`flex-1 px-3 py-2 bg-slate-900 border rounded-xl text-xs font-mono font-bold text-white focus:outline-none ${
                  errors.imei ? 'border-rose-500' : 'border-slate-700'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition badge-nowrap"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quét</span>
              </button>
            </div>
            {errors.imei && <p className="text-[10px] text-rose-400 font-bold">{errors.imei}</p>}
          </div>

          {/* Section 4: Agreed Value */}
          <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/40 space-y-2 shadow-inner">
            <label className="block text-xs font-black text-amber-300 mb-1">
              Giá Thỏa Thuận Thu Lại * (Tự động trừ vào tổng đơn bán)
            </label>
            <MoneyInput
              value={tradeInValue}
              onValueChange={(num) => {
                setTradeInValue(num);
                setErrors((prev) => ({ ...prev, tradeInValue: undefined }));
              }}
              placeholder="0"
              className="px-3.5 py-2.5 bg-slate-900 border-2 border-amber-500 rounded-xl text-sm font-black text-amber-300 font-sans focus:outline-none"
            />
            <div className="flex justify-between items-center text-xs font-bold text-amber-200/80 pt-1">
              <span>Nguồn hàng tự động:</span>
              <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-400/30 font-black badge-nowrap">
                Khách Trade-in
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl text-xs font-black shadow-glow-amber transition active:scale-[0.99]"
            >
              Xác Nhận Thu Máy ({formatVND(tradeInValue)})
            </button>
          </div>
        </form>

        {/* Quick Add Product Model Sub-Modal */}
        {isAddNewModelOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-black uppercase text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thêm Dòng Máy Mới</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddNewModelOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tên dòng máy *</label>
                <input
                  type="text"
                  value={customNewModelName}
                  onChange={(e) => setCustomNewModelName(e.target.value)}
                  placeholder="VD: iPhone 16 Pro Max, iPad Air 6 M2..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Danh mục *</label>
                <select
                  value={customNewCategory}
                  onChange={(e) => setCustomNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white"
                >
                  {DEFAULT_MASTER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddNewModelOpen(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddNewModel}
                  disabled={!customNewModelName.trim()}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black disabled:opacity-50"
                >
                  Lưu & Chọn Luôn
                </button>
              </div>
            </div>
          </div>
        )}
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
