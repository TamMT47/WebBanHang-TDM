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
  Plus,
  Settings,
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import MoneyInput from '@/components/ui/MoneyInput';
import ScannerModal from '@/components/ScannerModal';
import {
  getAllMasterServices,
  saveCustomService,
  updateCustomService,
  deleteCustomService,
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
  const [masterServices, setMasterServices] = useState<MasterServiceItem[]>([]);

  const [customerImei, setCustomerImei] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState(initialService?.id || 'thay_pin');
  const [customServiceName, setCustomServiceName] = useState(initialService?.name || 'Thay Pin (Pin Zin)');
  const [servicePrice, setServicePrice] = useState<number>(0); // Mặc định để 0 để nhân viên tự nhập
  const [warrantyMonths, setWarrantyMonths] = useState<number>(initialService?.defaultWarrantyMonths ?? 12);
  const [technicianNote, setTechnicianNote] = useState('');

  // Service Management Mode
  const [isManagingServices, setIsManagingServices] = useState(false);
  const [newServiceNameInput, setNewServiceNameInput] = useState('');
  const [newServiceWarranty, setNewServiceWarranty] = useState<number>(12);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceNameText, setEditServiceNameText] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const reloadServices = () => {
    const srvs = getAllMasterServices();
    setMasterServices(srvs);
  };

  useEffect(() => {
    if (isOpen) {
      const models = getAllMasterModels();
      setMasterModels(sortItemsAZ(models, (m) => m));
      reloadServices();

      if (initialService) {
        setSelectedServiceId(initialService.id);
        setCustomServiceName(initialService.name);
        setServicePrice(0);
        setWarrantyMonths(initialService.defaultWarrantyMonths ?? 12);
      } else {
        setServicePrice(0);
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
    // Yêu cầu: Mặc định để ô "GIÁ TIỀN DỊCH VỤ (BÁO KHÁCH)" trống hoặc bằng 0 để nhân viên tự nhập
    setServicePrice(0);
    setWarrantyMonths(service.defaultWarrantyMonths ?? 12);
  };

  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceNameInput.trim()) return;
    saveCustomService(newServiceNameInput.trim(), newServiceWarranty);
    setNewServiceNameInput('');
    reloadServices();
  };

  const handleSaveEditService = (id: string) => {
    if (!editServiceNameText.trim()) return;
    updateCustomService(id, editServiceNameText.trim());
    setEditingServiceId(null);
    reloadServices();
  };

  const handleDeleteService = (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa dịch vụ "${name}" khỏi danh mục mẫu?`)) return;
    deleteCustomService(id);
    reloadServices();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200 box-border">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10">
          <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-hidden">
            <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black rounded-2xl shadow-glow-amber flex-shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider truncate">
                Dịch Vụ Sửa Chữa & Thay Thế
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Không cần nhập kho • Tự nhập giá linh hoạt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmAdd} className="p-3.5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto box-border">
          
          {/* 1. Chọn Dịch Vụ Mẫu Phổ Biến (Không hiện giá cố định) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Chọn Gói Dịch Vụ / Sửa Chữa Nhanh:</span>
              </label>
              <button
                type="button"
                onClick={() => setIsManagingServices(!isManagingServices)}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{isManagingServices ? 'Đóng Quản Lý' : 'Quản Lý Danh Mục'}</span>
              </button>
            </div>

            {/* Quản lý Thêm / Sửa / Xóa Tên Dịch Vụ */}
            {isManagingServices && (
              <div className="p-3 bg-slate-950/90 rounded-2xl border border-cyan-500/30 space-y-2.5 animate-in fade-in duration-150">
                <div className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Quản Lý Tên Dịch Vụ & Thay Thế:</span>
                </div>

                {/* Form thêm mới */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={newServiceNameInput}
                    onChange={(e) => setNewServiceNameInput(e.target.value)}
                    placeholder="Nhập tên dịch vụ mới (VD: Thay Cổ Cáp Màn Hình)..."
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={newServiceWarranty}
                    onChange={(e) => setNewServiceWarranty(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                  >
                    <option value={0}>BH: Test tại chỗ</option>
                    <option value={1}>BH: 1 tháng</option>
                    <option value={3}>BH: 3 tháng</option>
                    <option value={6}>BH: 6 tháng</option>
                    <option value={12}>BH: 12 tháng</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomService}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Tên</span>
                  </button>
                </div>

                {/* Danh sách quản lý */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/60">
                  {masterServices.map((srv) => (
                    <div key={srv.id} className="pt-1 flex items-center justify-between text-xs gap-2">
                      {editingServiceId === srv.id ? (
                        <div className="flex-1 flex items-center space-x-1.5">
                          <input
                            type="text"
                            value={editServiceNameText}
                            onChange={(e) => setEditServiceNameText(e.target.value)}
                            className="flex-1 px-2 py-1 bg-slate-900 border border-amber-500 rounded-lg text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditService(srv.id)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingServiceId(null)}
                            className="p-1 bg-slate-800 text-slate-400 rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-slate-300 font-bold truncate flex-1">{srv.name}</span>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingServiceId(srv.id);
                                setEditServiceNameText(srv.name);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-400 transition"
                              title="Sửa tên dịch vụ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteService(srv.id, srv.name)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition"
                              title="Xóa dịch vụ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Service Cards - BỎ HIỂN THỊ GIÁ CỐ ĐỊNH NHƯ YÊU CẦU */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800 w-full box-border">
              {masterServices.map((srv) => {
                const isSelected = selectedServiceId === srv.id || customServiceName === srv.name;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleSelectServicePreset(srv)}
                    className={`p-2.5 rounded-xl text-left text-xs font-bold transition flex items-center justify-between border w-full box-border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="line-clamp-2 break-words leading-tight">{srv.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Dòng máy khách & IMEI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full box-border">
            
            {/* Dòng máy */}
            <div className="space-y-1.5 relative w-full" ref={dropdownRef}>
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500 box-border"
                required
              />

              {isModelDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl divide-y divide-slate-800/50 box-border">
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
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>IMEI / Serial Máy Khách:</span>
                <span className="text-[10px] text-slate-500">(Không bắt buộc)</span>
              </label>
              <div className="relative flex items-center w-full">
                <input
                  type="text"
                  value={customerImei}
                  onChange={(e) => setCustomerImei(e.target.value)}
                  placeholder="Nhập hoặc quét IMEI..."
                  className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 box-border"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full box-border">
            
            {/* Tên dịch vụ */}
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-300">
                Chi Tiết Gói Dịch Vụ:
              </label>
              <input
                type="text"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="VD: Thay Màn Hình OLED GX..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 box-border"
                required
              />
            </div>

            {/* Thời gian bảo hành */}
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thời Hạn Bảo Hành Dịch Vụ:</span>
              </label>
              <select
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 box-border"
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

          {/* 4. Giá tiền dịch vụ (Nhân viên tự nhập giá báo khách) */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl space-y-2 w-full box-border">
            <label className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center justify-between">
              <span>Giá Tiền Dịch Vụ (Báo Khách):</span>
              <span className="text-xs font-mono font-bold text-white">{formatVND(servicePrice)}</span>
            </label>
            <MoneyInput
              value={servicePrice}
              onValueChange={(val: number) => setServicePrice(val)}
              placeholder="Nhập giá tiền dịch vụ báo khách (VD: 450.000 đ)..."
              className="w-full text-base font-black text-amber-400 box-border"
            />
          </div>

          {/* 5. Ghi chú kỹ thuật / Tình trạng tiếp nhận */}
          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ghi Chú Kỹ Thuật / Tình Trạng Máy Nhận:</span>
            </label>
            <textarea
              value={technicianNote}
              onChange={(e) => setTechnicianNote(e.target.value)}
              rows={2}
              placeholder="VD: Nhận máy vỡ kính, màn hiển thị bình thường, sườn cấn nhẹ..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none box-border"
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
