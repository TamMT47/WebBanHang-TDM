'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Smartphone,
  Save,
  Camera,
  Search,
  Check,
  ChevronDown,
  X,
  Layers,
  Sparkles,
  Palette,
  AlertCircle,
  Phone,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Product, Partner, PaymentMethod } from '@/types/database';
import {
  getAllMasterColors,
  saveCustomColor,
  getAllMasterModels,
  saveCustomModel,
  DEFAULT_MASTER_STORAGES,
  DEFAULT_MASTER_CONDITIONS,
  DEFAULT_MASTER_CATEGORIES,
  sortItemsAZ,
  formatProductTitle
} from '@/lib/masterAttributes';
import {
  getCachedProducts,
  setCachedProducts,
  invalidateInventoryCache
} from '@/lib/cache';
import MoneyInput from '@/components/ui/MoneyInput';
import ScannerModal from '@/components/ScannerModal';

interface ImportViewProps {
  user: any;
}

export default function ImportView({ user }: ImportViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Field-level Validation Errors
  const [fieldErrors, setFieldErrors] = useState<{
    modelName?: string;
    storage?: string;
    condition?: string;
    color?: string;
    batteryHealth?: string;
    imei?: string;
    supplier?: string;
    costPrice?: string;
    sellingPrice?: string;
  }>({});

  // Form state
  const [modelName, setModelName] = useState('');
  const [storage, setStorage] = useState('128GB');
  const [condition, setCondition] = useState('99%');
  const [category, setCategory] = useState('iPhone');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Flexible Color & Battery %
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [color, setColor] = useState('');
  const [batteryHealth, setBatteryHealth] = useState<number | string>(100);

  // IMEI Input & Scanner
  const [imeiInput, setImeiInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Pricing
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  // Supplier
  const [supplierMode, setSupplierMode] = useState<'existing' | 'new'>('existing');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  // Payment
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');

  // Combined Clean Model Name suggestions
  const allMasterModelOptions = useMemo(() => {
    const fromDb = products.map((p) => p.name.trim());
    const master = getAllMasterModels();
    const combined = Array.from(new Set([...fromDb, ...master]));
    return sortItemsAZ(combined, (item) => item);
  }, [products]);

  const filteredModelOptions = useMemo(() => {
    if (!modelName.trim()) return allMasterModelOptions;
    const q = modelName.toLowerCase().trim();
    return allMasterModelOptions.filter((m) => m.toLowerCase().includes(q));
  }, [allMasterModelOptions, modelName]);

  // Parse IMEI tokens with auto-deduplication
  const parsedImeis = useMemo(() => {
    const rawTokens = imeiInput
      .split(/[\n,;\t\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return Array.from(new Set(rawTokens));
  }, [imeiInput]);

  const hasDuplicateWarning = useMemo(() => {
    const rawTokens = imeiInput
      .split(/[\n,;\t\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return rawTokens.length > parsedImeis.length;
  }, [imeiInput, parsedImeis]);

  // Total Calculations
  const totalCost = costPrice * parsedImeis.length;
  const totalSelling = sellingPrice * parsedImeis.length;
  const debtCreated = Math.max(0, totalCost - paidAmount);

  // Reset state
  const resetFormState = () => {
    setModelName('');
    setStorage('128GB');
    setCondition('99%');
    setColor('');
    setBatteryHealth(100);
    setImeiInput('');
    setCostPrice(0);
    setSellingPrice(0);
    setPaidAmount(0);
    setSelectedSupplierId('');
    setSupplierName('');
    setSupplierPhone('');
    setNote('');
    setFieldErrors({});
    setMessage(null);
  };

  // Load Initial Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setAvailableColors(getAllMasterColors());

      const cached = getCachedProducts();
      if (cached && cached.length > 0) {
        setProducts(sortItemsAZ(cached, (p) => p.name));
      }

      const [prodRes, suppRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/partners?type=supplier'),
      ]);
      const prodData = await prodRes.json();
      const suppData = await suppRes.json();

      const freshProds = prodData.products || [];
      const freshSupps = suppData.partners || [];

      setProducts(sortItemsAZ(freshProds, (p: Product) => p.name));
      setCachedProducts(freshProds);
      setSuppliers(sortItemsAZ(freshSupps, (s: Partner) => s.name));
    } catch (err) {
      console.error('ImportView fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    resetFormState();
    fetchData();
  }, []);

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

  // Update Category automatically when model changes
  useEffect(() => {
    const lower = modelName.toLowerCase();
    if (lower.includes('ipad')) setCategory('iPad');
    else if (lower.includes('macbook')) setCategory('Macbook');
    else if (lower.includes('airpod')) setCategory('Airpods');
    else if (lower.includes('watch')) setCategory('AppleWatch');
    else if (lower.includes('sạc') || lower.includes('cáp') || lower.includes('tai nghe')) setCategory('PhuKien');
    else setCategory('iPhone');
  }, [modelName]);

  // Validation
  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!modelName.trim()) {
      errors.modelName = 'Vui lòng chọn hoặc nhập Tên dòng máy';
    }

    if (!color.trim()) {
      errors.color = 'Vui lòng chọn hoặc nhập Màu sắc';
    }

    const numBat = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;
    if (category === 'iPhone' || category === 'iPad' || category === 'Macbook') {
      if (isNaN(numBat) || numBat <= 0 || numBat > 100) {
        errors.batteryHealth = 'Vui lòng nhập % Pin thực tế từ 1% đến 100%';
      }
    }

    if (parsedImeis.length === 0) {
      errors.imei = 'Vui lòng quét hoặc nhập ít nhất 1 mã IMEI máy';
    }

    if (!costPrice || costPrice <= 0) {
      errors.costPrice = 'Vui lòng nhập giá vốn nhập vào lớn hơn 0';
    }
    if (!sellingPrice || sellingPrice <= 0) {
      errors.sellingPrice = 'Vui lòng nhập giá niêm yết bán ra';
    }

    if (supplierMode === 'existing' && !selectedSupplierId) {
      errors.supplier = 'Vui lòng chọn một Nhà Cung Cấp từ danh sách';
    } else if (supplierMode === 'new' && !supplierName.trim()) {
      errors.supplier = 'Vui lòng nhập tên Nhà Cung Cấp mới';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Import Order
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Vui lòng kiểm tra lại các trường bị thiếu hoặc không hợp lệ (viền đỏ)!',
      });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      if (color.trim()) {
        saveCustomColor(color.trim());
      }
      if (modelName.trim()) {
        saveCustomModel(modelName.trim());
      }

      const supplierPayload =
        supplierMode === 'existing'
          ? { id: selectedSupplierId }
          : { name: supplierName.trim(), phone: supplierPhone.trim() };

      const numBat = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;

      const itemsPayload = parsedImeis.map((imei) => ({
        product_name: modelName.trim(),
        category,
        storage,
        condition,
        color: color.trim(),
        battery_health: isNaN(numBat) ? 100 : numBat,
        cost_price: costPrice,
        selling_price: sellingPrice,
        imei,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'import',
          supplier: supplierPayload,
          items: itemsPayload,
          paid_amount: paidAmount,
          payment_method: paymentMethod,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra khi nhập kho');

      setMessage({
        type: 'success',
        text: `Đã nhập thành công ${parsedImeis.length} máy "${modelName} (${storage} - ${condition})" vào kho (Mã phiếu: #${data.code})!`,
      });

      invalidateInventoryCache();
      resetFormState();
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-16">
      
      {/* 1. TOP HEADER */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Nhập Hàng Vào Kho (Quy Chuẩn Thông Số Độc Lập)
            </h2>
            <p className="text-xs text-slate-400">
              Chọn Tên máy mẫu, Dung lượng, Tình trạng, Màu sắc & % Pin linh hoạt • Hỗ trợ quét hàng loạt.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetFormState}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 self-start sm:self-auto border border-slate-700 badge-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm mới / Xóa Trắng Form</span>
        </button>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border shadow-sm animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-bold text-xs sm:text-sm">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* 2. FORM BODY */}
      <form onSubmit={handleImportSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT: SPECS & PRODUCT ATTRIBUTES (7 COLS) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Section 1: Modular Product Specs */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-white uppercase tracking-wide flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>1. Chọn Dòng Máy & Thông Số Mẫu</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase badge-nowrap">
                  Thông số độc lập
                </span>
              </div>

              {/* Field: Model Name Autocomplete */}
              <div className="relative" ref={modelDropdownRef}>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên Dòng Máy (Chọn hoặc gõ tên mới) *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => {
                      setModelName(e.target.value);
                      setIsModelDropdownOpen(true);
                      setFieldErrors((prev) => ({ ...prev, modelName: undefined }));
                    }}
                    onFocus={() => setIsModelDropdownOpen(true)}
                    placeholder="VD: iPhone 11, iPhone 13 Pro Max, iPad Pro 11 M2..."
                    className={`w-full pl-10 pr-9 py-2.5 bg-slate-950 border rounded-2xl text-xs font-black text-white focus:outline-none transition ${
                      fieldErrors.modelName
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-700 focus:border-cyan-500'
                    }`}
                  />
                  <ChevronDown
                    className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  />
                </div>

                {fieldErrors.modelName && (
                  <p className="text-[11px] text-rose-400 font-bold mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fieldErrors.modelName}</span>
                  </p>
                )}

                {/* Dropdown Suggestions */}
                {isModelDropdownOpen && filteredModelOptions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-800">
                    {filteredModelOptions.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setModelName(m);
                          setIsModelDropdownOpen(false);
                        }}
                        className="px-4 py-2.5 hover:bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer flex items-center justify-between transition"
                      >
                        <span>{m}</span>
                        {modelName === m && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid: Storage & Condition Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Dung lượng lưu trữ *
                  </label>
                  <select
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    {DEFAULT_MASTER_STORAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tình trạng Ngoại hình *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    {DEFAULT_MASTER_CONDITIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Formatted Title */}
              {modelName && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Tên hiển thị bán lẻ:</span>
                  <span className="font-black text-cyan-300 font-mono badge-nowrap">
                    {formatProductTitle(modelName, storage, condition)}
                  </span>
                </div>
              )}
            </div>

            {/* Section 2: Flexible Color & Battery % */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <span className="text-xs font-black text-white uppercase tracking-wide flex items-center space-x-1.5 pb-2 border-b border-slate-800">
                <Palette className="w-4 h-4 text-purple-400" />
                <span>2. Màu Sắc & Tình Trạng Pin Thực Tế</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Màu sắc máy *
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, color: undefined }));
                    }}
                    placeholder="VD: Titan Tự Nhiên, Midnight..."
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs font-bold text-white focus:outline-none ${
                      fieldErrors.color ? 'border-rose-500' : 'border-slate-700'
                    }`}
                  />
                  {/* Quick Color Chips */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Titan Tự Nhiên', 'Midnight', 'Deep Purple', 'Starlight', 'Silver', 'Gold'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-semibold text-slate-300 border border-slate-700 badge-nowrap"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    % Pin thực tế (1 - 100) *
                  </label>
                  <input
                    type="number"
                    value={batteryHealth}
                    onChange={(e) => {
                      setBatteryHealth(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                      setFieldErrors((prev) => ({ ...prev, batteryHealth: undefined }));
                    }}
                    placeholder="VD: 100, 89, 85..."
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs font-bold font-mono text-white focus:outline-none ${
                      fieldErrors.batteryHealth ? 'border-rose-500' : 'border-slate-700'
                    }`}
                    min={1}
                    max={100}
                  />
                  {fieldErrors.batteryHealth && (
                    <p className="text-[10px] text-rose-400 font-bold mt-1">{fieldErrors.batteryHealth}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: IMEI Scanner & Input */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-white uppercase tracking-wide flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>3. Danh Sách Mã IMEI Nhập Kho *</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition badge-nowrap"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Quét Camera Liên Tục</span>
                </button>
              </div>

              <textarea
                value={imeiInput}
                onChange={(e) => {
                  setImeiInput(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, imei: undefined }));
                }}
                rows={3}
                placeholder="Dán hoặc quét danh sách IMEI (cách nhau bởi dấu cách, phẩy hoặc xuống dòng)..."
                className={`w-full p-3 bg-slate-950 border rounded-xl text-xs font-mono font-bold text-white focus:outline-none ${
                  fieldErrors.imei ? 'border-rose-500' : 'border-slate-700'
                }`}
              />

              {fieldErrors.imei && (
                <p className="text-[11px] text-rose-400 font-bold flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.imei}</span>
                </p>
              )}

              {/* IMEI Count & Badges */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-400">Đã nhận diện:</span>
                  <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 font-black rounded-full border border-cyan-500/30 badge-nowrap">
                    {parsedImeis.length} máy
                  </span>
                </div>
                {hasDuplicateWarning && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 badge-nowrap">
                    ⚠️ Đã tự động loại bỏ IMEI trùng lặp
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: SUPPLIER, PRICING & SUMMARY (5 COLS) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Supplier Section */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-white uppercase tracking-wide flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>4. Nhà Cung Cấp *</span>
                </span>
                <div className="flex rounded-xl bg-slate-950 p-0.5 text-[11px] font-bold border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSupplierMode('existing')}
                    className={`px-2.5 py-1 rounded-lg transition badge-nowrap ${
                      supplierMode === 'existing' ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan' : 'text-slate-400'
                    }`}
                  >
                    NCC Có Sẵn
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupplierMode('new')}
                    className={`px-2.5 py-1 rounded-lg transition badge-nowrap ${
                      supplierMode === 'new' ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan' : 'text-slate-400'
                    }`}
                  >
                    + Thêm Mới
                  </button>
                </div>
              </div>

              {supplierMode === 'existing' ? (
                <div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                      setSelectedSupplierId(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, supplier: undefined }));
                    }}
                    className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs font-bold text-white focus:outline-none ${
                      fieldErrors.supplier ? 'border-rose-500' : 'border-slate-700'
                    }`}
                  >
                    <option value="">-- Chọn Nhà Cung Cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, supplier: undefined }));
                    }}
                    placeholder="Tên Nhà Cung Cấp mới *"
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs font-bold text-white focus:outline-none ${
                      fieldErrors.supplier ? 'border-rose-500' : 'border-slate-700'
                    }`}
                  />
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="Số điện thoại NCC (Tùy chọn)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
              )}

              {fieldErrors.supplier && (
                <p className="text-[11px] text-rose-400 font-bold mt-1">{fieldErrors.supplier}</p>
              )}
            </div>

            {/* Pricing Section */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <span className="text-xs font-black text-white uppercase tracking-wide pb-2 border-b border-slate-800 block">
                5. Đơn Giá & Thanh Toán Đợt Hàng
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-1">
                    Giá vốn nhập vào / 1 máy *
                  </label>
                  <MoneyInput
                    value={costPrice}
                    onValueChange={(num) => setCostPrice(num)}
                    placeholder="0"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-black text-rose-400 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-400 mb-1">
                    Giá niêm yết bán lẻ đề xuất *
                  </label>
                  <MoneyInput
                    value={sellingPrice}
                    onValueChange={(num) => setSellingPrice(num)}
                    placeholder="0"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-black text-cyan-300 font-mono focus:outline-none"
                  />
                </div>

                {/* Financial Overview */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Tổng tiền nhập ({parsedImeis.length} máy):</span>
                    <span className="font-black text-rose-400 font-mono badge-nowrap">{formatVND(totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tổng giá bán dự kiến:</span>
                    <span className="font-bold text-cyan-300 font-mono badge-nowrap">{formatVND(totalSelling)}</span>
                  </div>
                </div>

                {/* Paid Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tiền trả trước cho NCC
                  </label>
                  <MoneyInput
                    value={paidAmount}
                    onValueChange={(num) => setPaidAmount(num)}
                    placeholder="0"
                    className="px-3 py-2 bg-slate-950 border-2 border-cyan-500 rounded-xl text-xs font-black font-mono text-cyan-300 focus:outline-none"
                  />
                </div>

                {debtCreated > 0 && (
                  <div className="text-[11px] text-amber-300 bg-amber-500/15 p-2 rounded-xl font-bold border border-amber-500/30">
                    ⚠️ Ghi nhận nợ tiền NCC: +{formatVND(debtCreated)}
                  </div>
                )}

                {/* Note */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú đợt nhập hàng..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 rounded-2xl text-sm font-black shadow-glow-cyan flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span className="badge-nowrap">{submitting ? 'ĐANG NHẬP KHO...' : `XÁC NHẬN NHẬP KHO (${parsedImeis.length} MÁY)`}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Barcode Scanner Modal */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setImeiInput((prev) => (prev ? `${prev}\n${code}` : code));
        }}
        title="Quét Mã IMEI Nhập Kho"
      />
    </div>
  );
}
