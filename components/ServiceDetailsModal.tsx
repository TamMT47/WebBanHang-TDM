'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wrench,
  Smartphone,
  Shield,
  DollarSign,
  FileText,
  Sparkles,
  Camera,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import MoneyInput from '@/components/ui/MoneyInput';
import ScannerModal from '@/components/ScannerModal';
import {
  DEFAULT_MASTER_SERVICES,
  DEFAULT_MASTER_MODELS,
  getAllMasterModels,
  MasterServiceItem,
  sortItemsAZ
} from '@/lib/masterAttributes';
import { POSCartItem } from '@/types/database';

interface ServiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: POSCartItem) => void;
  initialService?: MasterServiceItem | null;
  initialDeviceModel?: string;
}

export default function ServiceDetailsModal({
  isOpen,
  onClose,
  onAddToCart,
  initialService,
  initialDeviceModel,
}: ServiceDetailsModalProps) {
  const [deviceModel, setDeviceModel] = useState(initialDeviceModel || 'iPhone 13 Pro Max');
  const [modelSearchQuery, setModelSearchQuery] = useState(initialDeviceModel || 'iPhone 13 Pro Max');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [masterModels, setMasterModels] = useState<string[]>([]);

  const [customerImei, setCustomerImei] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState(initialService?.id || 'thay_pin');
  const [customServiceName, setCustomServiceName] = useState(initialService?.name || 'Thay Pin (Pin Zin)');
  const [servicePrice, setServicePrice] = useState<number>(initialService?.defaultPrice || 450000);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(initialService?.defaultWarrantyMonths ?? 12);
  const [technicianNote, setTechnicianNote] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const models = getAllMasterModels();
      setMasterModels(sortItemsAZ(models, (m) => m));

      if (initialService) {
        setSelectedServiceId(initialService.id);
        setCustomServiceName(initialService.name);
        setServicePrice(initialService.defaultPrice);
        setWarrantyMonths(initialService.defaultWarrantyMonths);
      }
    }
  }, [isOpen, initialService]);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSelectServicePreset = (service: MasterServiceItem) => {
    setSelectedServiceId(service.id);
    setCustomServiceName(service.name);
    setServicePrice(service.defaultPrice);
    setWarrantyMonths(service.defaultWarrantyMonths);
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const finalModel = (deviceModel || modelSearchQuery || 'Điện thoại').trim();
    const finalServiceName = (customServiceName || 'Dịch vụ sửa chữa').trim();

    const cartItem: POSCartItem = {
      cart_id: `service_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item_type: 'service',
      inventory_id: null,
      product_id: null,
      product_name: `${finalServiceName} [${finalModel}]`,
      category: 'DichVu',
      condition: 'service',
      color: 'Dịch Vụ',
      storage: '',
      imei: customerImei.trim(),
      price: servicePrice,
      original_price: servicePrice,
      quantity: 1,
      warranty_months: warrantyMonths,
      note: technicianNote.trim() || `Dịch vụ: ${finalServiceName} cho máy ${finalModel}${customerImei ? ` (IMEI: ${customerImei})` : ''}`,
      is_gift: false,
      service_device_model: finalModel,
      service_imei: customerImei.trim(),
      service_type_name: finalServiceName,
    };

    onAddToCart(cartItem);
    onClose();
  };

  const filteredModels = masterModels.filter((m) =>
    m.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black rounded-2xl shadow-glow-amber">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Thêm Dịch Vụ Sửa Chữa & Thay Thế
              </h3>
              <p className="text-xs text-slate-400">
                Không cần nhập kho • Tùy chỉnh giá & thời hạn bảo hành
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmAdd} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* 1. Chọn Dịch Vụ Mẫu Phổ Biến */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Chọn Gói Dịch Vụ / Sửa Chữa Nhanh:</span>
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/60 rounded-2xl border border-slate-800">
              {DEFAULT_MASTER_SERVICES.map((srv) => {
                const isSelected = selectedServiceId === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleSelectServicePreset(srv)}
                    className={`p-2 rounded-xl text-left text-xs font-bold transition flex flex-col justify-between border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                        : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{srv.name.split('(')[0]}</span>
                    <span className="text-[10px] font-mono text-amber-400 mt-1 font-bold">
                      {formatVND(srv.defaultPrice)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Dòng máy khách & IMEI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Dòng máy */}
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tên Dòng Máy Sửa:</span>
              </label>
              <input
                type="text"
                value={modelSearchQuery}
                onFocus={() => setIsModelDropdownOpen(true)}
                onChange={(e) => {
                  setModelSearchQuery(e.target.value);
                  setDeviceModel(e.target.value);
                  setIsModelDropdownOpen(true);
                }}
                placeholder="VD: iPhone 13 Pro Max, S22..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                required
              />

              {isModelDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl divide-y divide-slate-800/50">
                  {filteredModels.slice(0, 15).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setDeviceModel(m);
                        setModelSearchQuery(m);
                        setIsModelDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 transition"
                    >
                      {m}
                    </button>
                  ))}
                  {filteredModels.length === 0 && (
                    <div className="p-2.5 text-center text-xs text-slate-500 italic">
                      Dùng tên tùy chỉnh: "{modelSearchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* IMEI Khách */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>IMEI / Serial Máy Khách:</span>
                <span className="text-[10px] text-slate-500">(Không bắt buộc)</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={customerImei}
                  onChange={(e) => setCustomerImei(e.target.value)}
                  placeholder="Nhập hoặc quét IMEI..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="absolute right-2 p-1 text-slate-400 hover:text-cyan-400 transition"
                  title="Quét mã IMEI bằng Camera"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* 3. Tên chi tiết dịch vụ & Bảo hành */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Tên dịch vụ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Chi Tiết Gói Dịch Vụ:
              </label>
              <input
                type="text"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="VD: Thay Màn Hình OLED GX..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Thời gian bảo hành */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thời Hạn Bảo Hành Dịch Vụ:</span>
              </label>
              <select
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={0}>Không bảo hành / Bao test tại chỗ</option>
                <option value={1}>1 tháng (30 ngày)</option>
                <option value={3}>3 tháng (90 ngày)</option>
                <option value={6}>6 tháng</option>
                <option value={12}>12 tháng (1 năm)</option>
                <option value={24}>24 tháng (2 năm)</option>
              </select>
            </div>

          </div>

          {/* 4. Giá tiền dịch vụ (Tùy chỉnh linh hoạt) */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl space-y-2">
            <label className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center justify-between">
              <span>Giá Tiền Dịch Vụ (Báo Khách):</span>
              <span className="text-xs font-mono font-bold text-white">{formatVND(servicePrice)}</span>
            </label>
            <MoneyInput
              value={servicePrice}
              onValueChange={(val: number) => setServicePrice(val)}
              placeholder="Nhập giá tiền dịch vụ..."
              className="w-full text-base font-black text-amber-400"
            />
          </div>

          {/* 5. Ghi chú kỹ thuật / Tình trạng tiếp nhận */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ghi Chú Kỹ Thuật / Tình Trạng Máy Nhận:</span>
            </label>
            <textarea
              value={technicianNote}
              onChange={(e) => setTechnicianNote(e.target.value)}
              rows={2}
              placeholder="VD: Nhận máy vỡ kính, màn hiển thị bình thường, vỏ cấn nhẹ góc..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-amber-500/20 flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950 font-black" />
              <span>+ Thêm Vào Giỏ Hàng</span>
            </button>
          </div>

        </form>

      </div>

      {/* Camera Scanner for IMEI */}
      {isScannerOpen && (
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={(scanned: string) => {
            setCustomerImei(scanned.trim());
            setIsScannerOpen(false);
          }}
        />
      )}

    </div>
  );
}
