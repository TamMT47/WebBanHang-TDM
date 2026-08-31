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

  // Customer Management on POS
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
      setLoading(true);
      const cached = getCachedInventory();
      if (cached && cached.length > 0) {
        const inStock = cached.filter((i) => i.status === 'in_stock');
        setInventory(sortItemsAZ(inStock, (item) => item.product_name || ''));
        setLoading(false);
      }

      const res = await fetch('/api/inventory?status=in_stock');
      const data = await res.json();
      const raw = data.inventory || [];
      const sorted = sortItemsAZ(raw, (item: InventoryItem) => item.product_name || '');
      setInventory(sorted);
      setCachedInventory(sorted);
    } catch (err) {
      console.error('POS fetch inventory error:', err);
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

  // Debounced customer query search
  useEffect(() => {
    if (!isCustomerModalOpen || isCreatingNewCust) return;
    const timer = setTimeout(async () => {
      try {
        setSearchingCustomer(true);
        const res = await fetch(`/api/partners?search=${encodeURIComponent(customerQuery.trim())}&type=customer`);
        const data = await res.json();
        setCustomersList(data.partners || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerQuery, isCustomerModalOpen, isCreatingNewCust]);

  // Add Item to Cart (Single Unique IMEI)
  const addToCart = (item: InventoryItem) => {
    if (cart.some((c) => c.inventory.id === item.id)) {
      setMessage({
        type: 'error',
        text: `Mã máy IMEI ${item.imei} đã có trong giỏ hàng!`,
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
      text: `Đã thêm ${item.product_name} (${item.imei}) vào giỏ hàng!`,
    });
  };

  const removeFromCart = (inventoryId: string) => {
    setCart((prev) => prev.filter((c) => c.inventory.id !== inventoryId));
  };

  // Barcode / QR Scanner handler
  const handleScanSuccess = (scannedImei: string) => {
    const clean = scannedImei.trim();
    if (!clean) return;

    if (cart.some((c) => c.inventory.imei.toLowerCase() === clean.toLowerCase())) {
      setMessage({
        type: 'error',
        text: `Mã IMEI ${clean} đã có trong giỏ hàng!`,
      });
      return;
    }

    const matched = inventory.find((i) => i.imei.toLowerCase() === clean.toLowerCase());
    if (matched) {
      addToCart(matched);
      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      } catch (e) {}
    } else {
      setMessage({
        type: 'error',
        text: `Không tìm thấy máy có IMEI "${clean}" trong kho còn hàng!`,
      });
    }
  };

  // Reset POS state
  const resetAllPOSState = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSearchTerm('');
    setMessage(null);
  };

  // Open multi-step checkout modal
  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      setMessage({
        type: 'error',
        text: 'Vui lòng chọn ít nhất 1 sản phẩm vào giỏ hàng để thanh toán!',
      });
      return;
    }
    setIsCheckoutOpen(true);
  };

  // Complete Order
  const handleCompleteOrder = async (payload: any) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra khi tạo đơn hàng');

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Open Print Invoice Modal
      setCompletedOrder({
        code: data.code || 'HD000000',
        created_at: new Date().toISOString(),
        customer: payload.customer,
        seller_name: user?.full_name || 'Nhân viên TD Mobile',
        total_amount: cart.reduce((s, i) => s + i.price, 0),
        discount: payload.discount || 0,
        trade_in_value: payload.trade_in?.trade_in_value || 0,
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
    { id: 'AppleWatch', label: 'Apple Watch' },
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
      
      {/* 1. TOP BAR: Instant Search, Fast Scan, Customer Finder */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800/80 shadow-2xl shadow-black/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gõ tìm tức thì (VD: 11, 13 Pro Max) hoặc quét 15 số IMEI..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:bg-slate-950 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:outline-none transition shadow-inner"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
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
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl text-xs font-black shadow-glow-cyan transition active:scale-95 badge-nowrap"
            >
              <Camera className="w-4 h-4 text-cyan-200" />
              <span>Quét Barcode/QR</span>
            </button>

            {/* Quick Customer Search Button */}
            <button
              onClick={() => {
                setIsCustomerModalOpen(true);
                setCustomerQuery('');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition badge-nowrap ${
                selectedCustomer
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-glow-emerald'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>{selectedCustomer ? selectedCustomer.name : 'Khách Hàng'}</span>
            </button>
          </div>
        </div>

        {/* Selected Customer Card with Change & Clear */}
        {selectedCustomer && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between animate-in fade-in text-xs shadow-inner">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-xs">
                <User className="w-4 h-4 font-black" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-white text-sm">{selectedCustomer.name}</span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 badge-nowrap">
                    Khách Hàng Đã Chọn
                  </span>
                </div>
                <div className="text-slate-400 font-mono font-bold text-[11px]">
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
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-bold text-[11px] transition badge-nowrap"
              >
                Đổi khách
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl font-bold text-[11px] transition badge-nowrap"
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition badge-nowrap ${
                selectedCategory === c.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
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
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border shadow-sm animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-bold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN GRID: PRODUCTS CATALOG & CART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT: Products Catalog Grouped & A-Z Sorted (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Danh Sách Máy Có Sẵn (Sắp xếp A-Z: {totalInStockCount} máy)
            </span>
            <button
              onClick={fetchInventory}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Đồng bộ ↻</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-400 animate-pulse">
              Đang tải danh sách kho máy...
            </div>
          ) : groupedProducts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800 p-6 space-y-2">
              <Smartphone className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-xs font-bold text-slate-300">Không tìm thấy máy nào phù hợp</div>
              <div className="text-[11px] text-slate-500">
                {searchTerm ? `Không có máy nào khớp với từ khóa "${searchTerm}".` : 'Kho hiện đang trống.'}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
              {groupedProducts.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="bg-slate-900/75 backdrop-blur-lg rounded-3xl border border-slate-800/80 shadow-xl overflow-hidden"
                >
                  {/* Product Header */}
                  <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
                        {group.product_name}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg uppercase border border-slate-700 badge-nowrap">
                        {group.category}
                      </span>
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] rounded-full border border-emerald-500/30 badge-nowrap">
                        {group.items.length} máy
                      </span>
                    </div>
                  </div>

                  {/* Child IMEIs List */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-900/40">
                    {group.items.map((item) => {
                      const inCart = cart.some((c) => c.inventory.id === item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => !inCart && addToCart(item)}
                          className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            inCart
                              ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500 shadow-glow-cyan'
                              : 'border-slate-800 bg-slate-850/60 hover:border-slate-700 hover:bg-slate-800/80 hover:shadow-lg'
                          }`}
                        >
                          <div className="space-y-1.5">
                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-1">
                              {item.color && (
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded-md text-[11px] font-bold border border-slate-700 badge-nowrap">
                                  {item.color}
                                </span>
                              )}
                              {item.storage && (
                                <span className="px-2 py-0.5 bg-slate-950 text-cyan-300 rounded-md text-[10px] font-bold font-mono border border-cyan-500/30 badge-nowrap">
                                  {item.storage}
                                </span>
                              )}
                              {item.battery_health && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-md text-[10px] font-bold border border-emerald-500/30 badge-nowrap">
                                  🔋 {item.battery_health}%
                                </span>
                              )}
                              {item.condition && (
                                <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 rounded-md text-[10px] font-bold border border-amber-500/30 badge-nowrap">
                                  {item.condition}
                                </span>
                              )}
                            </div>

                            {/* IMEI Number */}
                            <div className="text-[11px] font-mono font-bold text-slate-400">
                              IMEI: <span className="text-white font-black">{item.imei}</span>
                            </div>
                          </div>

                          {/* Price & Add Action */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                            <div className="text-sm font-black text-cyan-300 font-mono badge-nowrap">
                              {formatVND(item.selling_price)}
                            </div>

                            <button
                              type="button"
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 badge-nowrap ${
                                inCart
                                  ? 'bg-cyan-500 text-slate-950 font-black shadow-glow-cyan'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              {inCart ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                                  <span>Đã chọn</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
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

        {/* RIGHT: CART SECTION (STICKY) */}
        <div className="lg:col-span-5 sticky top-20 z-30 space-y-4">
          <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-800 shadow-2xl p-4 sm:p-5 space-y-4">
            
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Giỏ Hàng & Thanh Toán
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {cart.length > 0 ? `Đã chọn ${cart.length} máy bán lẻ` : 'Chưa có máy nào trong giỏ'}
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl transition badge-nowrap"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 p-4 space-y-1.5">
                <Smartphone className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-black text-slate-300">Chưa chọn sản phẩm thanh toán</p>
                <p className="text-[11px] text-slate-500">
                  Bấm &ldquo;Chọn máy&rdquo; hoặc Quét Barcode/QR để thêm vào giỏ.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-start justify-between text-xs"
                  >
                    <div className="flex-1 pr-2 space-y-1">
                      <div className="font-black text-white text-xs sm:text-sm">
                        {item.inventory.product_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 font-bold">
                        IMEI: <span className="text-slate-200">{item.inventory.imei}</span> {item.inventory.color ? `• ${item.inventory.color}` : ''}
                      </div>
                      {/* Warranty Selector */}
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 pt-0.5">
                        <span>Bảo hành:</span>
                        <select
                          value={item.warranty_months}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCart((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, warranty_months: val } : c))
                            );
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-200 focus:outline-none"
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
                      <div className="font-black text-cyan-300 font-mono text-sm badge-nowrap">
                        {formatVND(item.price)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.inventory.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 mt-2 inline-block rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Price Summary */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Số lượng sản phẩm:</span>
                <span className="font-bold text-white font-mono">{cart.length} máy</span>
              </div>

              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>TỔNG TIỀN THANH TOÁN:</span>
                <span className="font-mono text-lg text-cyan-400 badge-nowrap">{formatVND(totalCartAmount)}</span>
              </div>
            </div>

            {/* PROMINENT CHECKOUT BUTTON */}
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className={`w-full py-4 rounded-2xl text-sm font-black shadow-xl flex items-center justify-center space-x-2 transition active:scale-[0.99] ${
                cart.length > 0
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-glow-cyan ring-2 ring-cyan-400 font-extrabold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
              }`}
            >
              <PaymentIcon className="w-4 h-4 text-slate-950" />
              <span>
                {cart.length > 0
                  ? `TIẾN HÀNH THANH TOÁN (${cart.length} MÁY)`
                  : 'TIẾN HÀNH THANH TOÁN (MỞ ĐƠN HÀNG)'}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM CHECKOUT BAR */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 text-white px-4 py-3 shadow-2xl flex items-center justify-between">
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
            <span>Giỏ hàng:</span>
            <b className="text-white">{cart.length} máy</b>
          </div>
          <div className="text-sm font-black text-cyan-400 font-mono badge-nowrap">
            {formatVND(totalCartAmount)}
          </div>
        </div>

        <button
          type="button"
          onClick={handleProceedToCheckout}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-glow-cyan flex items-center space-x-2 active:scale-95 transition"
        >
          <span>Thanh Toán ({cart.length})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Customer Modal (Search / Create) */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black uppercase">
                  {isCreatingNewCust ? 'Thêm Khách Hàng Mới' : 'Tìm / Chọn Khách Hàng'}
                </h3>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
              {!isCreatingNewCust ? (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Gõ tên hoặc số điện thoại khách..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-xs text-white focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>

                  {searchingCustomer ? (
                    <div className="text-center py-6 text-slate-400">Đang tìm...</div>
                  ) : customersList.length > 0 ? (
                    <div className="space-y-1.5">
                      {customersList.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsCustomerModalOpen(false);
                          }}
                          className="p-3 bg-slate-850 hover:bg-slate-800 hover:border-cyan-500/40 border border-slate-700/60 rounded-xl cursor-pointer transition flex items-center justify-between"
                        >
                          <div>
                            <div className="font-black text-white">{c.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{c.phone}</div>
                          </div>
                          {c.debt !== 0 && (
                            <span className="text-[10px] font-bold text-rose-400 badge-nowrap">
                              Nợ: {formatVND(c.debt)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-3 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 p-4">
                      <p className="text-xs text-slate-400 font-medium">
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
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 mx-auto shadow-glow-cyan"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Thêm khách hàng mới</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="VD: 0912345678"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="VD: Anh Nam, Chị Linh..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Địa chỉ</label>
                    <input
                      type="text"
                      value={newCustAddress}
                      onChange={(e) => setNewCustAddress(e.target.value)}
                      placeholder="VD: Quận 1, TP.HCM"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">CCCD (Lưu bảo hành)</label>
                    <input
                      type="text"
                      value={newCustCccd}
                      onChange={(e) => setNewCustCccd(e.target.value)}
                      placeholder="VD: 079..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCust(false)}
                      className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Quay lại tìm
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewCustomer}
                      className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan"
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

      {/* Barcode / QR Scanner */}
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
