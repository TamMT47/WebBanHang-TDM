'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Palette
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Product, Partner, PaymentMethod, ProductCondition } from '@/types/database';
import {
  getAllMasterColors,
  saveCustomColor,
  DEFAULT_MASTER_STORAGES,
  DEFAULT_MASTER_CONDITIONS,
  DEFAULT_MASTER_CATEGORIES
} from '@/lib/masterAttributes';
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

  // Master Colors & Custom Color Creation
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [isAddingNewColor, setIsAddingNewColor] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');

  // Autocomplete Product Search
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Master Specs Selection
  const [category, setCategory] = useState('iPhone');
  const [storage, setStorage] = useState('128GB');
  const [color, setColor] = useState('Titan Tự Nhiên (Natural Titanium)');
  const [condition, setCondition] = useState<ProductCondition>('99%');
  const [batteryHealth, setBatteryHealth] = useState(100);
  const [costPrice, setCostPrice] = useState<number>(18500000);
  const [sellingPrice, setSellingPrice] = useState<number>(21500000);

  // IMEI Input Textarea & Parsed Badges
  const [imeiInput, setImeiInput] = useState('');

  // Supplier state
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

  // Fetch Products, Master Colors, Suppliers
  const fetchData = async () => {
    try {
      setLoading(true);
      setAvailableColors(getAllMasterColors());

      const [prodRes, suppRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/partners?type=supplier'),
      ]);
      const prodData = await prodRes.json();
      const suppData = await suppRes.json();

      const prodList = prodData.products || [];
      const suppList = suppData.partners || [];

      setProducts(prodList);
      setSuppliers(suppList);

      if (prodList.length > 0 && !selectedProduct) {
        handleSelectProduct(prodList[0]);
      }
      if (suppList.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppList[0].id);
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

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductQuery(prod.name);
    setCategory(prod.category || 'iPhone');
    if (prod.base_price && parseFloat(prod.base_price as any) > 0) {
      setSellingPrice(parseFloat(prod.base_price as any));
      setCostPrice(Math.round(parseFloat(prod.base_price as any) * 0.85));
    }
    setIsProductDropdownOpen(false);
  };

  const handleCreateNewProductName = (name: string) => {
    setSelectedProduct(null);
    setProductQuery(name.trim());
    setIsProductDropdownOpen(false);
  };

  const handleAddNewMasterColor = () => {
    if (newColorInput.trim()) {
      saveCustomColor(newColorInput.trim());
      const updated = getAllMasterColors();
      setAvailableColors(updated);
      setColor(newColorInput.trim());
      setNewColorInput('');
      setIsAddingNewColor(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productQuery.toLowerCase().trim())
  );

  // Parse IMEI Input into clean unique array
  const parsedImeis = React.useMemo(() => {
    const rawTokens = imeiInput
      .split(/[\n,;\t\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return Array.from(new Set(rawTokens));
  }, [imeiInput]);

  const hasDuplicateWarning = React.useMemo(() => {
    const rawTokens = imeiInput
      .split(/[\n,;\t\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return rawTokens.length > parsedImeis.length;
  }, [imeiInput, parsedImeis]);

  const removeSingleImei = (imeiToRemove: string) => {
    const remaining = parsedImeis.filter((i) => i !== imeiToRemove);
    setImeiInput(remaining.join('\n'));
  };

  const handleScanImei = (scannedImei: string) => {
    if (!parsedImeis.includes(scannedImei.trim())) {
      const updated = parsedImeis.concat(scannedImei.trim());
      setImeiInput(updated.join('\n'));
    }
  };

  const totalCost = parsedImeis.length * costPrice;
  const debtAdded = Math.max(0, totalCost - paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetProductName = selectedProduct ? selectedProduct.name : productQuery.trim();
    if (!targetProductName) {
      setMessage({ type: 'error', text: 'Vui lòng chọn hoặc nhập tên dòng máy cần nhập' });
      return;
    }

    if (parsedImeis.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng nhập ít nhất 1 mã IMEI hợp lệ' });
      return;
    }

    let targetSupplier: any = {};
    if (supplierMode === 'existing') {
      if (!selectedSupplierId) {
        setMessage({ type: 'error', text: 'Vui lòng chọn Nhà cung cấp' });
        return;
      }
      const existingSupp = suppliers.find((s) => s.id === selectedSupplierId);
      targetSupplier = {
        id: selectedSupplierId,
        name: existingSupp ? existingSupp.name : 'Nhà Cung Cấp',
      };
    } else {
      if (!supplierName.trim()) {
        setMessage({ type: 'error', text: 'Vui lòng nhập tên Nhà cung cấp mới' });
        return;
      }
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
        color,
        storage,
        condition,
        battery_health: batteryHealth,
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

      // Reset Form
      setImeiInput('');
      setPaidAmount(0);
      setNote('');
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
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gray-950 text-white rounded-xl">
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
              Nhập Hàng Vào Kho (Chuẩn Hóa Thuộc Tính Master)
            </h2>
            <p className="text-xs text-gray-500">
              Gợi ý thông minh dòng máy, chọn màu sắc chuẩn cố định và tự động phân tách danh sách IMEI.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-semibold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Form: Product Smart Autocomplete & Master Attributes (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
            <span>1. Chọn Dòng Máy & Bộ Thuộc Tính Chuẩn</span>
          </h3>

          {/* Autocomplete Product Search Dropdown */}
          <div className="relative" ref={productDropdownRef}>
            <label className="block text-xs font-black text-gray-900 mb-1">
              Nhóm dòng máy Apple (Gõ để tìm kiếm nhanh) *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                onFocus={() => setIsProductDropdownOpen(true)}
                placeholder="Gõ tên máy (VD: 15 Pro Max, 13, iPad Air...)"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-950 focus:outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Options List */}
            {isProductDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-gray-950">{p.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase">{p.category}</div>
                    </div>
                    {selectedProduct?.id === p.id && (
                      <Check className="w-4 h-4 text-emerald-600 font-bold" />
                    )}
                  </div>
                ))}

                {productQuery.trim() && !products.some((p) => p.name.toLowerCase() === productQuery.trim().toLowerCase()) && (
                  <div
                    onClick={() => handleCreateNewProductName(productQuery)}
                    className="p-3 bg-amber-50/70 hover:bg-amber-50 cursor-pointer text-xs font-bold text-amber-900 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4 text-amber-700" />
                    <span>Tạo nhóm dòng máy mới: &ldquo;{productQuery.trim()}&rdquo;</span>
                  </div>
                )}
              </div>
            )}

            {selectedProduct && (
              <div className="mt-1.5 flex items-center space-x-2 text-[11px] text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã liên kết với nhóm máy: {selectedProduct.name} ({selectedProduct.category})</span>
              </div>
            )}
          </div>

          {/* Master Attributes Selection: Color, Storage, Condition, Battery */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-gray-700 uppercase">
                Bộ Thuộc Tính Master Cố Định
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Khắc phục sai màu
              </span>
            </div>

            {/* Color Master Dropdown & Add Custom Color */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-800">
                  Màu sắc chuẩn (Chọn từ danh sách) *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewColor(!isAddingNewColor)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAddingNewColor ? 'Đóng' : 'Thêm màu mới vào Hệ thống'}</span>
                </button>
              </div>

              {isAddingNewColor ? (
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <input
                    type="text"
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    placeholder="Nhập tên màu mới (VD: Titan Sa Mạc Đậm, Xanh Rừng)..."
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
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-gray-900"
                >
                  {availableColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Storage, Condition, Battery */}
            <div className="grid grid-cols-3 gap-2.5">
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

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">% Pin</label>
                <input
                  type="number"
                  value={batteryHealth}
                  onChange={(e) => setBatteryHealth(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold font-mono"
                  min={50}
                  max={100}
                />
              </div>
            </div>
          </div>

          {/* Pricing: Cost Price & Suggested Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Giá vốn nhập vào / 1 máy *
              </label>
              <MoneyInput
                value={costPrice}
                onValueChange={(num) => setCostPrice(num)}
                placeholder="VD: 18.500.000"
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-rose-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Giá niêm yết bán ra / 1 máy *
              </label>
              <MoneyInput
                value={sellingPrice}
                onValueChange={(num) => setSellingPrice(num)}
                placeholder="VD: 21.500.000"
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-emerald-700 font-mono"
              />
            </div>
          </div>

          {/* IMEI Input List with Camera Scanner & Interactive Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                Danh Sách Mã IMEI Nhập Kho ({parsedImeis.length} máy) *
              </label>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1 bg-gray-950 text-white rounded-xl text-xs font-bold flex items-center space-x-1 hover:bg-black active:scale-95 transition"
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Quét Barcode/QR</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={imeiInput}
              onChange={(e) => setImeiInput(e.target.value)}
              placeholder="Dán hoặc gõ danh sách IMEI (mỗi mã 1 dòng, hoặc cách nhau bởi dấu phẩy, khoảng trắng)..."
              className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-gray-950 focus:outline-none"
            />

            {hasDuplicateWarning && (
              <div className="text-[11px] text-amber-700 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Đã tự động loại bỏ mã IMEI trùng lặp trong ô nhập.</span>
              </div>
            )}

            {/* Interactive IMEI Badges Display */}
            {parsedImeis.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  Mã IMEI Hợp Lệ ({parsedImeis.length} chiếc):
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {parsedImeis.map((imei, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1 bg-white border border-gray-300 text-gray-950 px-2 py-0.5 rounded-lg text-xs font-mono font-bold shadow-2xs"
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

        {/* Right Form: Supplier & Payment Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
            2. Nhà Cung Cấp & Thanh Toán
          </h3>

          {/* Supplier Mode Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSupplierMode('existing')}
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
              onClick={() => setSupplierMode('new')}
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
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Chọn Nhà cung cấp *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none"
              >
                {suppliers.length === 0 ? (
                  <option value="">Chưa có nhà cung cấp nào - Hãy tạo mới</option>
                ) : (
                  suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) {s.debt !== 0 ? `- Nợ: ${formatVND(Math.abs(s.debt))}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Tên NCC mới *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="VD: Kho Táo Sài Gòn / Anh Tuấn..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  required={supplierMode === 'new'}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-0.5">SĐT NCC</label>
                <input
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5 text-xs">
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
              <div className="w-40">
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
                <span>Còn nợ NCC:</span>
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
            disabled={submitting || parsedImeis.length === 0}
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
