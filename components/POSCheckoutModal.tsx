'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  FileCheck,
  RefreshCw,
  CreditCard,
  Banknote,
  Coins,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Shield,
  Search,
  Plus,
  Camera,
  Check,
  Percent,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { formatVND, formatNumberDots } from '@/lib/format';
import { InventoryItem, TradeInItemInput, PaymentMethod, Product } from '@/types/database';
import {
  getAllMasterColors,
  DEFAULT_MASTER_SKUS,
  sortItemsAZ
} from '@/lib/masterAttributes';
import MoneyInput from '@/components/ui/MoneyInput';
import ScannerModal from '@/components/ScannerModal';

interface POSCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Array<{
    inventory: InventoryItem;
    price: number;
    warranty_months: number;
  }>;
  onCompleteOrder: (payload: any) => Promise<void>;
  submitting: boolean;
  initialCustomer?: {
    id?: string;
    name: string;
    phone: string;
    address?: string;
    cccd?: string;
  } | null;
}

export default function POSCheckoutModal({
  isOpen,
  onClose,
  cart,
  onCompleteOrder,
  submitting,
  initialCustomer,
}: POSCheckoutModalProps) {
  // Wizard Step: 1 = Customer, 2 = Trade-in, 3 = Payment, 4 = Review & Confirm
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1: Customer State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCccd, setCustomerCccd] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [existingDebt, setExistingDebt] = useState<number>(0);
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // STEP 2: Trade-in State
  const [hasTradeIn, setHasTradeIn] = useState<boolean>(false);
  const [tradeInItem, setTradeInItem] = useState<TradeInItemInput | null>(null);
  // Trade-in form fields
  const [tiModelQuery, setTiModelQuery] = useState('iPhone 12 - 64GB - 99%');
  const [tiColor, setTiColor] = useState('Midnight (Đen Đêm)');
  const [tiBattery, setTiBattery] = useState<number | string>(85);
  const [tiImei, setTiImei] = useState('');
  const [tiValue, setTiValue] = useState<number>(6000000);
  const [tiErrors, setTiErrors] = useState<{ [key: string]: string }>({});
  const [isTiDropdownOpen, setIsTiDropdownOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // STEP 3: Payment & Discount
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customPaidAmount, setCustomPaidAmount] = useState<number | null>(null);
  const [overpaidAction, setOverpaidAction] = useState<'refund' | 'debt'>('refund');
  const [note, setNote] = useState('');

  // Master Colors
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAvailableColors(getAllMasterColors());

      if (initialCustomer) {
        setCustomerId(initialCustomer.id || null);
        setCustomerPhone(initialCustomer.phone || '');
        setCustomerName(initialCustomer.name || '');
        setCustomerAddress(initialCustomer.address || '');
        setCustomerCccd(initialCustomer.cccd || '');
        setIsCustomerFound(Boolean(initialCustomer.id));
      }
    }
  }, [isOpen, initialCustomer]);

  // Customer phone live search
  useEffect(() => {
    if (customerPhone.trim().length >= 9) {
      searchCustomer(customerPhone.trim());
    } else {
      if (!initialCustomer) {
        setCustomerId(null);
        setExistingDebt(0);
        setIsCustomerFound(false);
      }
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
        setCustomerError(null);
      } else {
        setCustomerId(null);
        setExistingDebt(0);
        setIsCustomerFound(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCustomerSearching(false);
    }
  };

  // Calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  }, [cart]);

  const tradeInVal = hasTradeIn && tradeInItem ? tradeInItem.trade_in_value : 0;
  const finalPayment = Math.max(0, totalAmount - discount - tradeInVal);
  const paidAmount = customPaidAmount === null ? finalPayment : customPaidAmount;

  const isUnderpaid = paidAmount < finalPayment;
  const isOverpaid = paidAmount > finalPayment;
  const underpaidDifference = Math.max(0, finalPayment - paidAmount);
  const overpaidDifference = Math.max(0, paidAmount - finalPayment);

  const debtAdded = isUnderpaid
    ? underpaidDifference
    : isOverpaid && overpaidAction === 'debt'
    ? -overpaidDifference
    : 0;

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!customerPhone.trim()) {
      setCustomerError('Vui lòng nhập Số điện thoại khách hàng');
      return false;
    }
    if (!customerName.trim()) {
      setCustomerError('Vui lòng nhập Tên khách hàng');
      return false;
    }
    setCustomerError(null);
    return true;
  };

  // Step 2 Validation (if trade-in selected)
  const validateStep2 = (): boolean => {
    if (!hasTradeIn) {
      setTradeInItem(null);
      return true;
    }

    const errors: typeof tiErrors = {};
    if (!tiModelQuery.trim()) errors.model = 'Vui lòng chọn hoặc nhập tên máy thu cũ';
    if (!tiColor.trim()) errors.color = 'Vui lòng chọn màu sắc';
    const numBat = typeof tiBattery === 'string' ? parseInt(tiBattery, 10) : tiBattery;
    if (isNaN(numBat) || numBat <= 0 || numBat > 100) errors.battery = 'Vui lòng nhập % Pin từ 1 đến 100';
    if (!tiImei.trim()) errors.imei = 'Vui lòng nhập hoặc quét mã IMEI máy cũ';
    if (!tiValue || tiValue <= 0) errors.value = 'Vui lòng nhập giá thu thỏa thuận';

    setTiErrors(errors);
    if (Object.keys(errors).length > 0) return false;

    setTradeInItem({
      name: `${tiModelQuery.trim()} [Hàng Trade-in]`,
      category: 'iPhone',
      condition: '99%',
      color: tiColor.trim(),
      storage: '',
      imei: tiImei.trim(),
      battery_health: numBat,
      trade_in_value: tiValue,
    });
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleFinalSubmit = async () => {
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
      trade_in: hasTradeIn ? tradeInItem : null,
      paid_amount: paidAmount,
      overpaid_action: isOverpaid ? overpaidAction : undefined,
      payment_method: paymentMethod,
      note,
    };

    await onCompleteOrder(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[94vh]">
        
        {/* Header with Step Wizard Indicator */}
        <div className="bg-gray-950 text-white px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-emerald-500 text-gray-950 rounded-md text-[10px] font-black uppercase">
                Bước {step}/4
              </span>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide">
                {step === 1 && '1. Thông Tin Khách Hàng'}
                {step === 2 && '2. Thu Cũ Đổi Mới (Trade-in)'}
                {step === 3 && '3. Phương Thức Thanh Toán'}
                {step === 4 && '4. Xác Nhận & Hoàn Tất Đơn Hàng'}
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {step === 1 && 'Tìm kiếm khách hàng quen hoặc nhập nhanh thông tin khách mới'}
              {step === 2 && 'Khách mua thẳng hoặc có thu lại máy cũ để khấu trừ vào đơn'}
              {step === 3 && 'Chọn hình thức thanh toán, chiết khấu và tiền khách đưa'}
              {step === 4 && 'Kiểm tra toàn bộ thông số đơn hàng trước khi xuất hóa đơn'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1.5 flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Body: Multi-Step Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">
          
          {/* ==================================================== */}
          {/* STEP 1: CUSTOMER INFO */}
          {/* ==================================================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              {customerError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{customerError}</span>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide">
                  Số Điện Thoại Khách Hàng (Tìm kiếm hoặc tạo mới) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Nhập SĐT khách (VD: 0912345678)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-950 focus:ring-2 focus:ring-gray-950 focus:outline-none"
                    autoFocus
                  />
                  {customerSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                      Đang tìm...
                    </span>
                  )}
                </div>

                {/* Customer Found Banner */}
                {isCustomerFound && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-950">{customerName}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Khách hàng cũ
                      </span>
                    </div>
                    {customerAddress && (
                      <div className="text-[11px] text-gray-600 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{customerAddress}</span>
                      </div>
                    )}
                    {existingDebt !== 0 && (
                      <div className="text-[11px] font-bold text-red-600 pt-0.5">
                        Công nợ hiện tại: {formatVND(existingDebt)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Full Name & Details */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Họ và tên khách hàng *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="VD: Anh Nam, Chị Linh..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-950 focus:ring-2 focus:ring-gray-950 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Địa chỉ (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="VD: Quận 1, TP.HCM"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      CCCD lưu bảo hành (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={customerCccd}
                      onChange={(e) => setCustomerCccd(e.target.value)}
                      placeholder="VD: 079..."
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: TRADE-IN OPTION */}
          {/* ==================================================== */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-xs font-black text-gray-900 uppercase tracking-wide">
                Khách Hàng Có Thu Cũ Đổi Mới (Trade-in) Không?
              </div>

              {/* 2 Big Choice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHasTradeIn(false)}
                  className={`p-4 rounded-2xl border text-left transition ${
                    !hasTradeIn
                      ? 'border-gray-950 bg-gray-950 text-white shadow-md'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Smartphone className="w-5 h-5" />
                    {!hasTradeIn && <Check className="w-4 h-4 text-emerald-400 font-bold" />}
                  </div>
                  <div className="font-black text-sm mt-2">1. Khách Mua Thẳng</div>
                  <p className="text-[11px] opacity-75 mt-0.5">
                    Không thu lại máy cũ, thanh toán toàn bộ giá trị đơn hàng.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setHasTradeIn(true)}
                  className={`p-4 rounded-2xl border text-left transition ${
                    hasTradeIn
                      ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                      : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <RefreshCw className="w-5 h-5" />
                    {hasTradeIn && <Check className="w-4 h-4 text-white font-bold" />}
                  </div>
                  <div className="font-black text-sm mt-2">2. Có Thu Cũ (Trade-in)</div>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    Thu lại máy cũ, số tiền thu sẽ được trừ trực tiếp vào đơn hàng.
                  </p>
                </button>
              </div>

              {/* Expanded Trade-in Input Form */}
              {hasTradeIn && (
                <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="font-black text-amber-950 text-xs uppercase flex items-center justify-between">
                    <span>Nhập Thông Tin Máy Cũ Thu Lại</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      Master SKU
                    </span>
                  </div>

                  {/* SKU Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Tên máy mẫu thu cũ (Tên + Dung lượng + Ngoại hình) *
                    </label>
                    <input
                      type="text"
                      value={tiModelQuery}
                      onChange={(e) => {
                        setTiModelQuery(e.target.value);
                        setTiErrors((prev) => ({ ...prev, model: '' }));
                      }}
                      placeholder="VD: iPhone 11 - 64GB - 99%..."
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-950 focus:ring-2 focus:ring-amber-500"
                    />
                    {tiErrors.model && <p className="text-[10px] text-red-600 font-bold mt-1">{tiErrors.model}</p>}
                  </div>

                  {/* Color & Battery */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">Màu sắc *</label>
                      <select
                        value={tiColor}
                        onChange={(e) => {
                          setTiColor(e.target.value);
                          setTiErrors((prev) => ({ ...prev, color: '' }));
                        }}
                        className="w-full px-2.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                      >
                        {availableColors.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1">% Pin thực tế *</label>
                      <input
                        type="number"
                        value={tiBattery}
                        onChange={(e) => {
                          setTiBattery(e.target.value === '' ? '' : parseInt(e.target.value, 10));
                          setTiErrors((prev) => ({ ...prev, battery: '' }));
                        }}
                        placeholder="VD: 85"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold font-mono"
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>

                  {/* IMEI & Scanner */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">Mã IMEI máy thu lại *</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={tiImei}
                        onChange={(e) => {
                          setTiImei(e.target.value);
                          setTiErrors((prev) => ({ ...prev, imei: '' }));
                        }}
                        placeholder="Nhập hoặc quét IMEI 15 số..."
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold"
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
                    {tiErrors.imei && <p className="text-[10px] text-red-600 font-bold mt-1">{tiErrors.imei}</p>}
                  </div>

                  {/* Trade In Price */}
                  <div>
                    <label className="block text-xs font-black text-amber-950 mb-1">
                      Giá Thỏa Thuận Thu Lại * (Khấu trừ vào đơn)
                    </label>
                    <MoneyInput
                      value={tiValue}
                      onValueChange={(num) => {
                        setTiValue(num);
                        setTiErrors((prev) => ({ ...prev, value: '' }));
                      }}
                      placeholder="0"
                      className="px-3.5 py-2.5 bg-white border-2 border-amber-500 rounded-xl text-sm font-black text-amber-950 font-mono"
                    />
                    <div className="text-right text-xs font-black text-amber-900 mt-1 font-mono">
                      Khấu trừ: -{formatVND(tiValue)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 3: PAYMENT METHOD & DISCOUNT */}
          {/* ==================================================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                <div className="flex justify-between text-gray-600">
                  <span>Tổng giá niêm yết ({cart.length} máy):</span>
                  <span className="font-bold text-gray-950 font-mono">{formatVND(totalAmount)}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-700 font-bold">Giảm giá / Voucher:</span>
                  <div className="w-36">
                    <MoneyInput
                      value={discount}
                      onValueChange={(num) => setDiscount(num)}
                      placeholder="0"
                      className="px-2.5 py-1.5 text-right bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-950"
                    />
                  </div>
                </div>

                {/* Trade In Value */}
                {hasTradeIn && tradeInVal > 0 && (
                  <div className="flex justify-between text-amber-900 font-bold pt-1">
                    <span>Trừ máy thu cũ (Trade-in):</span>
                    <span className="font-mono">-{formatVND(tradeInVal)}</span>
                  </div>
                )}

                {/* Final Payment Due */}
                <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
                  <span>TỔNG CẦN THANH TOÁN:</span>
                  <span className="font-mono text-lg text-emerald-700">{formatVND(finalPayment)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wide mb-1.5">
                  Phương thức thanh toán *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: '💵 Tiền mặt' },
                    { id: 'transfer', label: '💳 Chuyển khoản' },
                    { id: 'both', label: '🔄 Kết hợp' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition ${
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

              {/* Paid Amount */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Tiền khách đưa thực tế:</span>
                  <div className="w-44">
                    <MoneyInput
                      value={paidAmount}
                      onValueChange={(num) => setCustomPaidAmount(num)}
                      placeholder={formatNumberDots(finalPayment)}
                      className="px-3 py-2 text-right bg-white border-2 border-gray-900 rounded-xl text-sm font-black text-emerald-700 font-mono"
                    />
                  </div>
                </div>

                {/* Excess Money Handler */}
                {isOverpaid && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-blue-950 font-black text-xs">
                      <span>Khách đưa dư:</span>
                      <span className="font-mono text-sm">+{formatVND(overpaidDifference)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOverpaidAction('refund')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                          overpaidAction === 'refund'
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Thối lại {formatVND(overpaidDifference)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverpaidAction('debt')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                          overpaidAction === 'debt'
                            ? 'bg-emerald-800 text-white border-emerald-800'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Ghi nợ thừa cho khách
                      </button>
                    </div>
                  </div>
                )}

                {/* Debt Handler */}
                {isUnderpaid && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold flex justify-between items-center animate-in fade-in">
                    <span>⚠️ Tự động ghi nợ khách hàng:</span>
                    <span className="font-mono text-sm">+{formatVND(underpaidDifference)}</span>
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú đơn hàng (Tặng sạc cáp 20W, dán cường lực trọn đời...)"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 4: REVIEW & CONFIRM */}
          {/* ==================================================== */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="font-black text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                  Tóm Tắt Đơn Hàng
                </div>

                {/* Customer */}
                <div className="flex justify-between items-start text-xs">
                  <div className="text-gray-500">Khách hàng:</div>
                  <div className="text-right">
                    <div className="font-bold text-gray-950">{customerName} ({customerPhone})</div>
                    {customerAddress && <div className="text-[10px] text-gray-500">{customerAddress}</div>}
                  </div>
                </div>

                {/* Sold Items */}
                <div className="space-y-1.5 pt-2 border-t border-gray-200">
                  <div className="text-gray-500 font-bold">Danh sách máy bán ({cart.length}):</div>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs bg-white p-2.5 rounded-xl border border-gray-200">
                      <div>
                        <div className="font-bold text-gray-950">{item.inventory.product_name}</div>
                        <div className="text-[10px] font-mono text-gray-500">
                          IMEI: {item.inventory.imei} • {item.inventory.color} • BH {item.warranty_months}T
                        </div>
                      </div>
                      <div className="font-black text-gray-950 font-mono">{formatVND(item.price)}</div>
                    </div>
                  ))}
                </div>

                {/* Trade-in */}
                {hasTradeIn && tradeInItem && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-amber-950">{tradeInItem.name}</div>
                      <div className="text-[10px] text-amber-800 font-mono">IMEI: {tradeInItem.imei} (Pin {tradeInItem.battery_health}%)</div>
                    </div>
                    <div className="font-black text-amber-900 font-mono">-{formatVND(tradeInItem.trade_in_value)}</div>
                  </div>
                )}

                {/* Financial Totals */}
                <div className="pt-2 border-t border-gray-200 space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-mono font-bold">{formatVND(totalAmount)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>Giảm giá / Voucher:</span>
                      <span className="font-mono">-{formatVND(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-gray-950 pt-1 border-t border-gray-200">
                    <span>TỔNG TIỀN PHẢI TRẢ:</span>
                    <span className="font-mono text-base text-emerald-700">{formatVND(finalPayment)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-800">
                    <span>Tiền khách đưa ({paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}):</span>
                    <span className="font-mono">{formatVND(paidAmount)}</span>
                  </div>
                  {debtAdded !== 0 && (
                    <div className={`flex justify-between text-xs font-black ${debtAdded > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      <span>{debtAdded > 0 ? 'Ghi nợ khách hàng:' : 'Nợ thừa tài khoản khách:'}</span>
                      <span className="font-mono">{debtAdded > 0 ? `+${formatVND(debtAdded)}` : formatVND(debtAdded)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between space-x-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-2xl text-xs font-bold transition"
            >
              Hủy
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3.5 bg-gray-950 hover:bg-black text-white rounded-2xl text-xs font-black flex items-center justify-center space-x-2 shadow-md transition active:scale-[0.99]"
            >
              <span>Tiếp tục: {step === 1 ? 'Thu Cũ (Trade-in)' : step === 2 ? 'Thanh Toán' : 'Xác Nhận'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition active:scale-[0.99] disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{submitting ? 'Đang Tạo Đơn Hàng...' : 'HOÀN TẤT ĐƠN HÀNG & IN HÓA ĐƠN'}</span>
            </button>
          )}
        </div>
      </div>

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => setTiImei(code)}
        title="Quét IMEI Máy Cũ Thu Lại"
      />
    </div>
  );
}
