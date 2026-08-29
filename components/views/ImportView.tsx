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
  RefreshCw
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Product, Partner, PaymentMethod, ProductCondition } from '@/types/database';
import {
  getAllMasterColors,
  saveCustomColor,
  DEFAULT_MASTER_SKUS,
  DEFAULT_MASTER_CONDITIONS,
  DEFAULT_MASTER_CATEGORIES,
  sortItemsAZ
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
    productName?: string;
    color?: string;
    batteryHealth?: string;
    imei?: string;
    supplier?: string;
    costPrice?: string;
    sellingPrice?: string;
  }>({});

  // Master Colors
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [isAddingNewColor, setIsAddingNewColor] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');

  // Autocomplete Master Product Search (Tên + Dung lượng + Tình trạng)
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // 3 Mandatory Fields
  const [color, setColor] = useState('Titan Tự Nhiên (Natural Titanium)');
  const [batteryHealth, setBatteryHealth] = useState<number | string>(100);
  const [imeiInput, setImeiInput] = useState('');

  // Pricing & Specs
  const [category, setCategory] = useState('iPhone');
  const [costPrice, setCostPrice] = useState<number>(18500000);
  const [sellingPrice, setSellingPrice] = useState<number>(21500000);

  // Supplier
  const [supplierMode, setSupplierMode] = useState<'existing' | 'new'>('existing');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  // Payment
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Parse IMEI Input
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

  // Combined Master SKU suggestions (DB products + Default Master SKUs)
  const allMasterSkuOptions = useMemo(() => {
    const fromDb = products.map((p) => p.name);
    const combined = Array.from(new Set([...fromDb, ...DEFAULT_MASTER_SKUS]));
    return sortItemsAZ(combined, (item) => item);
  }, [products]);

  const filteredMasterSkus = useMemo(() => {
    if (!productQuery.trim()) return allMasterSkuOptions;
    const q = productQuery.toLowerCase().trim();
    return allMasterSkuOptions.filter((sku) => sku.toLowerCase().includes(q));
  }, [allMasterSkuOptions, productQuery]);

  // Load Initial Data (Cached SWR)
  const fetchData = async () => {
    try {
      setLoading(true);
      setAvailableColors(getAllMasterColors());

      // 1. Instant Cache Load
      const cached = getCachedProducts();
      if (cached && cached.length > 0) {
        setProducts(sortItemsAZ(cached, (p) => p.name));
      }

      // 2. Fetch fresh data
      const [prodRes, suppRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/partners?type=supplier'),
      ]);
      const prodData = await prodRes.json();
      const suppData = await suppRes.json();

      const prodList = prodData.products || [];
      const suppList = suppData.partners || [];

      const sortedProds = sortItemsAZ(prodList, (p: Product) => p.name);
      const sortedSupps = sortItemsAZ(suppList, (s: Partner) => s.name);

      setProducts(sortedProds);
      setCachedProducts(sortedProds);
      setSuppliers(sortedSupps);

      if (sortedProds.length > 0 && !selectedProduct && !productQuery) {
        handleSelectSku(sortedProds[0].name, sortedProds[0]);
      } else if (!productQuery && DEFAULT_MASTER_SKUS.length > 0) {
        setProductQuery(DEFAULT_MASTER_SKUS[0]);
      }

      if (sortedSupps.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(sortedSupps[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSku = (skuName: string, matchedProduct?: Product) => {
    setProductQuery(skuName);
    setFieldErrors((prev) => ({ ...prev, productName: undefined }));

    // Find if exists in db
    const found = matchedProduct || products.find((p) => p.name.toLowerCase() === skuName.toLowerCase());
    if (found) {
      setSelectedProduct(found);
      setCategory(found.category || 'iPhone');
      if (found.base_price && parseFloat(found.base_price as any) > 0) {
        setSellingPrice(parseFloat(found.base_price as any));
        setCostPrice(Math.round(parseFloat(found.base_price as any) * 0.85));
      }
    } else {
      setSelectedProduct(null);
      // Infer category from name
      if (skuName.toLowerCase().includes('ipad')) setCategory('iPad');
      else if (skuName.toLowerCase().includes('macbook')) setCategory('Macbook');
      else if (skuName.toLowerCase().includes('airpods')) setCategory('Airpods');
      else setCategory('iPhone');
    }
    setIsProductDropdownOpen(false);
  };

  const handleAddNewMasterColor = () => {
    if (newColorInput.trim()) {
      saveCustomColor(newColorInput.trim());
      const updated = getAllMasterColors();
      setAvailableColors(updated);
      setColor(newColorInput.trim());
      setFieldErrors((prev) => ({ ...prev, color: undefined }));
      setNewColorInput('');
      setIsAddingNewColor(false);
    }
  };

  const removeSingleImei = (imeiToRemove: string) => {
    const remaining = parsedImeis.filter((i) => i !== imeiToRemove);
    setImeiInput(remaining.join('\n'));
    if (remaining.length > 0) {
      setFieldErrors((prev) => ({ ...prev, imei: undefined }));
    }
  };

  const handleScanImei = (scannedImei: string) => {
    if (!scannedImei || !scannedImei.trim()) return;
    const clean = scannedImei.trim();
    if (!parsedImeis.includes(clean)) {
      const updated = parsedImeis.concat(clean);
      setImeiInput(updated.join('\n'));
      setFieldErrors((prev) => ({ ...prev, imei: undefined }));
    }
  };

  const totalCost = parsedImeis.length * costPrice;
  const debtAdded = Math.max(0, totalCost - paidAmount);

  // STRICT VALIDATION ON SUBMIT
  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    // 1. Master Product Name
    const targetProductName = selectedProduct ? selectedProduct.name : productQuery.trim();
    if (!targetProductName) {
      errors.productName = 'Bắt buộc chọn hoặc nhập Tên sản phẩm mẫu (Tên + Dung lượng + Tình trạng)';
    }

    // 2. Màu sắc (Mandatory)
    if (!color || !color.trim()) {
      errors.color = 'Bắt buộc chọn hoặc nhập Màu sắc máy';
    }

    // 3. % Pin (Mandatory)
    const numBattery = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;
    if (isNaN(numBattery) || numBattery <= 0 || numBattery > 100) {
      errors.batteryHealth = 'Bắt buộc nhập % Pin cụ thể từ 1% đến 100%';
    }

    // 4. Mã IMEI (Mandatory)
    if (parsedImeis.length === 0) {
      errors.imei = 'Bắt buộc nhập hoặc quét ít nhất 1 mã IMEI hợp lệ';
    }

    // 5. Giá vốn & Giá bán
    if (!costPrice || costPrice <= 0) {
      errors.costPrice = 'Vui lòng nhập giá vốn nhập vào lớn hơn 0đ';
    }
    if (!sellingPrice || sellingPrice <= 0) {
      errors.sellingPrice = 'Vui lòng nhập giá bán niêm yết lớn hơn 0đ';
    }

    // 6. Nhà cung cấp (Mandatory)
    if (supplierMode === 'existing') {
      if (!selectedSupplierId) {
        errors.supplier = 'Bắt buộc chọn Nhà cung cấp từ danh sách';
      }
    } else {
      if (!supplierName.trim()) {
        errors.supplier = 'Bắt buộc nhập Tên nhà cung cấp mới';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Run Strict Validation
    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Vui lòng điền đầy đủ và chính xác tất cả các trường bắt buộc (% Pin, Màu sắc, IMEI, Nhà cung cấp)!',
      });
      return;
    }

    const targetProductName = selectedProduct ? selectedProduct.name : productQuery.trim();
    const numBattery = typeof batteryHealth === 'string' ? parseInt(batteryHealth, 10) : batteryHealth;

    let targetSupplier: any = {};
    if (supplierMode === 'existing') {
      const existingSupp = suppliers.find((s) => s.id === selectedSupplierId);
      targetSupplier = {
        id: selectedSupplierId,
        name: existingSupp ? existingSupp.name : 'Nhà Cung Cấp',
      };
    } else {
      targetSupplier = {
        name: supplierName.trim(),
        phone: supplierPhone.trim() || `NCC-${Date.now().toString().slice(-4)}`,
      };
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const items = parsedImeis.map((imei) => ({
        product_id: selectedProduct?.id || undefined,
        product_name: targetProductName,
        category,
        imei,
        cost_price: costPrice,
        selling_price: sellingPrice,
        color: color.trim(),
        storage: '',
        condition: '99%',
        battery_health: numBattery,
      }));

      const payload = {
        orderType: 'import',
        supplier: targetSupplier,
        items,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        note,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi nhập kho');
      }

      setMessage({
        type: 'success',
        text: `Đã nhập kho thành công ${parsedImeis.length} máy! Mã phiếu: #${data.code}`,
      });

      // Invalidate inventory cache & refresh
      invalidateInventoryCache();

      // Reset Form
      setImeiInput('');
      setPaidAmount(0);
      setNote('');
      setFieldErrors({});
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gray-950 text-white rounded-xl shadow-xs">
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
              Nhập Hàng Vào Kho (Strict Master SKU & Validation)
            </h2>
            <p className="text-xs text-gray-500">
              Chọn Tên mẫu máy chuẩn (Tên + Dung lượng + Tình trạng) và bắt buộc nhập đủ Màu sắc, % Pin, IMEI & Nhà cung cấp.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="self-start sm:self-auto px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Đồng bộ kho</span>
        </button>
      </div>

      {/* Global Alert Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border shadow-xs animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span className="font-bold text-xs sm:text-sm">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-700 p-1">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Form: Product Smart SKU & 3 Mandatory Attributes (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span>1. Tên Sản Phẩm Mẫu & 3 Thông Tin Bắt Buộc</span>
            </h3>
            <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              * Strict Validation
            </span>
          </div>

          {/* Autocomplete Master Product Search Dropdown (Tên + Dung lượng + Tình trạng) */}
          <div className="relative" ref={productDropdownRef}>
            <label className="block text-xs font-black text-gray-900 mb-1">
              Tên Sản phẩm mẫu (Bao gồm Tên + Dung lượng + Ngoại hình) *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setIsProductDropdownOpen(true);
                  setFieldErrors((prev) => ({ ...prev, productName: undefined }));
                }}
                onFocus={() => setIsProductDropdownOpen(true)}
                placeholder="Chọn hoặc gõ (VD: iPhone 11 - 64GB - 99%, iPhone 13 - 128GB - 99%)..."
                className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-950 focus:bg-white focus:ring-2 focus:ring-gray-950 focus:outline-none transition ${
                  fieldErrors.productName ? 'border-red-500 bg-red-50/30 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {fieldErrors.productName && (
              <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{fieldErrors.productName}</span>
              </p>
            )}

            {/* Dropdown Options List */}
            {isProductDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-gray-100 animate-in fade-in">
                <div className="p-2 bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Danh sách Sản phẩm Mẫu Chuẩn ({filteredMasterSkus.length} mẫu)
                </div>
                {filteredMasterSkus.map((sku, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSku(sku)}
                    className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-gray-950">{sku}</div>
                    </div>
                    {productQuery.toLowerCase() === sku.toLowerCase() && (
                      <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    )}
                  </div>
                ))}

                {productQuery.trim() && !filteredMasterSkus.some((s) => s.toLowerCase() === productQuery.trim().toLowerCase()) && (
                  <div
                    onClick={() => handleSelectSku(productQuery.trim())}
                    className="p-3 bg-amber-50/80 hover:bg-amber-100 cursor-pointer text-xs font-bold text-amber-950 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4 text-amber-700" />
                    <span>+ Sử dụng tên mẫu mới: &ldquo;{productQuery.trim()}&rdquo;</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3 MANDATORY ATTRIBUTES BOX: Color, Battery %, IMEI */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-900 uppercase tracking-wide">
                3 Thông Tin Bắt Buộc (Màu Sắc, % Pin, IMEI)
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ✓ Ràng buộc nghiêm ngặt
              </span>
            </div>

            {/* 1. Color Master Dropdown & Add Custom Color */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black text-gray-900">
                  1. Màu Sắc (Chọn hoặc gõ thêm màu mới) *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewColor(!isAddingNewColor)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingNewColor ? 'Đóng' : '+ Thêm màu mới vào Hệ thống'}</span>
                </button>
              </div>

              {isAddingNewColor ? (
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <input
                    type="text"
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    placeholder="Nhập tên màu mới (VD: Titan Sa Mạc, Xanh Rừng, Hồng Pastel)..."
                    className="flex-1 px-3 py-2 bg-white border border-emerald-500 rounded-xl text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewMasterColor}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition"
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
                  className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-gray-950 ${
                    fieldErrors.color ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Chọn màu sắc chuẩn --</option>
                  {availableColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {fieldErrors.color && (
                <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.color}</span>
                </p>
              )}
            </div>

            {/* 2. Battery Health Percentage */}
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">
                2. Tình trạng Pin (% Pin thực tế cụ thể) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={batteryHealth}
                  onChange={(e) => {
                    setBatteryHealth(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                    setFieldErrors((prev) => ({ ...prev, batteryHealth: undefined }));
                  }}
                  placeholder="Nhập số % pin (VD: 100, 88, 92)..."
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-bold font-mono text-gray-950 focus:ring-2 focus:ring-gray-950 ${
                    fieldErrors.batteryHealth ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-gray-300'
                  }`}
                  min={1}
                  max={100}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  % Pin
                </span>
              </div>

              {fieldErrors.batteryHealth && (
                <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.batteryHealth}</span>
                </p>
              )}
            </div>

            {/* 3. IMEI Input List & Scanner */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-gray-900">
                  3. Danh Sách Mã IMEI Nhập Kho ({parsedImeis.length} máy) *
                </label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-1 bg-gray-950 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-black active:scale-95 transition"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>Quét Barcode / QR</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={imeiInput}
                onChange={(e) => {
                  setImeiInput(e.target.value);
                  if (e.target.value.trim()) {
                    setFieldErrors((prev) => ({ ...prev, imei: undefined }));
                  }
                }}
                placeholder="Dán hoặc quét danh sách IMEI (mỗi mã 1 dòng, hoặc cách nhau bởi dấu phẩy, khoảng trắng)..."
                className={`w-full p-3 font-mono text-xs bg-white border rounded-xl focus:ring-2 focus:ring-gray-950 focus:outline-none ${
                  fieldErrors.imei ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-gray-300'
                }`}
              />

              {fieldErrors.imei && (
                <p className="text-[11px] font-bold text-red-600 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.imei}</span>
                </p>
              )}

              {hasDuplicateWarning && (
                <div className="text-[11px] text-amber-700 font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Đã tự động loại bỏ mã IMEI trùng lặp trong ô nhập.</span>
                </div>
              )}

              {/* Interactive IMEI Badges Display */}
              {parsedImeis.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    Mã IMEI Đã Phân Tách Hợp Lệ ({parsedImeis.length} chiếc):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {parsedImeis.map((imei, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 bg-gray-100 border border-gray-300 text-gray-950 px-2 py-0.5 rounded-lg text-xs font-mono font-black"
                      >
                        <span>{imei}</span>
                        <button
                          type="button"
                          onClick={() => removeSingleImei(imei)}
                          className="text-gray-400 hover:text-red-600 p-0.5 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing: Cost Price & Suggested Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">
                Giá vốn nhập vào / 1 máy *
              </label>
              <MoneyInput
                value={costPrice}
                onValueChange={(num) => {
                  setCostPrice(num);
                  setFieldErrors((prev) => ({ ...prev, costPrice: undefined }));
                }}
                placeholder="VD: 18.500.000"
                className={`px-3 py-2 bg-white border rounded-xl text-sm font-black text-rose-700 font-mono ${
                  fieldErrors.costPrice ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              />
              {fieldErrors.costPrice && (
                <p className="text-[10px] font-bold text-red-600 mt-1">{fieldErrors.costPrice}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">
                Giá niêm yết bán ra / 1 máy *
              </label>
              <MoneyInput
                value={sellingPrice}
                onValueChange={(num) => {
                  setSellingPrice(num);
                  setFieldErrors((prev) => ({ ...prev, sellingPrice: undefined }));
                }}
                placeholder="VD: 21.500.000"
                className={`px-3 py-2 bg-white border rounded-xl text-sm font-black text-emerald-700 font-mono ${
                  fieldErrors.sellingPrice ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              />
              {fieldErrors.sellingPrice && (
                <p className="text-[10px] font-bold text-red-600 mt-1">{fieldErrors.sellingPrice}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Form: Supplier & Payment Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              2. Nhà Cung Cấp & Thanh Toán Lô Hàng
            </h3>
            <span className="text-[10px] font-bold text-gray-500">
              Bước hoàn tất
            </span>
          </div>

          {/* Supplier Mode Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setSupplierMode('existing');
                setFieldErrors((prev) => ({ ...prev, supplier: undefined }));
              }}
              className={`py-1.5 rounded-lg transition ${
                supplierMode === 'existing'
                  ? 'bg-white text-gray-950 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              NCC Có Sẵn ({suppliers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSupplierMode('new');
                setFieldErrors((prev) => ({ ...prev, supplier: undefined }));
              }}
              className={`py-1.5 rounded-lg transition ${
                supplierMode === 'new'
                  ? 'bg-white text-gray-950 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              + Tạo NCC Mới
            </button>
          </div>

          {/* Supplier Select / Input */}
          {supplierMode === 'existing' ? (
            <div>
              <label className="block text-xs font-black text-gray-900 mb-1">
                Chọn Nhà cung cấp *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => {
                  setSelectedSupplierId(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, supplier: undefined }));
                }}
                className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none ${
                  fieldErrors.supplier ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">-- Chọn Nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone}) {s.debt !== 0 ? `- Nợ: ${formatVND(Math.abs(s.debt))}` : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.supplier && (
                <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{fieldErrors.supplier}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-black text-gray-900 mb-1">Tên Nhà cung cấp mới *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => {
                    setSupplierName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, supplier: undefined }));
                  }}
                  placeholder="VD: Kho Táo Sài Gòn, Anh Tuấn Phụ Kiện..."
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold ${
                    fieldErrors.supplier ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.supplier && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fieldErrors.supplier}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại NCC</label>
                <input
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Số lượng máy nhập:</span>
              <span className="font-black text-gray-950 font-mono text-sm">{parsedImeis.length} chiếc</span>
            </div>

            <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
              <span>TỔNG TIỀN VỐN LÔ HÀNG:</span>
              <span className="font-mono text-rose-700 text-lg font-black">{formatVND(totalCost)}</span>
            </div>

            {/* Paid to Supplier Auto-formatted */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-800">Thanh toán cho NCC:</span>
              <div className="w-44">
                <MoneyInput
                  value={paidAmount}
                  onValueChange={(num) => setPaidAmount(num)}
                  placeholder="0"
                  className="px-3 py-2 text-right bg-white border-2 border-gray-900 rounded-xl text-sm font-black text-emerald-700 font-mono"
                />
              </div>
            </div>

            {debtAdded > 0 && (
              <div className="flex justify-between font-bold text-red-600 pt-1">
                <span>Còn nợ NCC (Ghi nợ tự động):</span>
                <span className="font-mono font-black text-sm">+{formatVND(debtAdded)}</span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Hình thức chi tiền
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'transfer'
                    ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                💳 Quỹ Chuyển Khoản
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'cash'
                    ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                💵 Quỹ Tiền Mặt
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú phiếu nhập (Lô hàng Sài Gòn đợt 2...)"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gray-950 hover:bg-black text-white rounded-2xl text-sm font-black shadow-lg shadow-gray-900/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 active:scale-[0.99]"
          >
            <span>{submitting ? 'Đang Xử Lý Nhập Kho...' : 'XÁC NHẬN NHẬP KHO & LẬP PHIẾU'}</span>
          </button>
        </div>
      </form>

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanImei}
        title="Quét Barcode / QR IMEI Nhập Hàng"
      />
    </div>
  );
}
