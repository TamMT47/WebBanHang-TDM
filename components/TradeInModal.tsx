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
import { TradeInItemInput } from '@/types/database';
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

const DEFAULT_MASTER_COLORS = [
  'Midnight (Đen)',
  'Starlight (Trắng)',
  'Gold (Vàng)',
  'Silver (Bạc)',
  'Space Grey (Xám)',
  'Titan Tự Nhiên (Natural)',
  'Titan Sa Mạc (Desert)',
  'Titan Xanh (Blue)',
  'Titan Đen (Black)',
  'Deep Purple (Tím Đậm)',
  'Graphite (Than Chì)',
  'Sierra Blue (Xanh)',
  'Pacific Blue (Xanh Đại Dương)',
  'Xanh Mint (Green)',
  'Hồng (Pink)',
  'Đỏ (Product Red)',
  'Vàng (Yellow)',
  'Mặc định'
];

interface TradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: TradeInItemInput & { selling_price?: number }) => void;
  initialItem?: (TradeInItemInput & { selling_price?: number }) | null;
}

export default function TradeInModal({
  isOpen,
  onClose,
  onConfirm,
  initialItem,
}: TradeInModalProps) {
  // 1. Modular Product Specs
  const [modelName, setModelName] = useState('iPhone 12');
  const [modelSearchQuery, setModelSearchQuery] = useState('iPhone 12');
  const [storage, setStorage] = useState('128GB');
  const [condition, setCondition] = useState('99%');
  const [category, setCategory] = useState('iPhone');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Sub-modal for creating a new product model template
  const [isAddNewModelOpen, setIsAddNewModelOpen] = useState(false);
  const [customNewModelName, setCustomNewModelName] = useState('');
  const [customNewCategory, setCustomNewCategory] = useState('iPhone');

  // 2. Standard Color & Free % Battery
  const [color, setColor] = useState('Midnight (Đen)');
  const [batteryHealth, setBatteryHealth] = useState<number | string>(85);

  // 3. IMEI & Scanner
  const [imei, setImei] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 4. Trade-in Value & Selling Price
  const [tradeInValue, setTradeInValue] = useState<number>(5000000);
  const [sellingPrice, setSellingPrice] = useState<number>(5800000);

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
      const allModels = getAllMasterModels();
      setMasterModels(sortItemsAZ(allModels, (m) => m));

      if (initialItem) {
        setModelName(initialItem.name || 'iPhone 12');
        setModelSearchQuery(initialItem.name || 'iPhone 12');
        setStorage(initialItem.storage || '128GB');
        setCondition(initialItem.condition || '99%');
        setColor(initialItem.color || 'Midnight (Đen)');
        setBatteryHealth(initialItem.battery_health || 85);
        setImei(initialItem.imei || '');
        setTradeInValue(initialItem.trade_in_value || 5000000);
        setSellingPrice(initialItem.selling_price || 5800000);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialItem]);

  const resetForm = () => {
    setModelName('iPhone 12');
    setModelSearchQuery('iPhone 12');
    setStorage('128GB');
    setCondition('99%');
    setColor('Midnight (Đen)');
    setBatteryHealth(85);
    setImei('');
    setTradeInValue(5000000);
    setSellingPrice(5800000);
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
      errs.color = 'Vui lòng chọn Màu sắc máy';
    }
    const numBat = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;
    if (isNaN(numBat) || numBat <= 0 || numBat > 100) {
      errs.batteryHealth = 'Vui lòng nhập % Pin từ 1 đến 100';
    }
    if (!imei.trim()) {
      errs.imei = 'Vui lòng nhập hoặc quét mã IMEI máy thu cũ';
    } else if (imei.trim().length < 8) {
      errs.imei = 'Mã IMEI không hợp lệ (tối thiểu 8 ký tự)';
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

    onConfirm({
      name: modelName.trim(),
      category,
      storage,
      condition,
      color: color.trim(),
      imei: imei.trim(),
      battery_health: isNaN(numBat) ? 85 : numBat,
      trade_in_value: tradeInValue,
      selling_price: sellingPrice || Math.round(tradeInValue * 1.15),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 rounded-xl font-bold shadow-glow-amber">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Thu Cũ Đổi Mới (Trade-in)
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Khóa chuẩn thông số, nhập % pin & IMEI tự do, định giá thu và giá bán
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
          
          {/* Section 1: Modular Specs */}
          <div className="p-3.5 bg-slate-850/80 rounded-2xl border border-slate-700/60 space-y-3">
            <span className="text-xs font-black text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Thông Số Dòng Máy Thu Lại</span>
            </span>

            {/* Model Search with Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Dòng sản phẩm * (Chọn mẫu chuẩn)
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddNewModelOpen(true)}
                  className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded text-[10px] font-bold border border-cyan-500/30 badge-nowrap"
                >
                  + Thêm Mẫu Mới
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modelSearchQuery}
                  onChange={(e) => {
                    setModelSearchQuery(e.target.value);
                    setIsModelDropdownOpen(true);
                  }}
                  onFocus={() => setIsModelDropdownOpen(true)}
                  placeholder="Gõ tìm: iPhone 11, iPhone 12 Pro Max..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                />
                <ChevronDown
                  className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                />
              </div>

              {errors.modelName && <p className="text-[10px] text-rose-400 font-bold mt-1">{errors.modelName}</p>}

              {/* Model Dropdown List */}
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
                        }}
                        className="px-3.5 py-2 hover:bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer flex justify-between items-center"
                      >
                        <span>{m}</span>
                        {modelName === m && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-400">
                      <p className="text-[11px]">Không tìm thấy mẫu &quot;{modelSearchQuery}&quot;</p>
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

            {/* Storage, Condition & Color (Locked Standard Dropdowns) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Dung lượng *</label>
                <select
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
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
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
                >
                  {DEFAULT_MASTER_CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Màu sắc *</label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  {DEFAULT_MASTER_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Free inputs - % Pin & IMEI */}
          <div className="p-3.5 bg-slate-850/80 rounded-2xl border border-slate-700/60 space-y-2.5">
            <span className="text-xs font-black text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>2. % Pin & Mã IMEI Máy Thu Lại</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">% Pin thực tế *</label>
                <input
                  type="number"
                  value={batteryHealth}
                  onChange={(e) => {
                    setBatteryHealth(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                    setErrors((prev) => ({ ...prev, batteryHealth: undefined }));
                  }}
                  placeholder="VD: 85"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  min={1}
                  max={100}
                />
                {errors.batteryHealth && <p className="text-[10px] text-rose-400 font-bold mt-0.5">{errors.batteryHealth}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Mã IMEI (15 số) *</label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={imei}
                    onChange={(e) => {
                      setImei(e.target.value);
                      setErrors((prev) => ({ ...prev, imei: undefined }));
                    }}
                    placeholder="Nhập hoặc quét mã IMEI 15 số..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
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
                {errors.imei && <p className="text-[10px] text-rose-400 font-bold mt-0.5">{errors.imei}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Dual Pricing (Giá Thu Cũ & Giá Niêm Yết Bán Ra) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/40">
            <div>
              <label className="block text-xs font-black text-amber-300 mb-1">
                Giá Thu Cũ (Trừ vào hóa đơn) *
              </label>
              <MoneyInput
                value={tradeInValue}
                onValueChange={(num) => {
                  setTradeInValue(num);
                  if (!sellingPrice || sellingPrice < num) {
                    setSellingPrice(Math.round(num * 1.15));
                  }
                  setErrors((prev) => ({ ...prev, tradeInValue: undefined }));
                }}
                placeholder="0"
                className="px-3.5 py-2.5 bg-slate-900 border-2 border-amber-500 rounded-xl text-sm font-black text-amber-300 font-sans focus:outline-none"
              />
              <div className="text-right text-[11px] font-bold text-amber-300 mt-1 font-sans badge-nowrap">
                Khấu trừ: -{formatVND(tradeInValue)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-cyan-300 mb-1">
                Giá Niêm Yết Bán Ra (Nhập Kho) *
              </label>
              <MoneyInput
                value={sellingPrice}
                onValueChange={(num) => setSellingPrice(num)}
                placeholder="0"
                className="px-3.5 py-2.5 bg-slate-900 border-2 border-cyan-500 rounded-xl text-sm font-black text-cyan-300 font-sans focus:outline-none"
              />
              <div className="text-right text-[11px] font-bold text-cyan-300 mt-1 font-sans badge-nowrap">
                Giá bán ra: {formatVND(sellingPrice)}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl text-xs shadow-glow-amber transition active:scale-95"
            >
              Xác Nhận Thu Cũ
            </button>
          </div>
        </form>

        {/* Sub-modal: Quick Create Product Model */}
        {isAddNewModelOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Tạo Dòng Máy Mới</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddNewModelOpen(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddNewModel} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tên dòng máy (VD: iPhone 16 Pro, iPad Pro M4...)
                  </label>
                  <input
                    type="text"
                    value={customNewModelName}
                    onChange={(e) => setCustomNewModelName(e.target.value)}
                    placeholder="VD: iPhone 16 Pro Max"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddNewModelOpen(false)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-glow-amber transition"
                  >
                    Lưu & Chọn
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Barcode / QR Scanner */}
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(scanned) => {
            setImei(scanned.trim());
            setErrors((prev) => ({ ...prev, imei: undefined }));
          }}
          title="Quét Barcode / QR IMEI Máy Thu Cũ"
        />
      </div>
    </div>
  );
}
