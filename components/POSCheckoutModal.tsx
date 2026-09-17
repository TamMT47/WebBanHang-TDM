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
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { formatVND, formatNumberDots } from '@/lib/format';
import { InventoryItem, PaymentMethod } from '@/types/database';
import {
  getAllMasterColors,
  getAllMasterModels,
  saveCustomModel,
  DEFAULT_MASTER_STORAGES,
  DEFAULT_MASTER_CONDITIONS,
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
  currentUser?: any;
}

export default function POSCheckoutModal({
  isOpen,
  onClose,
  cart,
  onCompleteOrder,
  submitting,
  initialCustomer,
  currentUser,
}: POSCheckoutModalProps) {
  // Wizard Step: 1 = Customer, 2 = Trade-in, 3 = Payment, 4 = Review & Confirm
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1: Customer State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCccd, setCustomerCccd] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [existingDebt, setExistingDebt] = useState<number>(0);
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);

  // STEP 2: Trade-in State
  const [hasTradeIn, setHasTradeIn] = useState<boolean>(false);
  const [masterModels, setMasterModels] = useState<string[]>([]);
  const [tiModelName, setTiModelName] = useState('iPhone 12');
  const [tiModelSearchQuery, setTiModelSearchQuery] = useState('iPhone 12');
  const [tiStorage, setTiStorage] = useState('128GB');
  const [tiCondition, setTiCondition] = useState('99%');
  const [tiColor, setTiColor] = useState('Midnight (Đen)');
  const [tiBattery, setTiBattery] = useState<number | string>(85);
  const [tiImei, setTiImei] = useState('');
  const [tiValue, setTiValue] = useState<number>(5000000);
  const [tiSellingPrice, setTiSellingPrice] = useState<number>(5800000);
  const [tiErrors, setTiErrors] = useState<{ [key: string]: string }>({});
  const [isTiModelDropdownOpen, setIsTiModelDropdownOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const tiModelDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add Model Submodal for Trade-in
  const [isAddNewModelOpen, setIsAddNewModelOpen] = useState(false);
  const [customNewModelName, setCustomNewModelName] = useState('');

  // STEP 3: Payment & Discount
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [customPaidAmount, setCustomPaidAmount] = useState<number | null>(null);
  const [overpaidAction, setOverpaidAction] = useState<'refund' | 'debt'>('refund');
  const [note, setNote] = useState('');

  // Salesperson state (chỉ Admin/Quản lý được sửa)
  const isManagerOrAbove = currentUser && ['admin', 'owner', 'manager'].includes(currentUser.role);
  const [sellerId, setSellerId] = useState<string>('');
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.users) {
          setUsersList(data.users);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Financial Calculations
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price, 0);
  }, [cart]);

  const tradeInVal = hasTradeIn ? tiValue : 0;
  const finalPayment = Math.max(0, totalAmount - discount - tradeInVal);

  const paidAmount = customPaidAmount !== null ? customPaidAmount : finalPayment;
  const underpaidDifference = Math.max(0, finalPayment - paidAmount);
  const overpaidDifference = Math.max(0, paidAmount - finalPayment);
  const isOverpaid = paidAmount > finalPayment;
  const isUnderpaid = paidAmount < finalPayment;

  const debtAdded = isUnderpaid
    ? underpaidDifference
    : isOverpaid && overpaidAction === 'debt'
    ? -overpaidDifference
    : 0;

  // Initialize Master Models
  useEffect(() => {
    if (isOpen) {
      const models = getAllMasterModels();
      setMasterModels(sortItemsAZ(models, (m) => m));
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tiModelDropdownRef.current && !tiModelDropdownRef.current.contains(event.target as Node)) {
        setIsTiModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTiModels = useMemo(() => {
    if (!tiModelSearchQuery.trim()) return masterModels;
    const q = tiModelSearchQuery.toLowerCase().trim();
    return masterModels.filter((m) => m.toLowerCase().includes(q));
  }, [masterModels, tiModelSearchQuery]);

  // Load customer initial state
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDiscount(0);
      setPaymentMethod('transfer');
      setCustomPaidAmount(null);
      setSellerId('');
      setNote('');
      setHasTradeIn(false);
      setTiModelName('iPhone 12');
      setTiModelSearchQuery('iPhone 12');
      setTiStorage('128GB');
      setTiCondition('99%');
      setTiColor('Midnight (Đen)');
      setTiBattery(85);
      setTiImei('');
      setTiValue(5000000);
      setTiSellingPrice(5800000);
      setTiErrors({});
      setCustomerSearchResults([]);

      if (initialCustomer && initialCustomer.phone) {
        setCustomerPhone(initialCustomer.phone);
        setCustomerName(initialCustomer.name);
        setCustomerAddress(initialCustomer.address || '');
        setCustomerCccd(initialCustomer.cccd || '');
        setCustomerId(initialCustomer.id || null);
        setIsCustomerFound(true);
        setIsCreatingNewCustomer(false);
      } else {
        clearCustomer();
      }
    }
  }, [isOpen, initialCustomer]);

  const clearCustomer = () => {
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
    setCustomerPhone('');
    setCustomerName('');
    setCustomerAddress('');
    setCustomerCccd('');
    setCustomerId(null);
    setExistingDebt(0);
    setIsCustomerFound(false);
    setIsCreatingNewCustomer(false);
    setCustomerError(null);
  };

  const handleChangeCustomer = () => {
    setIsCustomerFound(false);
    setCustomerSearchQuery(customerPhone);
  };

  // Select customer from search results
  const handleSelectCustomer = (p: any) => {
    setCustomerId(p.id);
    setCustomerName(p.name);
    setCustomerPhone(p.phone);
    setCustomerAddress(p.address || '');
    setCustomerCccd(p.cccd || '');
    setExistingDebt(parseFloat(p.debt) || 0);
    setIsCustomerFound(true);
    setIsCreatingNewCustomer(false);
    setCustomerSearchResults([]);
    setCustomerError(null);
  };

  // Debounced Customer Search (Show results list only - DO NOT auto select)
  useEffect(() => {
    if (!customerSearchQuery.trim() || isCustomerFound) {
      setCustomerSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCustomerSearching(true);
        const res = await fetch(`/api/partners?search=${encodeURIComponent(customerSearchQuery.trim())}&type=customer`);
        const data = await res.json();
        setCustomerSearchResults(data.partners || []);
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setCustomerSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, isCustomerFound]);

  // Validation
  const validateStep1 = (): boolean => {
    if (isCustomerFound && customerPhone.trim() && customerName.trim()) {
      setCustomerError(null);
      return true;
    }
    if (!customerPhone.trim()) {
      setCustomerError('Vui lòng nhập Số điện thoại khách hàng');
      return false;
    }
    if (!customerName.trim()) {
      setCustomerError('Vui lòng nhập Họ và tên khách hàng');
      return false;
    }
    setCustomerError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!hasTradeIn) return true;

    const errors: { [key: string]: string } = {};
    if (!tiModelName.trim()) {
      errors.model = 'Vui lòng chọn mẫu máy thu cũ';
    }
    if (!tiImei.trim()) {
      errors.imei = 'Vui lòng nhập số IMEI máy thu';
    } else if (tiImei.trim().length < 8) {
      errors.imei = 'Mã IMEI phải có ít nhất 8 ký tự';
    }
    if (!tiValue || tiValue <= 0) {
      errors.value = 'Giá trị thu cũ phải lớn hơn 0';
    }

    setTiErrors(errors);
    return Object.keys(errors).length === 0;
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

  const handleAddNewModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNewModelName.trim()) return;

    const clean = customNewModelName.trim();
    saveCustomModel(clean);
    const updated = getAllMasterModels();
    setMasterModels(sortItemsAZ(updated, (m) => m));

    setTiModelName(clean);
    setTiModelSearchQuery(clean);
    setCustomNewModelName('');
    setIsAddNewModelOpen(false);
    setIsTiModelDropdownOpen(false);
  };

  // Submit Handler
  const handleSubmitFinalOrder = async () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    const payload = {
      customer: {
        id: customerId || undefined,
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
        cccd: customerCccd.trim(),
      },
      partner_id: customerId || undefined,
      partner_name: customerName.trim(),
      partner_phone: customerPhone.trim(),
      partner_address: customerAddress.trim() || undefined,
      partner_cccd: customerCccd.trim() || undefined,
      total_amount: totalAmount,
      discount,
      trade_in_value: tradeInVal,
      final_payment: finalPayment,
      paid_amount: paidAmount,
      debt_added: debtAdded,
      payment_method: paymentMethod,
      overpaid_action: isOverpaid ? overpaidAction : undefined,
      note: note.trim() || undefined,
      items: cart.map((item) => ({
        inventory_id: item.inventory.id,
        product_name: item.inventory.product_name,
        imei: item.inventory.imei,
        price: item.price,
        cost_price: item.inventory.cost_price,
        warranty_months: item.warranty_months,
        color: item.inventory.color,
        storage: item.inventory.storage,
        condition: item.inventory.condition,
        battery_health: item.inventory.battery_health,
      })),
      trade_in_item: hasTradeIn
        ? {
            name: `${tiModelName} ${tiStorage} (${tiCondition})`,
            model_name: tiModelName,
            storage: tiStorage,
            condition: tiCondition,
            color: tiColor,
            battery_health: typeof tiBattery === 'number' ? tiBattery : parseInt(tiBattery, 10) || 85,
            imei: tiImei.trim(),
            value: tiValue,
            trade_in_value: tiValue,
            selling_price: tiSellingPrice || Math.round(tiValue * 1.15),
          }
        : null,
      seller_id: sellerId || null,
    };

    await onCompleteOrder(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px] rounded-md border border-cyan-500/30 badge-nowrap">
                  BƯỚC {step}/4
                </span>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  {step === 1 && '1. THÔNG TIN KHÁCH HÀNG'}
                  {step === 2 && '2. THU CŨ ĐỔI MỚI (TRADE-IN)'}
                  {step === 3 && '3. THANH TOÁN & CHIẾT KHẤU'}
                  {step === 4 && '4. XÁC NHẬN ĐƠN HÀNG'}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {step === 1 && 'Tra cứu khách quen hoặc tạo nhanh khách hàng mới'}
                {step === 2 && 'Định giá máy cũ để trừ trực tiếp vào hóa đơn (Tùy chọn)'}
                {step === 3 && 'Phương thức thanh toán, giảm giá và xử lý nợ'}
                {step === 4 && 'Kiểm tra toàn bộ thông tin trước khi in hóa đơn'}
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

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1 flex">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 shadow-glow-cyan"
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
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>{customerError}</span>
                </div>
              )}

              {/* Customer Selected Card */}
              {isCustomerFound ? (
                <div className="p-3.5 bg-slate-850 border border-emerald-500/40 rounded-2xl animate-in fade-in shadow-inner flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black text-white truncate max-w-[180px]">{customerName}</span>
                      <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 badge-nowrap">
                        ✓ Đã Chọn Khách Hàng
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-300 flex items-center space-x-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>{customerPhone}</span>
                      {customerAddress && <span className="text-slate-400 text-[11px] font-normal truncate">• {customerAddress}</span>}
                    </div>
                    {existingDebt !== 0 && (
                      <div className="text-[11px] font-black text-rose-400 font-sans">
                        Công nợ hiện tại: {formatVND(existingDebt)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleChangeCustomer}
                      className="px-2.5 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-cyan-300 rounded-xl text-[11px] font-bold transition badge-nowrap text-center"
                    >
                      Đổi khách hàng
                    </button>
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-[11px] font-bold transition badge-nowrap text-center"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ) : (
                /* Search / Create Customer View */
                <div className="space-y-4">
                  <div className="p-4 bg-slate-850 rounded-2xl border border-slate-700/60 space-y-3">
                    <label className="block text-xs font-black text-slate-200 uppercase tracking-wide">
                      Tìm kiếm Khách Hàng (Nhập SĐT hoặc Tên) *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setCustomerPhone(e.target.value);
                        }}
                        placeholder="Nhập SĐT (VD: 0912345678) hoặc tên khách..."
                        className="w-full pl-10 pr-24 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                        autoFocus
                      />
                      {customerSearching ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                          Đang tìm...
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingNewCustomer(true);
                            setCustomerPhone(customerSearchQuery);
                            setCustomerSearchResults([]);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg text-[11px] font-black transition flex items-center space-x-1 badge-nowrap"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Khách Mới</span>
                        </button>
                      )}
                    </div>

                    {/* Search Results Dropdown List */}
                    {customerSearchResults.length > 0 && (
                      <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto bg-slate-900/90 border border-slate-700/80 p-2 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 px-1 pb-1">
                          Tìm thấy {customerSearchResults.length} khách hàng phù hợp (Bấm để chọn):
                        </div>
                        {customerSearchResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectCustomer(p)}
                            className="p-2.5 bg-slate-800/80 hover:bg-cyan-950/50 hover:border-cyan-500/50 border border-slate-700/50 rounded-xl cursor-pointer transition flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-white text-xs">{p.name}</div>
                              <div className="text-[11px] text-slate-400 font-medium">SĐT: {p.phone} {p.address ? `• ${p.address}` : ''}</div>
                            </div>
                            {p.debt !== 0 && (
                              <span className="text-[10px] font-bold text-rose-400 font-sans badge-nowrap">
                                Nợ: {formatVND(p.debt)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Direct Input / Edit Form */}
                  <div className="space-y-3 p-4 bg-slate-850 rounded-2xl border border-slate-700/60">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-slate-200">
                        {isCreatingNewCustomer ? '✨ Nhập thông tin Khách Hàng Mới' : 'Thông tin chi tiết khách hàng'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Số điện thoại *
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            setCustomerError(null);
                          }}
                          placeholder="VD: 0912345678"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Họ và tên khách hàng *
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            setCustomerError(null);
                          }}
                          placeholder="VD: Anh Nam, Chị Linh..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">
                          Địa chỉ (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="VD: Quận 1, TP.HCM"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">
                          CCCD lưu bảo hành (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={customerCccd}
                          onChange={(e) => setCustomerCccd(e.target.value)}
                          placeholder="VD: 079..."
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 2: TRADE-IN OPTION */}
          {/* ==================================================== */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-xs font-black text-slate-200 uppercase tracking-wide">
                Khách Hàng Có Thu Cũ Đổi Mới (Trade-in) Không?
              </div>

              {/* 2 Big Choice Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHasTradeIn(false)}
                  className={`p-4 rounded-2xl border text-left transition ${
                    !hasTradeIn
                      ? 'border-cyan-500 bg-slate-850 text-white shadow-glow-cyan'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Smartphone className="w-5 h-5 text-cyan-400" />
                    {!hasTradeIn && <Check className="w-4 h-4 text-cyan-400 font-bold" />}
                  </div>
                  <div className="font-black text-sm mt-2 text-white">1. Khách Mua Thẳng</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Không thu lại máy cũ, thanh toán toàn bộ giá trị đơn hàng.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setHasTradeIn(true)}
                  className={`p-4 rounded-2xl border text-left transition ${
                    hasTradeIn
                      ? 'border-amber-500 bg-slate-850 text-white shadow-glow-amber'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <RefreshCw className="w-5 h-5 text-amber-400" />
                    {hasTradeIn && <Check className="w-4 h-4 text-amber-400 font-bold" />}
                  </div>
                  <div className="font-black text-sm mt-2 text-white">2. Có Thu Cũ (Trade-in)</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Thu lại máy cũ, tự động gán NCC &ldquo;Khách Trade-in&rdquo; và khấu trừ vào đơn.
                  </p>
                </button>
              </div>

              {/* Modular Trade-in Form */}
              {hasTradeIn && (
                <div className="p-4 bg-slate-850 border border-amber-500/40 rounded-2xl space-y-3.5 animate-in fade-in">
                  <div className="font-black text-amber-300 text-xs uppercase flex items-center justify-between">
                    <span>Thông Tin Máy Cũ Thu Lại</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-black badge-nowrap">
                      NCC: Khách Trade-in
                    </span>
                  </div>

                  {/* Model Search & Select */}
                  <div className="relative" ref={tiModelDropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">
                        1. Dòng máy thu cũ * (Chọn từ danh mục chuẩn)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddNewModelOpen(true)}
                        className="px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded text-[10px] font-bold border border-amber-500/30 badge-nowrap"
                      >
                        + Thêm Mẫu Mới
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={tiModelSearchQuery}
                        onChange={(e) => {
                          setTiModelSearchQuery(e.target.value);
                          setIsTiModelDropdownOpen(true);
                          setTiErrors((prev) => ({ ...prev, model: '' }));
                        }}
                        onFocus={() => setIsTiModelDropdownOpen(true)}
                        placeholder="Gõ tìm: iPhone 11, iPhone 12 Pro..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                      <ChevronDown
                        className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                        onClick={() => setIsTiModelDropdownOpen(!isTiModelDropdownOpen)}
                      />
                    </div>

                    {tiErrors.model && <p className="text-[10px] text-rose-400 font-bold mt-1">{tiErrors.model}</p>}

                    {/* Suggestions */}
                    {isTiModelDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-800">
                        {filteredTiModels.length > 0 ? (
                          filteredTiModels.map((m, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setTiModelName(m);
                                setTiModelSearchQuery(m);
                                setIsTiModelDropdownOpen(false);
                              }}
                              className="px-3.5 py-2 hover:bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer flex justify-between items-center"
                            >
                              <span>{m}</span>
                              {tiModelName === m && <Check className="w-3.5 h-3.5 text-amber-400" />}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-slate-400">
                            <p className="text-[11px]">Không tìm thấy mẫu &quot;{tiModelSearchQuery}&quot;</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomNewModelName(tiModelSearchQuery);
                                setIsAddNewModelOpen(true);
                                setIsTiModelDropdownOpen(false);
                              }}
                              className="mt-1 px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg text-[10px] font-black"
                            >
                              + Thêm mẫu này
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Storage, Condition & Color (Locked standard attributes) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">2. Dung lượng *</label>
                      <select
                        value={tiStorage}
                        onChange={(e) => setTiStorage(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                      >
                        {DEFAULT_MASTER_STORAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">3. Tình trạng *</label>
                      <select
                        value={tiCondition}
                        onChange={(e) => setTiCondition(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                      >
                        {DEFAULT_MASTER_CONDITIONS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">4. Màu sắc *</label>
                      <select
                        value={tiColor}
                        onChange={(e) => setTiColor(e.target.value)}
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

                  {/* Free inputs: % Pin & IMEI */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">5. % Pin thực tế *</label>
                      <input
                        type="number"
                        value={tiBattery}
                        onChange={(e) => setTiBattery(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        placeholder="VD: 85"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                        min={1}
                        max={100}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-300 mb-1">6. Mã IMEI (15 số) *</label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={tiImei}
                          onChange={(e) => {
                            setTiImei(e.target.value);
                            setTiErrors((prev) => ({ ...prev, imei: '' }));
                          }}
                          placeholder="Nhập hoặc quét IMEI..."
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 badge-nowrap"
                        >
                          <Camera className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Quét</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {tiErrors.imei && <p className="text-[10px] text-rose-400 font-bold">{tiErrors.imei}</p>}

                  {/* Dual Price Inputs: Giá Thu Cũ & Giá Niêm Yết Bán Ra */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 space-y-1.5">
                      <label className="block text-xs font-black text-amber-300">
                        7. Giá Thu Cũ (Trừ đơn bán) *
                      </label>
                      <MoneyInput
                        value={tiValue}
                        onValueChange={(num) => {
                          setTiValue(num);
                          if (!tiSellingPrice || tiSellingPrice < num) {
                            setTiSellingPrice(Math.round(num * 1.15));
                          }
                          setTiErrors((prev) => ({ ...prev, value: '' }));
                        }}
                        placeholder="0"
                        className="px-3 py-2 bg-slate-900 border-2 border-amber-500 rounded-xl text-sm font-black text-amber-300 font-sans focus:outline-none"
                      />
                      <div className="text-right text-[11px] font-bold text-amber-300 font-sans badge-nowrap">
                        Khấu trừ: -{formatVND(tiValue)}
                      </div>
                    </div>

                    <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 space-y-1.5">
                      <label className="block text-xs font-black text-cyan-300">
                        8. Giá Niêm Yết Bán Ra (Tồn Kho) *
                      </label>
                      <MoneyInput
                        value={tiSellingPrice}
                        onValueChange={(num) => setTiSellingPrice(num)}
                        placeholder="0"
                        className="px-3 py-2 bg-slate-900 border-2 border-cyan-500 rounded-xl text-sm font-black text-cyan-300 font-sans focus:outline-none"
                      />
                      <div className="text-right text-[11px] font-bold text-cyan-300 font-sans badge-nowrap">
                        Giá bán: {formatVND(tiSellingPrice)}
                      </div>
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
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-700/60 space-y-2.5">
                <div className="flex justify-between text-slate-400">
                  <span>Tổng giá niêm yết ({cart.length} máy):</span>
                  <span className="font-bold text-white font-sans">{formatVND(totalAmount)}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300 font-bold">Giảm giá / Voucher:</span>
                  <div className="w-36">
                    <MoneyInput
                      value={discount}
                      onValueChange={(num) => setDiscount(num)}
                      placeholder="0"
                      className="px-2.5 py-1.5 text-right bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Trade In Value */}
                {hasTradeIn && tradeInVal > 0 && (
                  <div className="flex justify-between text-amber-300 font-bold pt-1">
                    <span>Trừ máy thu cũ ({tiModelName}):</span>
                    <span className="font-sans font-bold">-{formatVND(tradeInVal)}</span>
                  </div>
                )}

                {/* Final Payment Due */}
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-700/60">
                  <span>TỔNG CẦN THANH TOÁN:</span>
                  <span className="font-sans text-lg text-cyan-400 font-black tracking-tight">{formatVND(finalPayment)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-black text-slate-200 uppercase tracking-wide mb-1.5">
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
                      className={`py-2.5 rounded-xl text-xs font-bold border transition badge-nowrap justify-center ${
                        paymentMethod === m.id
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-glow-cyan'
                          : 'border-slate-800 bg-slate-850 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid Amount */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Tiền khách đưa thực tế:</span>
                  <div className="w-44">
                    <MoneyInput
                      value={paidAmount}
                      onValueChange={(num) => setCustomPaidAmount(num)}
                      placeholder={formatNumberDots(finalPayment)}
                      className="px-3 py-2 text-right bg-slate-900 border-2 border-cyan-500 rounded-xl text-sm font-black text-cyan-300 font-sans focus:outline-none"
                    />
                  </div>
                </div>

                {/* Excess Money Handler */}
                {isOverpaid && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-blue-300 font-black text-xs">
                      <span>Khách đưa dư:</span>
                      <span className="font-sans font-black text-sm">+{formatVND(overpaidDifference)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOverpaidAction('refund')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                          overpaidAction === 'refund'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        Thối lại {formatVND(overpaidDifference)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverpaidAction('debt')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                          overpaidAction === 'debt'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        Ghi nợ thừa cho khách
                      </button>
                    </div>
                  </div>
                )}

                {/* Debt Handler */}
                {isUnderpaid && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-bold flex justify-between items-center animate-in fade-in">
                    <span>⚠️ Tự động ghi nợ khách hàng:</span>
                    <span className="font-sans text-sm font-black">+{formatVND(underpaidDifference)}</span>
                  </div>
                )}
              </div>

              {/* Người Bán / Giới Thiệu Cá Nhân */}
              <div className="p-3.5 bg-slate-850 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Người Bán / Gán Hoa Hồng Cá Nhân:</span>
                  </label>
                  {!isManagerOrAbove && (
                    <span className="text-[10px] text-slate-400 italic">
                      (Chỉ Quản lý / Admin mới được gán hoa hồng)
                    </span>
                  )}
                </div>

                {isManagerOrAbove ? (
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">🏢 Khách của cửa hàng (Mặc định - Không gán hoa hồng cá nhân)</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.full_name} ({u.role === 'admin' ? 'Admin' : u.role === 'owner' ? 'Chủ Shop' : u.role === 'manager' ? 'Quản lý' : 'Nhân viên'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                      <span>Khách của cửa hàng (Mặc định)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 italic">Quản lý / Admin duyệt</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-400">
                  {isManagerOrAbove
                    ? 'Hoa hồng cá nhân (máy cũ 200k-500k, máy New 300k) sẽ tự động cộng dồn vào bảng lương của nhân sự này.'
                    : 'Tất cả hóa đơn mới mặc định là Khách của cửa hàng. Quản lý / Admin sẽ kiểm tra và gán hoa hồng nếu có.'}
                </div>
              </div>

              {/* Note */}
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú đơn hàng (Tặng sạc cáp 20W, dán cường lực trọn đời...)"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* ==================================================== */}
          {/* STEP 4: REVIEW & CONFIRM */}
          {/* ==================================================== */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-700/60 space-y-3">
                <div className="font-black text-white uppercase tracking-wide border-b border-slate-700/60 pb-2">
                  Tóm Tắt Đơn Hàng
                </div>

                {/* Customer */}
                <div className="flex justify-between items-start text-xs">
                  <div className="text-slate-400">Khách hàng:</div>
                  <div className="text-right">
                    <div className="font-bold text-white">{customerName} ({customerPhone})</div>
                    {customerAddress && <div className="text-[10px] text-slate-400">{customerAddress}</div>}
                  </div>
                </div>

                {/* Sold Items */}
                <div className="space-y-1.5 pt-2 border-t border-slate-700/60">
                  <div className="text-slate-400 font-bold">Danh sách máy bán ({cart.length}):</div>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <div className="font-bold text-white">{item.inventory.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          IMEI: {item.inventory.imei} • {item.inventory.color} • BH {item.warranty_months}T
                        </div>
                      </div>
                      <div className="font-black text-cyan-300 font-sans tracking-tight badge-nowrap">{formatVND(item.price)}</div>
                    </div>
                  ))}
                </div>

                {/* Trade-in */}
                {hasTradeIn && (
                  <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-amber-300">{tiModelName} ({tiStorage} - {tiCondition})</div>
                      <div className="text-[10px] text-amber-400/80 font-bold">
                        IMEI: {tiImei} • {tiColor} (Pin {tiBattery}%)
                      </div>
                    </div>
                    <div className="font-black text-amber-300 font-sans tracking-tight badge-nowrap">-{formatVND(tiValue)}</div>
                  </div>
                )}

                {/* Financial Totals */}
                <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-sans font-bold text-white">{formatVND(totalAmount)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>Giảm giá / Voucher:</span>
                      <span className="font-sans font-bold">-{formatVND(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-700/60">
                    <span>TỔNG TIỀN PHẢI TRẢ:</span>
                    <span className="font-sans text-base text-cyan-400 font-black tracking-tight badge-nowrap">{formatVND(finalPayment)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Tiền khách đưa ({paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}):</span>
                    <span className="font-sans font-bold text-emerald-400">{formatVND(paidAmount)}</span>
                  </div>
                  {debtAdded !== 0 && (
                    <div className={`flex justify-between text-xs font-black ${debtAdded > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      <span>{debtAdded > 0 ? 'Ghi nợ khách hàng:' : 'Nợ thừa tài khoản khách:'}</span>
                      <span className="font-sans font-bold">{debtAdded > 0 ? `+${formatVND(debtAdded)}` : formatVND(debtAdded)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-bold text-slate-300 pt-1.5 border-t border-slate-700/60">
                    <span>Người bán ghi nhận:</span>
                    <span className="font-bold text-cyan-300">
                      {usersList.find((u) => u.id === sellerId)?.full_name || 'Không có'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between space-x-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
            >
              Hủy
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl text-xs font-black flex items-center justify-center space-x-2 shadow-glow-cyan transition active:scale-[0.99]"
            >
              <span>Tiếp tục: {step === 1 ? 'Thu Cũ (Trade-in)' : step === 2 ? 'Thanh Toán' : 'Xác Nhận'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitFinalOrder}
              disabled={submitting}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-2xl text-sm font-black flex items-center justify-center space-x-2 shadow-glow-emerald transition active:scale-[0.99] disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{submitting ? 'Đang Tạo Đơn Hàng...' : 'HOÀN TẤT ĐƠN HÀNG & IN HÓA ĐƠN'}</span>
            </button>
          )}
        </div>

        {/* Quick Add Model Submodal */}
        {isAddNewModelOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase flex items-center space-x-1.5">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Thêm Dòng Máy Mới</span>
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
                    Tên dòng máy (VD: iPhone 16 Pro Max, iPad Pro M4...)
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
            setTiImei(scanned.trim());
            setTiErrors((prev) => ({ ...prev, imei: '' }));
          }}
          title="Quét Barcode / QR IMEI Máy Thu Cũ"
        />
      </div>
    </div>
  );
}
