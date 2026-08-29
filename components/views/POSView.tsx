'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Camera,
  Plus,
  Trash2,
  RefreshCw,
  Printer,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Shield,
  ShoppingBag,
  Percent,
  CreditCard,
  Banknote,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Coins,
  ChevronDown,
  Layers,
  Phone,
  User,
  MapPin,
  FileCheck,
  Check,
  X,
  CreditCard as PaymentIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatVND } from '@/lib/format';
import { strictProductMatch, sortItemsAZ, formatProductTitle } from '@/lib/masterAttributes';
import {
  getCachedInventory,
  setCachedInventory,
  invalidateInventoryCache,
  subscribeToCacheInvalidation
} from '@/lib/cache';
import { InventoryItem } from '@/types/database';
import ScannerModal from '@/components/ScannerModal';
import InvoiceModal from '@/components/InvoiceModal';
import POSCheckoutModal from '@/components/POSCheckoutModal';

interface POSViewProps {
  user: any;
}

export default function POSView({ user }: POSViewProps) {
  // Products & Inventory in stock
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart State
  const [cart, setCart] = useState<
    Array<{
      inventory: InventoryItem;
      price: number;
      warranty_months: number;
    }>
  >([]);

  // Customer Management on POS (Requirement 3)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id?: string;
    name: string;
    phone: string;
    address?: string;
    cccd?: string;
    debt?: number;
  } | null>(null);

  // Customer search & create modal state
  const [customerQuery, setCustomerQuery] = useState('');
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isCreatingNewCust, setIsCreatingNewCust] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCccd, setNewCustCccd] = useState('');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Status & Notifications
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Inventory with SWR
  const fetchInventory = async () => {
    try {
      const cached = getCachedInventory();
      if (cached && cached.length > 0) {
        setInventory(cached);
        setLoading(false);
      }

      const res = await fetch('/api/inventory?status=in_stock');
      const data = await res.json();
      const freshList = data.inventory || [];
      
      const sorted = sortItemsAZ(freshList, (item: InventoryItem) => item.product_name || '');
      setInventory(sorted);
      setCachedInventory(sorted);
    } catch (err) {
      console.error('POS inventory load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    const unsubscribe = subscribeToCacheInvalidation(() => {
      fetchInventory();
    });

    return () => unsubscribe();
  }, []);

  // Quick Customer Search
  useEffect(() => {
    const q = customerQuery.trim();
    if (q.length >= 2) {
      setSearchingCustomer(true);
      fetch(`/api/partners?search=${encodeURIComponent(q)}&type=customer`)
        .then((res) => res.json())
        .then((data) => setCustomersList(data.partners || []))
        .catch((e) => console.error(e))
        .finally(() => setSearchingCustomer(false));
    } else {
      setCustomersList([]);
    }
  }, [customerQuery]);

  // RESET ALL STATE (REQUIREMENT 2 & 3)
  const resetAllPOSState = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSearchTerm('');
    setMessage(null);
    setCustomerQuery('');
    setIsCreatingNewCust(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustCccd('');
  };

  // Add Item to Cart
  const addToCart = (item: InventoryItem) => {
    if (cart.some((c) => c.inventory.id === item.id)) {
      setMessage({
        type: 'error',
        text: `Máy ${item.product_name} (IMEI: ${item.imei}) đã có trong giỏ hàng!`,
      });
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        inventory: item,
        price: parseFloat(item.selling_price as any) || 0,
        warranty_months: 12,
      },
    ]);
    setMessage({
      type: 'success',
      text: `Đã thêm ${item.product_name} (IMEI: ${item.imei}) vào giỏ hàng!`,
    });
  };

  const removeFromCart = (inventoryId: string) => {
    setCart((prev) => prev.filter((c) => c.inventory.id !== inventoryId));
  };

  // Barcode / QR scan success with automatic debounce & de-duplication
  const handleScanSuccess = (decodedImei: string) => {
    const clean = decodedImei.trim().toLowerCase();
    const match = inventory.find((i) => i.imei.toLowerCase() === clean);
    if (match) {
      addToCart(match);
    } else {
      setMessage({
        type: 'error',
        text: `Không tìm thấy mã IMEI "${decodedImei}" còn hàng trong kho!`,
      });
    }
  };

  // Handle Clicking "Thanh Toán" (Requirement 2: ALWAYS AVAILABLE & PROMINENT)
  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      setMessage({
        type: 'error',
        text: '⚠️ Giỏ hàng hiện đang trống! Vui lòng chọn ít nhất 1 máy hoặc quét mã IMEI để thanh toán.',
      });
      return;
    }
    setIsCheckoutOpen(true);
  };

  // Complete Order Handler
  const handleCompleteOrder = async (payload: any) => {
    try {
      setSubmitting(true);
      setMessage(null);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo đơn hàng');
      }

      // Confetti celebration
      try {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      } catch (e) {}

      // Prepare Invoice
      setCompletedOrder({
        code: data.code,
        created_at: new Date().toISOString(),
        partner_name: payload.customer.name,
        partner_phone: payload.customer.phone,
        partner_address: payload.customer.address,
        partner_cccd: payload.customer.cccd,
        creator_name: user?.full_name,
        total_amount: cart.reduce((s, i) => s + i.price, 0),
        discount: payload.discount,
        trade_in_value: payload.trade_in ? payload.trade_in.trade_in_value : 0,
        final_payment: Math.max(
          0,
          cart.reduce((s, i) => s + i.price, 0) -
            (payload.discount || 0) -
            (payload.trade_in?.trade_in_value || 0)
        ),
        paid_amount: payload.paid_amount,
        payment_method: payload.payment_method,
        items: cart.map((c) => ({
          product_name: c.inventory.product_name,
          imei: c.inventory.imei,
          price: c.price,
          warranty_months: c.warranty_months,
          battery_health: c.inventory.battery_health,
          color: c.inventory.color,
          storage: c.inventory.storage,
          condition: c.inventory.condition,
        })),
        trade_in_item: payload.trade_in,
      });

      setIsCheckoutOpen(false);
      setIsInvoiceOpen(true);

      // Auto Reset State
      resetAllPOSState();
      invalidateInventoryCache();
      fetchInventory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Customer Creation Handler
  const handleSaveNewCustomer = () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Vui lòng nhập Tên và Số điện thoại khách hàng');
      return;
    }

    setSelectedCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      cccd: newCustCccd.trim(),
      debt: 0,
    });

    setIsCustomerModalOpen(false);
    setIsCreatingNewCust(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustCccd('');
  };

  const categories = [
    { id: 'all', label: 'Tất cả máy' },
    { id: 'iPhone', label: 'iPhone' },
    { id: 'iPad', label: 'iPad' },
    { id: 'Macbook', label: 'Macbook' },
    { id: 'Airpods', label: 'Airpods' },
  ];

  // Group inventory items by product name
  const groupedProducts = useMemo(() => {
    const groups: Record<
      string,
      {
        product_name: string;
        category: string;
        items: InventoryItem[];
      }
    > = {};

    inventory.forEach((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch = strictProductMatch(
        item.product_name || '',
        item.imei,
        item.color,
        searchTerm
      );

      if (matchCat && matchSearch) {
        const key = item.product_name || 'Khác';
        if (!groups[key]) {
          groups[key] = {
            product_name: key,
            category: item.category || 'iPhone',
            items: [],
          };
        }
        groups[key].items.push(item);
      }
    });

    const list = Object.values(groups);
    return sortItemsAZ(list, (g) => g.product_name);
  }, [inventory, selectedCategory, searchTerm]);

  const totalInStockCount = groupedProducts.reduce((sum, g) => sum + g.items.length, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="space-y-4 pb-24 sm:pb-8">
      
      {/* 1. TOP BAR: CLEAN VIEW - Instant Search, Fast Scan, Customer Finder */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gõ tìm tức thì (VD: 11, 13 Pro Max) hoặc quét 15 số IMEI..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-950 focus:bg-white focus:ring-2 focus:ring-gray-950 focus:outline-none transition"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Fast Barcode/QR Camera Scan Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              title="Bật Camera Quét Barcode/QR IMEI Siêu Nhạy"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Quét Barcode/QR</span>
            </button>

            {/* Quick Customer Search Button */}
            <button
              onClick={() => {
                setIsCustomerModalOpen(true);
                setCustomerQuery('');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition ${
                selectedCustomer
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'
              }`}
            >
              <User className="w-3.5 h-3.5 text-gray-700" />
              <span>{selectedCustomer ? selectedCustomer.name : 'Khách Hàng'}</span>
            </button>
          </div>
        </div>

        {/* Selected Customer Card with Change & Clear */}
        {selectedCustomer && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between animate-in fade-in text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-emerald-950 text-sm">{selectedCustomer.name}</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    Khách Hàng Đã Chọn
                  </span>
                </div>
                <div className="text-gray-600 font-mono font-bold text-[11px]">
                  SĐT: {selectedCustomer.phone} {selectedCustomer.address ? `• ${selectedCustomer.address}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomerModalOpen(true);
                  setCustomerQuery('');
                }}
                className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 rounded-lg font-bold shadow-2xs text-[11px]"
              >
                Đổi khách hàng
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg font-bold text-[11px]"
              >
                Xóa / Clear
              </button>
            </div>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-gray-950 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border shadow-xs animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className="font-bold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN GRID: PRODUCTS CATALOG & CART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT: Products Catalog Grouped & A-Z Sorted (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
              Danh Sách Máy Có Sẵn (Sắp xếp A-Z: {totalInStockCount} máy)
            </span>
            <button
              onClick={fetchInventory}
              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Đồng bộ ↻</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-xs text-gray-400">
              Đang tải danh sách kho máy...
            </div>
          ) : groupedProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
              <Smartphone className="w-10 h-10 text-gray-300 mx-auto" />
              <div className="text-xs font-bold text-gray-700">Không tìm thấy máy nào phù hợp</div>
              <div className="text-[11px] text-gray-400">
                {searchTerm ? `Không có máy nào khớp với từ khóa "${searchTerm}".` : 'Kho hiện đang trống.'}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
              {groupedProducts.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Product Header */}
                  <div className="px-4 py-3 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-gray-950 text-white rounded-xl shadow-xs">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-gray-950 tracking-tight">
                        {group.product_name}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[10px] font-bold rounded uppercase">
                        {group.category}
                      </span>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-full border border-emerald-200">
                        {group.items.length} máy
                      </span>
                    </div>
                  </div>

                  {/* Child IMEIs List */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white">
                    {group.items.map((item) => {
                      const inCart = cart.some((c) => c.inventory.id === item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => !inCart && addToCart(item)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            inCart
                              ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 shadow-sm'
                              : 'border-gray-200 hover:border-gray-950 hover:bg-gray-50/80 hover:shadow-md'
                          }`}
                        >
                          <div className="space-y-1.5">
                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-1">
                              {item.color && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-900 rounded text-[11px] font-bold">
                                  {item.color}
                                </span>
                              )}
                              {item.storage && (
                                <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-[10px] font-bold font-mono">
                                  {item.storage}
                                </span>
                              )}
                              {item.battery_health && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                  🔋 {item.battery_health}%
                                </span>
                              )}
                              {item.condition && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                                  {item.condition}
                                </span>
                              )}
                            </div>

                            {/* IMEI Number */}
                            <div className="text-[11px] font-mono font-bold text-gray-700">
                              IMEI: <span className="text-gray-950 font-black">{item.imei}</span>
                            </div>
                          </div>

                          {/* Price & Add Action */}
                          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                            <div className="text-sm font-black text-gray-950 font-mono">
                              {formatVND(item.selling_price)}
                            </div>

                            <button
                              type="button"
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                                inCart
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-gray-950 hover:bg-black text-white'
                              }`}
                            >
                              {inCart ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                  <span>Đã chọn</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 text-emerald-400" />
                                  <span>Chọn máy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: CỐ ĐỊNH VÀ HIỂN THỊ RÕ RÀNG MỤC THANH TOÁN (5 COLS - STICKY) */}
        <div className="lg:col-span-5 sticky top-4 z-30 space-y-4">
          <div className="bg-white rounded-3xl border-2 border-gray-950 shadow-xl p-4 sm:p-5 space-y-4">
            
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gray-950 text-white rounded-xl">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-950 uppercase tracking-wide">
                    Giỏ Hàng & Thanh Toán
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold">
                    {cart.length > 0 ? `Đã chọn ${cart.length} máy bán lẻ` : 'Chưa có máy nào trong giỏ'}
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[11px] text-red-500 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded-lg"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-4 space-y-1.5">
                <Smartphone className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-xs font-black text-gray-800">Chưa chọn sản phẩm thanh toán</p>
                <p className="text-[11px] text-gray-400">
                  Bấm &ldquo;Chọn máy&rdquo; hoặc Quét Barcode/QR để thêm vào giỏ.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start justify-between text-xs"
                  >
                    <div className="flex-1 pr-2 space-y-1">
                      <div className="font-black text-gray-950 text-xs sm:text-sm">
                        {item.inventory.product_name}
                      </div>
                      <div className="text-[11px] font-mono text-gray-700 font-bold">
                        IMEI: {item.inventory.imei} {item.inventory.color ? `• ${item.inventory.color}` : ''}
                      </div>
                      {/* Warranty Selector */}
                      <div className="flex items-center space-x-1.5 text-[11px] text-gray-600 pt-0.5">
                        <span>Bảo hành:</span>
                        <select
                          value={item.warranty_months}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCart((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, warranty_months: val } : c))
                            );
                          }}
                          className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-800"
                        >
                          <option value={1}>1 Tháng</option>
                          <option value={3}>3 Tháng</option>
                          <option value={6}>6 Tháng</option>
                          <option value={12}>12 Tháng</option>
                          <option value={24}>24 Tháng</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-between items-end">
                      <div className="font-black text-gray-950 font-mono text-sm">
                        {formatVND(item.price)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.inventory.id)}
                        className="text-gray-400 hover:text-red-600 p-1 mt-2 inline-block rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Price Summary */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Số lượng sản phẩm:</span>
                <span className="font-bold text-gray-950 font-mono">{cart.length} máy</span>
              </div>

              <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
                <span>TỔNG TIỀN THANH TOÁN:</span>
                <span className="font-mono text-lg text-emerald-700">{formatVND(totalCartAmount)}</span>
              </div>
            </div>

            {/* REQUIREMENT 2: NÚT THANH TOÁN CỐ ĐỊNH & LUÔN NỔI BẬT KHẢ DỤNG */}
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className={`w-full py-4 rounded-2xl text-sm font-black shadow-xl flex items-center justify-center space-x-2 transition active:scale-[0.99] ${
                cart.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400 animate-pulse'
                  : 'bg-gray-950 hover:bg-black text-white shadow-gray-900/30'
              }`}
            >
              <PaymentIcon className="w-4 h-4 text-emerald-300" />
              <span>
                {cart.length > 0
                  ? `TIẾN HÀNH THANH TOÁN (${cart.length} MÁY)`
                  : 'TIẾN HÀNH THANH TOÁN (MỞ ĐƠN HÀNG)'}
              </span>
              <ArrowRight className="w-4 h-4 text-emerald-300" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM CHECKOUT BAR (ALWAYS VISIBLE & PROMINENT) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-gray-950/98 backdrop-blur-xl border-t border-gray-800 text-white px-4 py-3 shadow-2xl flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center space-x-1">
            <span>Giỏ hàng:</span>
            <b className="text-white">{cart.length} máy</b>
          </div>
          <div className="text-sm font-black text-emerald-400 font-mono">
            {formatVND(totalCartAmount)}
          </div>
        </div>

        <button
          type="button"
          onClick={handleProceedToCheckout}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs rounded-xl shadow-lg flex items-center space-x-2 active:scale-95 transition"
        >
          <span>Thanh Toán ({cart.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Customer Modal (Search / Create) */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-gray-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black uppercase">
                  {isCreatingNewCust ? 'Thêm Khách Hàng Mới' : 'Tìm / Chọn Khách Hàng'}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
              {!isCreatingNewCust ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Gõ tên hoặc số điện thoại khách..."
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-xs text-gray-950"
                      autoFocus
                    />
                  </div>

                  {searchingCustomer ? (
                    <div className="text-center py-6 text-gray-400">Đang tìm...</div>
                  ) : customersList.length > 0 ? (
                    <div className="space-y-1.5">
                      {customersList.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsCustomerModalOpen(false);
                          }}
                          className="p-3 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 border border-gray-200 rounded-xl cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <div className="font-black text-gray-950">{c.name}</div>
                            <div className="text-gray-500 font-mono text-[11px]">{c.phone}</div>
                          </div>
                          {c.debt !== 0 && (
                            <span className="text-[10px] font-bold text-red-600">
                              Nợ: {formatVND(c.debt)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4">
                      <p className="text-xs text-gray-500 font-medium">
                        {customerQuery.trim()
                          ? `Không tìm thấy khách hàng "${customerQuery}".`
                          : 'Nhập SĐT hoặc Tên khách để tìm kiếm.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingNewCust(true);
                          setNewCustPhone(customerQuery);
                        }}
                        className="px-4 py-2 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 mx-auto shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+ Thêm khách hàng mới</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="VD: 0912345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="VD: Anh Nam, Chị Linh..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">Địa chỉ</label>
                    <input
                      type="text"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      placeholder="VD: Quận 1, TP.HCM"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">CCCD (Lưu bảo hành)</label>
                    <input
                      type="text"
                      value={newCustCccd}
                      onChange={(e) => setNewCustCccd(e.target.value)}
                      placeholder="VD: 079..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCust(false)}
                      className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700"
                    >
                      Quay lại tìm
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewCustomer}
                      className="flex-1 py-2.5 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow"
                    >
                      Chọn Khách Này
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Step Checkout Modal */}
      <POSCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        onCompleteOrder={handleCompleteOrder}
        submitting={submitting}
        initialCustomer={selectedCustomer}
      />

      {/* Barcode / QR Scanner (With De-duplication & Debounce) */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        existingImeis={cart.map((c) => c.inventory.imei)}
        title="Quét Barcode / QR IMEI Bán Hàng"
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        order={completedOrder}
      />
    </div>
  );
}
