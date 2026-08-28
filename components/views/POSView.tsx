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
  ChevronUp,
  Layers,
  Phone,
  User,
  MapPin,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatVND, formatNumberDots, parseNumberDots } from '@/lib/format';
import { strictProductMatch } from '@/lib/masterAttributes';
import { InventoryItem, TradeInItemInput, PaymentMethod } from '@/types/database';
import ScannerModal from '@/components/ScannerModal';
import InvoiceModal from '@/components/InvoiceModal';
import TradeInModal from '@/components/TradeInModal';
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

  // Cart State
  const [cart, setCart] = useState<
    Array<{
      inventory: InventoryItem;
      price: number;
      warranty_months: number;
    }>
  >([]);

  // Customer State & Top Search
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCccd, setCustomerCccd] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [existingDebt, setExistingDebt] = useState<number>(0);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [isNewCustomerFormOpen, setIsNewCustomerFormOpen] = useState(false);

  // Trade-in State
  const [tradeInItem, setTradeInItem] = useState<TradeInItemInput | null>(null);
  const [isTradeInOpen, setIsTradeInOpen] = useState(false);

  // Discount & Payment
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customPaidAmount, setCustomPaidAmount] = useState<number | null>(null);
  const [overpaidAction, setOverpaidAction] = useState<'refund' | 'debt'>('refund');
  const [note, setNote] = useState('');

  // Scanner & Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'cart' | 'tradein'>('cart');
  const [scannedTradeInImei, setScannedTradeInImei] = useState('');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ref for scrolling to checkout on mobile
  const checkoutSectionRef = useRef<HTMLDivElement>(null);

  // Load Inventory
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory?status=in_stock');
      const data = await res.json();
      setInventory(data.inventory || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Search Customer by Phone
  useEffect(() => {
    if (customerPhone.trim().length >= 9) {
      searchCustomer(customerPhone.trim());
    } else {
      setCustomerId(null);
      setExistingDebt(0);
      setIsCustomerFound(false);
    }
  }, [customerPhone]);

  const searchCustomer = async (phone: string) => {
    try {
      setCustomerSearching(true);
      const res = await fetch(`/api/partners?search=${encodeURIComponent(phone)}&type=customer`);
      const data = await res.json();
      if (data.partners && data.partners.length > 0) {
        const found = data.partners[0];
        setCustomerId(found.id);
        setCustomerName(found.name);
        setCustomerAddress(found.address || '');
        setCustomerCccd(found.cccd || '');
        setExistingDebt(parseFloat(found.debt) || 0);
        setIsCustomerFound(true);
        setIsNewCustomerFormOpen(false);
      } else {
        setCustomerId(null);
        setExistingDebt(0);
        setIsCustomerFound(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCustomerSearching(false);
    }
  };

  // Add Item to Cart
  const addToCart = (item: InventoryItem) => {
    if (cart.some((c) => c.inventory.id === item.id)) {
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
  };

  const removeFromCart = (inventoryId: string) => {
    setCart((prev) => prev.filter((c) => c.inventory.id !== inventoryId));
  };

  // Handle Barcode/QR Scan
  const handleScanSuccess = (decodedImei: string) => {
    if (scannerMode === 'cart') {
      const match = inventory.find((i) => i.imei.toLowerCase() === decodedImei.toLowerCase());
      if (match) {
        addToCart(match);
        setMessage({ type: 'success', text: `Đã thêm ${match.product_name} (IMEI: ${match.imei}) vào giỏ!` });
      } else {
        setMessage({
          type: 'error',
          text: `Không tìm thấy máy có IMEI "${decodedImei}" còn hàng trong kho!`,
        });
      }
    } else {
      setScannedTradeInImei(decodedImei);
      setIsTradeInOpen(true);
    }
  };

  // Calculations
  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
  const tradeInVal = tradeInItem ? tradeInItem.trade_in_value : 0;
  const finalPayment = Math.max(0, totalAmount - discount - tradeInVal);

  const paidAmount = customPaidAmount === null ? finalPayment : customPaidAmount;

  // Overpaid / Underpaid logic
  const isUnderpaid = paidAmount < finalPayment;
  const isOverpaid = paidAmount > finalPayment;
  const underpaidDifference = Math.max(0, finalPayment - paidAmount);
  const overpaidDifference = Math.max(0, paidAmount - finalPayment);

  const debtAdded = isUnderpaid
    ? underpaidDifference
    : isOverpaid && overpaidAction === 'debt'
    ? -overpaidDifference
    : 0;

  // Submit Order
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ít nhất 1 sản phẩm để bán!' });
      return;
    }
    if (!customerPhone.trim() || !customerName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập Tên và Số điện thoại khách hàng!' });
      setIsNewCustomerFormOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const payload = {
        orderType: 'sell',
        customer: {
          id: customerId || undefined,
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          cccd: customerCccd.trim(),
        },
        items: cart.map((c) => ({
          inventory_id: c.inventory.id,
          price: c.price,
          warranty_months: c.warranty_months,
        })),
        discount,
        trade_in: tradeInItem,
        paid_amount: paidAmount,
        overpaid_action: isOverpaid ? overpaidAction : undefined,
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
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo đơn hàng');
      }

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      // Prepare Completed Order for Invoice Modal
      setCompletedOrder({
        code: data.code,
        created_at: new Date().toISOString(),
        partner_name: customerName,
        partner_phone: customerPhone,
        partner_address: customerAddress,
        partner_cccd: customerCccd,
        creator_name: user?.full_name,
        total_amount: totalAmount,
        discount: discount,
        trade_in_value: tradeInVal,
        final_payment: finalPayment,
        paid_amount: paidAmount,
        debt_added: debtAdded,
        overpaid_action: overpaidAction,
        payment_method: paymentMethod,
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
        trade_in_item: tradeInItem,
      });

      setIsInvoiceOpen(true);

      // Reset Form & Refresh Inventory
      setCart([]);
      setTradeInItem(null);
      setDiscount(0);
      setCustomPaidAmount(null);
      setNote('');
      setCustomerPhone('');
      setCustomerName('');
      setCustomerAddress('');
      setCustomerCccd('');
      setIsCustomerFound(false);
      setIsNewCustomerFormOpen(false);
      fetchInventory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Tất cả máy' },
    { id: 'iPhone', label: 'iPhone' },
    { id: 'iPad', label: 'iPad' },
    { id: 'Macbook', label: 'Macbook' },
    { id: 'Airpods', label: 'Airpods' },
  ];

  // Group inventory items by product name using Strict Search
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

    return Object.values(groups);
  }, [inventory, selectedCategory, searchTerm]);

  const totalInStockCount = groupedProducts.reduce((sum, g) => sum + g.items.length, 0);

  const scrollToCheckout = () => {
    if (checkoutSectionRef.current) {
      checkoutSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      
      {/* Top Banner & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Grouped Product Catalog with High-contrast Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search & Actions Bar Card */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm dòng máy (VD: iPhone 11) hoặc quét 15 số IMEI..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-gray-900 focus:outline-none transition"
                />
              </div>
              <button
                onClick={() => {
                  setScannerMode('cart');
                  setIsScannerOpen(true);
                }}
                title="Bật Camera Quét Barcode/QR IMEI"
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gray-950 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Quét IMEI</span>
              </button>
            </div>

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

          {/* Grouped Products Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                Kho Máy Sẵn Có ({totalInStockCount} máy sẵn sàng bán)
              </span>
              <button
                onClick={fetchInventory}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
              >
                Làm mới ↻
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-xs text-gray-400">
                Đang tải danh sách kho máy...
              </div>
            ) : groupedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
                <Smartphone className="w-10 h-10 text-gray-300 mx-auto" />
                <div className="text-xs font-bold text-gray-700">Không tìm thấy sản phẩm nào phù hợp</div>
                <div className="text-[11px] text-gray-400">
                  {searchTerm ? `Không có máy nào khớp với từ khóa "${searchTerm}".` : 'Kho hiện đang trống.'}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
                {groupedProducts.map((group, gIdx) => (
                  <div
                    key={gIdx}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Line 1: Product Header - BOLD & PROMINENT */}
                    <div className="px-4 py-3 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-gray-950 text-white rounded-xl shadow-xs">
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          {/* Bold, Large, Distinct Color */}
                          <h4 className="text-base sm:text-lg font-black text-gray-950 tracking-tight">
                            {group.product_name}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[10px] font-bold rounded uppercase">
                          {group.category}
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-full border border-emerald-200">
                          {group.items.length} máy sẵn có
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Child IMEIs List with Structured Micro Badges */}
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
                                <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-[11px] font-black font-mono">
                                  {item.storage || '128GB'}
                                </span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-900 rounded text-[11px] font-bold">
                                  {item.color || 'Titan'}
                                </span>
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                                  {item.condition || '99%'}
                                </span>
                                {item.battery_health && (
                                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                    🔋 {item.battery_health}%
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
        </div>

        {/* RIGHT COLUMN: Order Cart & Checkout Drawer (5 cols) */}
        <div className="lg:col-span-5 space-y-4" ref={checkoutSectionRef}>
          <form
            onSubmit={handleCheckout}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4"
          >
            {/* Top Requirement: Customer Search at the very top of POS Form */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 text-gray-700" />
                  <span>1. Khách Hàng Bán Lẻ</span>
                </span>

                {existingDebt !== 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      existingDebt > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {existingDebt > 0 ? `Đang nợ: ${formatVND(existingDebt)}` : 'Đang thừa tiền'}
                  </span>
                )}
              </div>

              {/* Phone Search Input */}
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Nhập SĐT khách (VD: 0912345678)..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold font-mono text-gray-900 focus:ring-2 focus:ring-gray-950 focus:outline-none"
                  required
                />
              </div>

              {/* Existing Customer Identified Card */}
              {isCustomerFound && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-950">{customerName}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      ✓ Khách hàng cũ
                    </span>
                  </div>
                  {customerAddress && (
                    <div className="text-[11px] text-gray-600 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{customerAddress}</span>
                    </div>
                  )}
                  {customerCccd && (
                    <div className="text-[10px] font-mono text-gray-500">
                      CCCD: {customerCccd}
                    </div>
                  )}
                </div>
              )}

              {/* If Not Found and not adding new yet: Show "+ Thêm khách hàng mới" button */}
              {!isCustomerFound && !isNewCustomerFormOpen && customerPhone.trim().length >= 3 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomerFormOpen(true);
                      if (!customerName) setCustomerName('Khách Lẻ');
                    }}
                    className="w-full py-2 bg-white border border-dashed border-gray-400 hover:border-gray-900 hover:bg-gray-100 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>+ Thêm Thông Tin Khách Hàng Mới</span>
                  </button>
                </div>
              )}

              {/* Expanded New Customer Form */}
              {isNewCustomerFormOpen && (
                <div className="space-y-2 pt-1.5 border-t border-gray-200 animate-in fade-in">
                  <div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Họ và tên khách hàng *"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-gray-900 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Địa chỉ (Tùy chọn)"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-[11px] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={customerCccd}
                      onChange={(e) => setCustomerCccd(e.target.value)}
                      placeholder="CCCD lưu bảo hành"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-[11px] font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cart Header & Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-gray-950" />
                  <h3 className="text-xs font-black text-gray-950 uppercase tracking-wide">
                    2. Giỏ Hàng Đã Chọn ({cart.length})
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-7 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-700">Chưa có sản phẩm nào</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Chạm vào mã IMEI bên trái để đưa máy vào hóa đơn.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-start justify-between text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-black text-gray-950">{item.inventory.product_name}</div>
                        <div className="text-[10px] font-mono text-gray-600 font-bold">
                          IMEI: {item.inventory.imei} • {item.inventory.storage} ({item.inventory.color})
                        </div>
                        {/* Warranty Selector */}
                        <div className="mt-1 flex items-center space-x-1 text-[11px] text-gray-600">
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
                      <div className="text-right">
                        <div className="font-black text-gray-950 font-mono">{formatVND(item.price)}</div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.inventory.id)}
                          className="text-gray-400 hover:text-red-600 p-1 mt-1 inline-block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trade-in (Thu Cũ Đổi Mới) Banner / Card */}
            <div className="pt-1">
              {tradeInItem ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between text-xs">
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 text-amber-950 font-black">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                      <span>MÁY THU CŨ (HÀNG TRADE-IN)</span>
                    </div>
                    <div className="font-bold text-gray-950 mt-1">{tradeInItem.name}</div>
                    <div className="text-[10px] text-gray-600 font-mono font-bold">
                      IMEI: {tradeInItem.imei} | Pin: {tradeInItem.battery_health}% | {tradeInItem.color}
                    </div>
                    <div className="text-xs font-black text-amber-900 mt-1 font-mono">
                      Trừ vào đơn: -{formatVND(tradeInItem.trade_in_value)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTradeInItem(null)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTradeInOpen(true)}
                  className="w-full py-2.5 px-3 border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition"
                >
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span>+ Thu Cũ Đổi Mới (Đồng Bộ Kho Trade-In)</span>
                </button>
              )}
            </div>

            {/* Payment & Calculation Breakdown */}
            <div className="space-y-2.5 text-xs pt-2 border-t border-gray-100">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Tổng tiền hàng:</span>
                <span className="font-bold text-gray-950 font-mono">{formatVND(totalAmount)}</span>
              </div>

              {/* Discount */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Giảm giá / Voucher:</span>
                <div className="w-36">
                  <MoneyInput
                    value={discount}
                    onValueChange={(num) => setDiscount(num)}
                    placeholder="0"
                    className="px-2.5 py-1.5 text-right bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-950 focus:bg-white focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Trade In Value */}
              {tradeInVal > 0 && (
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>Trừ máy thu cũ (Trade-in):</span>
                  <span className="font-mono">-{formatVND(tradeInVal)}</span>
                </div>
              )}

              {/* Final Payment */}
              <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
                <span>TỔNG CẦN THANH TOÁN:</span>
                <span className="font-mono text-lg">{formatVND(finalPayment)}</span>
              </div>

              {/* Paid Amount Auto-formatted */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-gray-800">Tiền khách đưa:</span>
                <div className="w-44">
                  <MoneyInput
                    value={paidAmount}
                    onValueChange={(num) => setCustomPaidAmount(num)}
                    placeholder={formatNumberDots(finalPayment)}
                    className="px-3 py-2 text-right bg-white border-2 border-gray-900 rounded-xl text-sm font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Excess Money Options if paid > finalPayment */}
              {isOverpaid && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-blue-950 text-xs font-black">
                    <span>Khách đưa dư:</span>
                    <span className="text-sm font-mono text-blue-800">+{formatVND(overpaidDifference)}</span>
                  </div>
                  <div className="text-[11px] font-bold text-gray-600 mb-1">
                    Chọn hình thức xử lý tiền thừa:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOverpaidAction('refund')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center text-center transition ${
                        overpaidAction === 'refund'
                          ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-extrabold flex items-center space-x-1">
                        <Coins className="w-3.5 h-3.5" />
                        <span>Thối lại khách</span>
                      </span>
                      <span className="text-[10px] opacity-80 mt-0.5">
                        Thối: {formatVND(overpaidDifference)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverpaidAction('debt')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center text-center transition ${
                        overpaidAction === 'debt'
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-extrabold flex items-center space-x-1">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Tính vào công nợ</span>
                      </span>
                      <span className="text-[10px] opacity-80 mt-0.5">
                        Trừ nợ: {formatVND(overpaidDifference)}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Debt Alert if Underpaid */}
              {isUnderpaid && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex justify-between items-center animate-in fade-in">
                  <span>⚠️ Tự động ghi nợ khách hàng:</span>
                  <span className="font-mono text-sm">+{formatVND(underpaidDifference)}</span>
                </div>
              )}

              {/* Payment Method */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'cash', label: 'Tiền mặt' },
                    { id: 'transfer', label: 'Chuyển khoản' },
                    { id: 'both', label: 'Kết hợp' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        paymentMethod === m.id
                          ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Note */}
              <div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú đơn hàng (Tặng kèm sạc cáp 20W, ốp lưng...)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Checkout Button */}
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full py-3.5 bg-gray-950 hover:bg-black text-white rounded-2xl text-sm font-black shadow-lg shadow-gray-900/20 flex items-center justify-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <span>{submitting ? 'Đang Xử Lý Giao Dịch...' : 'HOÀN TẤT BÁN HÀNG & IN HÓA ĐƠN'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile/Tablet (Requirement 2) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 text-white px-4 py-2.5 shadow-2xl flex items-center justify-between">
        <div>
          <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center space-x-1">
            <span>Giỏ hàng:</span>
            <b className="text-white">{cart.length} máy</b>
          </div>
          <div className="text-sm font-black text-emerald-400 font-mono">
            {formatVND(finalPayment)}
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToCheckout}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5 active:scale-95 transition"
        >
          <span>Thanh Toán ({cart.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modals */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title={scannerMode === 'cart' ? 'Quét Barcode / QR IMEI Bán Hàng' : 'Quét IMEI Máy Cũ Thu Lại'}
      />

      <TradeInModal
        isOpen={isTradeInOpen}
        onClose={() => {
          setIsTradeInOpen(false);
          setScannedTradeInImei('');
        }}
        onConfirm={(item) => setTradeInItem(item)}
        scannedImei={scannedTradeInImei}
        onOpenScanner={() => {
          setScannerMode('tradein');
          setIsScannerOpen(true);
        }}
      />

      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        order={completedOrder}
      />
    </div>
  );
}
