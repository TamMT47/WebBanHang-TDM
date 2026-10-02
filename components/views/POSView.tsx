'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Camera,
  Plus,
  Minus,
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
  CreditCard as PaymentIcon,
  Wrench,
  Gift,
  DollarSign,
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatVND } from '@/lib/format';
import { strictProductMatch, sortItemsAZ, formatProductTitle, DEFAULT_MASTER_SERVICES, MasterServiceItem } from '@/lib/masterAttributes';
import {
  getCachedInventory,
  setCachedInventory,
  invalidateInventoryCache,
  subscribeToCacheInvalidation
} from '@/lib/cache';
import { InventoryItem, POSCartItem } from '@/types/database';
import ScannerModal from '@/components/ScannerModal';
import InvoiceModal from '@/components/InvoiceModal';
import POSCheckoutModal from '@/components/POSCheckoutModal';
import ServiceDetailsModal from '@/components/ServiceDetailsModal';
import AccessoryDetailsModal from '@/components/AccessoryDetailsModal';
import MoneyInput from '@/components/ui/MoneyInput';

interface POSViewProps {
  user: any;
}

export default function POSView({ user }: POSViewProps) {
  // Products & Inventory in stock
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Cart State using POSCartItem
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Cart Drawer Popup State
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Service & Accessory Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<MasterServiceItem | null>(null);
  const [isAccessoryModalOpen, setIsAccessoryModalOpen] = useState(false);
  const [initialAccessoryName, setInitialAccessoryName] = useState('');
  const [initialAccessoryPrice, setInitialAccessoryPrice] = useState(250000);

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
      const inStock = (data.inventory || []).filter((i: any) => i.status === 'in_stock');
      setCachedInventory(data.inventory || []);
      setInventory(sortItemsAZ(inStock, (item) => item.product_name || ''));
    } catch (err) {
      console.error(err);
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

  // Add Item to Cart (Single Unique IMEI Phone)
  const addToCart = (item: InventoryItem) => {
    if (cart.some((c) => c.inventory_id === item.id)) {
      setMessage({
        type: 'error',
        text: `Mã máy IMEI ${item.imei} đã có trong giỏ hàng!`,
      });
      return;
    }

    const cartItem: POSCartItem = {
      cart_id: `inv_${item.id}`,
      item_type: 'phone',
      inventory_id: item.id,
      product_id: item.product_id || null,
      product_name: item.product_name || 'Điện thoại',
      category: item.category || 'iPhone',
      condition: item.condition || '99%',
      color: item.color || '',
      storage: item.storage || '',
      imei: item.imei,
      price: parseFloat(item.selling_price as any) || 0,
      original_price: parseFloat(item.selling_price as any) || 0,
      quantity: 1,
      warranty_months: 12,
      battery_health: item.battery_health,
      is_gift: false,
    };

    setCart((prev) => [...prev, cartItem]);

    setMessage({
      type: 'success',
      text: `Đã thêm ${item.product_name} (${item.imei}) vào giỏ hàng!`,
    });
  };

  // Add custom cart item (Service or Accessory)
  const handleAddCustomCartItem = (customItem: POSCartItem) => {
    setCart((prev) => [...prev, customItem]);
    setMessage({
      type: 'success',
      text: `Đã thêm "${customItem.product_name}" vào giỏ hàng!`,
    });
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cart_id !== cartId));
  };

  const updateCartItemQuantity = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartId);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.cart_id === cartId ? { ...c, quantity: newQty } : c))
    );
  };

  const updateCartItemPrice = (cartId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.cart_id === cartId
          ? {
              ...c,
              price: newPrice,
              is_gift: newPrice === 0 ? true : c.is_gift,
            }
          : c
      )
    );
  };

  const updateCartItemWarranty = (cartId: string, warrantyMonths: number) => {
    setCart((prev) =>
      prev.map((c) => (c.cart_id === cartId ? { ...c, warranty_months: warrantyMonths } : c))
    );
  };

  const toggleCartItemGift = (cartId: string) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.cart_id === cartId) {
          const nextGift = !c.is_gift;
          return {
            ...c,
            is_gift: nextGift,
            price: nextGift ? 0 : c.original_price || c.price || 0,
          };
        }
        return c;
      })
    );
  };

  // Barcode / QR Scanner handler
  const handleScanSuccess = (scannedImei: string) => {
    const clean = scannedImei.trim();
    if (!clean) return;

    if (cart.some((c) => c.imei?.toLowerCase() === clean.toLowerCase())) {
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
        text: 'Vui lòng chọn ít nhất 1 sản phẩm hoặc dịch vụ vào giỏ hàng để thanh toán!',
      });
      return;
    }
    setIsCartDrawerOpen(false);
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
        partner_name: payload.partner_name,
        partner_phone: payload.partner_phone,
        partner_address: payload.partner_address,
        partner_cccd: payload.partner_cccd,
        creator_name: user?.full_name || 'TD Mobile Store',
        total_amount: payload.total_amount,
        discount: payload.discount,
        trade_in_value: payload.trade_in_value,
        final_payment: payload.final_payment,
        paid_amount: payload.paid_amount,
        debt_added: payload.debt_added,
        payment_method: payload.payment_method,
        overpaid_action: payload.overpaid_action,
        items: payload.items.map((i: any) => ({
          product_name: i.product_name,
          imei: i.imei,
          price: i.price,
          quantity: i.quantity || 1,
          item_type: i.item_type,
          is_gift: i.is_gift,
          warranty_months: i.warranty_months,
          color: i.color,
          storage: i.storage,
          condition: i.condition,
          battery_health: i.battery_health,
          note: i.note,
        })),
        trade_in_item: payload.trade_in_item || null,
      });

      setIsCheckoutOpen(false);
      setIsInvoiceOpen(true);
      resetAllPOSState();
      invalidateInventoryCache();
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Create & Select new customer inline
  const handleSaveNewCustomer = () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Vui lòng nhập tên và số điện thoại khách');
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
    { id: 'PhuKien', label: 'Phụ Kiện' },
    { id: 'DichVu', label: 'Dịch Vụ Sửa Chữa ⚡' },
  ];

  // Group inventory items by product name
  const groupedProducts = useMemo(() => {
    if (selectedCategory === 'DichVu') {
      return [];
    }

    const groups: Record<
      string,
      {
        product_name: string;
        category: string;
        items: InventoryItem[];
      }
    > = {};

    inventory.forEach((item) => {
      const matchCat =
        selectedCategory === 'all' ||
        item.category === selectedCategory ||
        (selectedCategory === 'PhuKien' && item.category === 'PhuKien');

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

  // Filtered Services when searching or in DichVu category
  const filteredServices = useMemo(() => {
    if (selectedCategory === 'DichVu') {
      if (!searchTerm.trim()) return DEFAULT_MASTER_SERVICES;
      const q = searchTerm.toLowerCase().trim();
      return DEFAULT_MASTER_SERVICES.filter(
        (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    }

    // Check if user is searching for service keywords
    const isSearchingService =
      searchTerm.trim().length >= 2 &&
      ['pin', 'màn', 'kính', 'sửa', 'thay', 'camera', 'loa', 'dịch vụ', 'cứu', 'vệ sinh', 'chữa'].some(
        (kw) => searchTerm.toLowerCase().includes(kw)
      );

    if (isSearchingService) {
      const q = searchTerm.toLowerCase().trim();
      return DEFAULT_MASTER_SERVICES.filter((s) => s.name.toLowerCase().includes(q));
    }

    return [];
  }, [selectedCategory, searchTerm]);

  const totalInStockCount = groupedProducts.reduce((sum, g) => sum + g.items.length, 0);
  const totalCartItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  return (
    <div className="space-y-4 pb-24 sm:pb-8">
      {/* 1. TOP BAR: Instant Search, Fast Scan, Customer Finder, Add Services & Accessories */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800/80 shadow-2xl shadow-black/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gõ tìm máy, phụ kiện hoặc dịch vụ sửa chữa (VD: 13 Pro Max, Thay pin, Củ sạc, IMEI)..."
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

          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-2">
            {/* Quick Add Service Button */}
            <button
              onClick={() => {
                setSelectedServiceForModal(null);
                setIsServiceModalOpen(true);
              }}
              title="Thêm dịch vụ sửa chữa, thay pin, thay màn hình"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-2xl text-xs font-black shadow-glow-amber transition active:scale-95 badge-nowrap"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-950 font-black" />
              <span>+ Bán Dịch Vụ Sửa</span>
            </button>

            {/* Quick Add Accessory Button */}
            <button
              onClick={() => {
                setInitialAccessoryName('');
                setInitialAccessoryPrice(250000);
                setIsAccessoryModalOpen(true);
              }}
              title="Thêm phụ kiện bán kèm hoặc quà tặng 0đ không cần IMEI"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-2xl text-xs font-black shadow-glow-cyan transition active:scale-95 badge-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-slate-950 font-black" />
              <span>+ Phụ Kiện Nhanh</span>
            </button>

            {/* Fast Barcode/QR Camera Scan Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              title="Bật Camera Quét Barcode/QR IMEI Siêu Nhạy"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black border border-slate-700 transition active:scale-95 badge-nowrap"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Quét IMEI</span>
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

        {/* Selected Customer Card */}
        {selectedCustomer && (
          <div className="p-2.5 sm:p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between animate-in fade-in text-xs shadow-inner gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-xs flex-shrink-0">
                <User className="w-3.5 h-3.5 font-black" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="font-black text-white text-xs sm:text-sm truncate max-w-[160px]">
                    {selectedCustomer.name}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded-full border border-emerald-500/30 badge-nowrap">
                    Đã Chọn
                  </span>
                </div>
                <div className="text-slate-400 font-bold text-[11px] truncate">
                  SĐT: {selectedCustomer.phone}{' '}
                  {selectedCustomer.address ? `• ${selectedCustomer.address}` : ''}
                </div>
              </div>
            </div>

            {/* Stacked Actions */}
            <div className="flex flex-col space-y-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCustomerModalOpen(true);
                  setCustomerQuery('');
                }}
                className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 rounded-lg font-bold text-[10px] transition badge-nowrap text-center"
              >
                Đổi khách
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-2.5 py-0.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 rounded-lg font-bold text-[10px] transition badge-nowrap text-center"
              >
                Xóa
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition duration-200 badge-nowrap ${
                selectedCategory === c.id
                  ? c.id === 'DichVu'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-glow-amber'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Notification Message */}
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
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span className="font-bold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN GRID: PRODUCTS CATALOG & CART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Products Catalog & Services List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Dịch Vụ Sửa Chữa Matches / Dedicated View */}
          {filteredServices.length > 0 && (
            <div className="bg-slate-900/80 backdrop-blur-lg rounded-3xl border border-amber-500/30 shadow-xl overflow-hidden p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                      Danh Mục Dịch Vụ Sửa Chữa & Thay Thế
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Bấm vào dịch vụ để nhập IMEI khách, dòng máy & giá tiền
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceForModal(null);
                    setIsServiceModalOpen(true);
                  }}
                  className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-black transition badge-nowrap"
                >
                  + Tùy Chỉnh Khác
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredServices.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setSelectedServiceForModal(srv);
                      setIsServiceModalOpen(true);
                    }}
                    className="p-3 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl cursor-pointer transition flex items-center justify-between group shadow-sm"
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <div className="font-black text-white text-xs group-hover:text-amber-300 transition">
                        {srv.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        BH: {srv.defaultWarrantyMonths}T • Danh mục: {srv.category}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-sans font-black text-amber-400 text-xs">
                        {formatVND(srv.defaultPrice)}
                      </div>
                      <span className="text-[10px] text-amber-300/80 font-bold flex items-center justify-end space-x-0.5 mt-0.5">
                        <Plus className="w-3 h-3" />
                        <span>Chọn</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Phone Inventory Catalog */}
          {selectedCategory !== 'DichVu' && (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Danh Sách Máy Trong Kho ({totalInStockCount} máy có sẵn)
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
                    {searchTerm
                      ? `Không có máy nào khớp với từ khóa "${searchTerm}".`
                      : 'Kho hiện đang trống hoặc đang chọn danh mục khác.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
                  {groupedProducts.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="bg-slate-900/75 backdrop-blur-lg rounded-3xl border border-slate-800/80 shadow-xl overflow-hidden"
                    >
                      {/* Header: Model & Category */}
                      <div className="p-3.5 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-cyan-400 shadow-sm">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
                            {group.product_name}
                          </h4>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg uppercase border border-slate-700 badge-nowrap">
                            {group.category}
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] rounded-full border border-emerald-500/40 badge-nowrap">
                            {group.items.length} máy
                          </span>
                        </div>
                      </div>

                      {/* Child IMEIs List */}
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950">
                        {group.items.map((item) => {
                          const inCart = cart.some((c) => c.inventory_id === item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => !inCart && addToCart(item)}
                              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                inCart
                                  ? 'border-cyan-400 bg-cyan-950/70 ring-2 ring-cyan-400 shadow-glow-cyan'
                                  : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-850 hover:shadow-xl'
                              }`}
                            >
                              <div className="space-y-2">
                                {/* Badges Row */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {item.color && (
                                    <span className="px-2.5 py-0.5 bg-slate-800 text-white rounded-lg text-[11px] font-black border border-slate-700 badge-nowrap">
                                      {item.color}
                                    </span>
                                  )}
                                  {item.storage && (
                                    <span className="px-2.5 py-0.5 bg-slate-800 text-white rounded-lg text-[11px] font-black border border-slate-700 badge-nowrap">
                                      {item.storage}
                                    </span>
                                  )}
                                  {item.battery_health && (
                                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-[11px] font-black border border-emerald-500/40 badge-nowrap">
                                      🔋 {item.battery_health}%
                                    </span>
                                  )}
                                  {item.condition && (
                                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-lg text-[11px] font-black border border-amber-500/40 badge-nowrap">
                                      {item.condition}
                                    </span>
                                  )}
                                </div>

                                {/* IMEI Number */}
                                <div className="text-xs font-mono font-bold text-slate-300">
                                  IMEI: <span className="text-white font-black tracking-wider">{item.imei}</span>
                                </div>
                              </div>

                              {/* Price & Add Action */}
                              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                                <div className="text-base font-black text-white font-sans tracking-tight badge-nowrap">
                                  {formatVND(item.selling_price)}
                                </div>

                                <button
                                  type="button"
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center space-x-1.5 badge-nowrap active:scale-95 ${
                                    inCart
                                      ? 'bg-cyan-400 text-slate-950 font-black shadow-glow-cyan'
                                      : 'bg-white hover:bg-slate-100 text-slate-950 shadow-md font-black'
                                  }`}
                                >
                                  {inCart ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                                      <span>Đã chọn</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-4 h-4 text-slate-950" />
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
            </>
          )}
        </div>

        {/* RIGHT: CART SECTION (DESKTOP STICKY) */}
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
                    {cart.length > 0 ? `Tổng cộng ${totalCartItemCount} món trong giỏ` : 'Chưa có sản phẩm nào'}
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
                  Chọn máy, bán phụ kiện hoặc thêm dịch vụ sửa chữa để thanh toán.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.cart_id}
                    className={`p-3 rounded-2xl border flex flex-col space-y-2 text-xs transition ${
                      item.item_type === 'service'
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : item.item_type === 'accessory'
                        ? 'bg-teal-950/20 border-teal-500/30'
                        : 'bg-slate-950/80 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2 space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-black text-white text-xs sm:text-sm">
                            {item.product_name}
                          </span>
                          {item.item_type === 'service' && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] border border-amber-500/40">
                              Dịch Vụ
                            </span>
                          )}
                          {item.item_type === 'accessory' && (
                            <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold text-[9px] border border-teal-500/40">
                              Phụ Kiện
                            </span>
                          )}
                          {item.is_gift && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px] border border-rose-500/40">
                              🎁 Tặng 0đ
                            </span>
                          )}
                        </div>

                        {/* Sub details: IMEI, Color, Service Note */}
                        {item.imei && (
                          <div className="text-[11px] font-mono text-slate-400 font-bold">
                            IMEI: <span className="text-cyan-300">{item.imei}</span>{' '}
                            {item.color ? `• ${item.color}` : ''}
                          </div>
                        )}

                        {item.note && (
                          <div className="text-[10px] text-slate-400 italic">{item.note}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cart_id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Controls: Quantity, Price, Warranty */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      {/* Left: Warranty & Quantity */}
                      <div className="flex items-center space-x-2">
                        {item.item_type === 'accessory' && (
                          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.cart_id, (item.quantity || 1) - 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-1.5 font-mono font-bold text-white text-xs">
                              {item.quantity || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.cart_id, (item.quantity || 1) + 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {item.item_type === 'accessory' && (
                          <button
                            type="button"
                            onClick={() => toggleCartItemGift(item.cart_id)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                              item.is_gift
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {item.is_gift ? '🎁 Hàng Tặng' : 'Tặng 0đ'}
                          </button>
                        )}

                        {/* Warranty Selector */}
                        <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                          <Shield className="w-3 h-3 text-cyan-400" />
                          <select
                            value={item.warranty_months}
                            onChange={(e) =>
                              updateCartItemWarranty(item.cart_id, parseInt(e.target.value, 10))
                            }
                            className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-[10px] rounded-lg px-1.5 py-0.5 focus:outline-none"
                          >
                            <option value={0}>0T (Bao test)</option>
                            <option value={1}>1 Tháng</option>
                            <option value={3}>3 Tháng</option>
                            <option value={6}>6 Tháng</option>
                            <option value={12}>12 Tháng</option>
                            <option value={24}>24 Tháng</option>
                          </select>
                        </div>
                      </div>

                      {/* Right: Total Price */}
                      <div className="text-right">
                        <div className="font-black text-cyan-300 font-sans text-sm tracking-tight badge-nowrap">
                          {formatVND(item.price * (item.quantity || 1))}
                        </div>
                        {item.quantity && item.quantity > 1 && !item.is_gift && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.quantity} x {formatVND(item.price)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Price Summary */}
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tổng số lượng sản phẩm & dịch vụ:</span>
                <span className="font-bold text-white font-sans">{totalCartItemCount} món</span>
              </div>

              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>TỔNG TIỀN THANH TOÁN:</span>
                <span className="font-sans font-black text-lg text-cyan-400 tracking-tight badge-nowrap">
                  {formatVND(totalCartAmount)}
                </span>
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
                  ? `TIẾN HÀNH THANH TOÁN (${totalCartItemCount} MÓN)`
                  : 'TIẾN HÀNH THANH TOÁN (MỞ ĐƠN HÀNG)'}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM CHECKOUT BAR */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 text-white px-4 py-3 shadow-2xl flex items-center justify-between">
        <div
          onClick={() => setIsCartDrawerOpen(true)}
          className="cursor-pointer active:opacity-80 flex-1 pr-2"
        >
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1.5">
            <span>Giỏ hàng:</span>
            <b className="text-white font-bold">{totalCartItemCount} món</b>
            <span className="text-cyan-400 text-[10px] font-bold underline">Xem chi tiết</span>
          </div>
          <div className="text-sm font-black text-cyan-400 font-sans tracking-tight badge-nowrap">
            {formatVND(totalCartAmount)}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Giỏ ({totalCartItemCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={cart.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-glow-cyan flex items-center space-x-1.5 active:scale-95 disabled:opacity-40 transition"
          >
            <span>Thanh Toán</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MOBILE / QUICK POPUP CART DRAWER MODAL */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    Chi Tiết Giỏ Hàng ({totalCartItemCount} món)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Quản lý sản phẩm, phụ kiện, dịch vụ sửa chữa & thanh toán ngay
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Items List */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
              {cart.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 p-4 space-y-2">
                  <Smartphone className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs font-black text-slate-300">Giỏ hàng đang trống</p>
                  <p className="text-[11px] text-slate-500">
                    Hãy chọn máy, bán phụ kiện hoặc thêm dịch vụ để lên đơn.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div
                      key={item.cart_id}
                      className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2 space-y-1">
                          <div className="font-black text-white text-sm">{item.product_name}</div>
                          {item.imei && (
                            <div className="text-[11px] font-mono text-slate-400 font-bold">
                              IMEI: <span className="text-cyan-300">{item.imei}</span>
                            </div>
                          )}
                          {item.note && (
                            <div className="text-[10px] text-slate-400 italic">{item.note}</div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cart_id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          {item.item_type === 'accessory' && (
                            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCartItemQuantity(item.cart_id, (item.quantity || 1) - 1)
                                }
                                className="w-5 h-5 flex items-center justify-center text-slate-300"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-1 font-mono font-bold text-white text-xs">
                                {item.quantity || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCartItemQuantity(item.cart_id, (item.quantity || 1) + 1)
                                }
                                className="w-5 h-5 flex items-center justify-center text-slate-300"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <select
                            value={item.warranty_months}
                            onChange={(e) =>
                              updateCartItemWarranty(item.cart_id, parseInt(e.target.value, 10))
                            }
                            className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-[10px] rounded-lg px-1.5 py-0.5 focus:outline-none"
                          >
                            <option value={0}>0T</option>
                            <option value={1}>1T</option>
                            <option value={3}>3T</option>
                            <option value={6}>6T</option>
                            <option value={12}>12T</option>
                            <option value={24}>24T</option>
                          </select>
                        </div>

                        <div className="font-black text-cyan-300 font-sans text-sm">
                          {formatVND(item.price * (item.quantity || 1))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary & Checkout Action */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Tổng cộng ({totalCartItemCount} món):</span>
                  <span className="text-lg font-black text-cyan-400 font-sans tracking-tight badge-nowrap">
                    {formatVND(totalCartAmount)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="py-3 px-3 bg-slate-850 hover:bg-slate-800 text-rose-300 border border-slate-700 rounded-xl text-xs font-bold transition badge-nowrap"
                  >
                    Xóa tất cả
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-glow-cyan flex items-center justify-center space-x-2 active:scale-95 transition"
                  >
                    <span>Tiến Hành Thanh Toán</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                            <div className="text-slate-400 text-[11px] font-bold">{c.phone}</div>
                          </div>
                          {c.debt !== 0 && (
                            <span className="text-[10px] font-bold text-rose-400 font-sans badge-nowrap">
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      type="tel"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      placeholder="VD: 0912345678"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Họ và tên *
                    </label>
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      CCCD (Lưu bảo hành)
                    </label>
                    <input
                      type="text"
                      value={newCustCccd}
                      onChange={(e) => setNewCustCccd(e.target.value)}
                      placeholder="VD: 079..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
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

      {/* Service Details Modal */}
      {isServiceModalOpen && (
        <ServiceDetailsModal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          onAddToCart={handleAddCustomCartItem}
          initialService={selectedServiceForModal}
          initialDeviceModel={searchTerm || 'iPhone 13 Pro Max'}
        />
      )}

      {/* Accessory Details Modal */}
      {isAccessoryModalOpen && (
        <AccessoryDetailsModal
          isOpen={isAccessoryModalOpen}
          onClose={() => setIsAccessoryModalOpen(false)}
          onAddToCart={handleAddCustomCartItem}
          initialAccessoryName={initialAccessoryName}
          initialPrice={initialAccessoryPrice}
        />
      )}

      {/* Multi-Step Checkout Modal */}
      <POSCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        onCompleteOrder={handleCompleteOrder}
        submitting={submitting}
        initialCustomer={selectedCustomer}
        currentUser={user}
      />

      {/* Barcode / QR Scanner */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        existingImeis={cart.map((c) => c.imei || '').filter(Boolean)}
        title="Quét Barcode / QR IMEI Bán Hàng"
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          resetAllPOSState();
        }}
        order={completedOrder}
      />
    </div>
  );
}
