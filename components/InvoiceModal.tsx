'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle2, Phone, MapPin, ShieldCheck, Sparkles, Settings, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { getInvoiceSettings, saveInvoiceSettings, InvoiceSettings, DEFAULT_INVOICE_SETTINGS } from '@/lib/invoiceSettings';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: 'invoice' | 'warranty';
  order: {
    code: string;
    created_at?: string;
    partner_name?: string;
    partner_phone?: string;
    partner_address?: string;
    partner_cccd?: string;
    creator_name?: string;
    total_amount: number;
    discount: number;
    trade_in_value: number;
    final_payment: number;
    paid_amount: number;
    debt_added: number;
    payment_method: string;
    overpaid_action?: 'refund' | 'debt';
    items?: Array<{
      product_name?: string;
      name?: string;
      imei?: string;
      price: number;
      warranty_months?: number;
      warranty_until?: string;
      battery_health?: number;
      storage?: string;
      color?: string;
      condition?: string;
    }>;
    trade_in_item?: {
      name: string;
      imei: string;
      value: number;
      battery_health?: number;
    } | null;
  } | null;
}

export default function InvoiceModal({ isOpen, onClose, order, initialDocType = 'invoice' }: InvoiceModalProps) {
  const [docType, setDocType] = useState<'invoice' | 'warranty'>(initialDocType);
  const [printFormat, setPrintFormat] = useState<'a4' | 'k80'>('a4');
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);
  const [editForm, setEditForm] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      setDocType(initialDocType || 'invoice');
      const current = getInvoiceSettings();
      setSettings(current);
      setEditForm(current);
      if (current.paperSize) {
        setPrintFormat(current.paperSize);
      }
    }
  }, [isOpen, initialDocType]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveInvoiceSettings(editForm);
    setSettings(updated);
    if (updated.paperSize) {
      setPrintFormat(updated.paperSize);
    }
    setIsEditSettingsOpen(false);
  };

  const handleResetSettings = () => {
    if (confirm('Khôi phục mẫu in về thiết lập mặc định của TD Mobile Store?')) {
      const reset = saveInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
      setSettings(reset);
      setEditForm(reset);
      if (reset.paperSize) {
        setPrintFormat(reset.paperSize);
      }
      setIsEditSettingsOpen(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh logo nhỏ hơn 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setEditForm((prev) => ({ ...prev, shopLogoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleString('vi-VN')
    : new Date().toLocaleString('vi-VN');

  const excessAmount = Math.max(0, order.paid_amount - order.final_payment);
  const changeReturned = excessAmount > 0 && order.debt_added === 0 ? excessAmount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh]">
        
        {/* Modal Header Bar (Hidden during Print) */}
        <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            {docType === 'warranty' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <Printer className="w-5 h-5 text-cyan-400" />
            )}
            <h3 className="text-sm font-extrabold tracking-wide">
              {docType === 'warranty' ? 'PHIẾU BẢO HÀNH CHÍNH HÃNG' : 'HÓA ĐƠN BÁN HÀNG'} #{order.code}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Document Mode Toggle: Hóa Đơn vs Phiếu Bảo Hành */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDocType('invoice')}
                className={`px-3 py-1.5 rounded-xl font-bold transition badge-nowrap ${
                  docType === 'invoice'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 Hóa Đơn
              </button>
              <button
                type="button"
                onClick={() => setDocType('warranty')}
                className={`px-3 py-1.5 rounded-xl font-bold transition badge-nowrap ${
                  docType === 'warranty'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-glow-emerald'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🛡️ Phiếu Bảo Hành
              </button>
            </div>

            {/* Customize Invoice Template Button */}
            <button
              type="button"
              onClick={() => setIsEditSettingsOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 badge-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mẫu In</span>
            </button>

            {/* Format Toggle */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1.5 rounded-xl font-bold transition badge-nowrap ${
                  printFormat === 'a4'
                    ? 'bg-slate-700 text-white font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Khổ A4
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('k80')}
                className={`px-3 py-1.5 rounded-xl font-bold transition badge-nowrap ${
                  printFormat === 'k80'
                    ? 'bg-slate-700 text-white font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bill K80
              </button>
            </div>

            <button
              onClick={handlePrint}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black transition badge-nowrap active:scale-95 ${
                docType === 'warranty'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-glow-emerald'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{docType === 'warranty' ? 'In Phiếu Bảo Hành' : 'In Hóa Đơn'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 flex justify-center">
          
          {/* A4 PRINT FORMAT */}
          {printFormat === 'a4' ? (
            <div
              id="printable-receipt"
              className="w-full max-w-[800px] bg-white p-8 sm:p-10 shadow-lg border border-gray-200 text-gray-900 font-sans min-h-[1050px] flex flex-col justify-between rounded-xl"
            >
              <div>
                {/* 1. Header Cửa Hàng Chuẩn (Customizable) */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-gray-900">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-950 flex items-center justify-center p-1 border border-gray-300 overflow-hidden flex-shrink-0">
                        <img src={settings.shopLogoUrl || '/logo.png'} alt={settings.shopName} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">
                          {settings.shopName}
                        </h1>
                        <p className="text-xs font-bold text-gray-700 italic tracking-wide">
                          {settings.shopSlogan}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span><b>Địa chỉ:</b> {settings.shopAddress}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span>
                          <b>Hotline:</b> <span className="font-bold text-gray-950 font-sans">{settings.shopHotline}</span>
                          {settings.warrantyHotline && (
                            <> • <b>Bảo hành:</b> <span className="font-bold text-gray-950 font-sans">{settings.warrantyHotline}</span></>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mã Đơn & Ngày Giờ */}
                  <div className="text-right space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                      {docType === 'warranty' ? 'Mã Phiếu BH' : 'Mã Hóa Đơn'}
                    </div>
                    <div className="text-lg font-black text-gray-950 font-sans">
                      #{order.code}
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {orderDate}
                    </div>
                  </div>
                </div>

                {/* Tiêu đề hóa đơn / phiếu bảo hành */}
                <div className="text-center my-6">
                  <h2 className="text-xl font-black tracking-wider text-gray-950 uppercase">
                    {docType === 'warranty'
                      ? 'PHIẾU BẢO HÀNH SẢN PHẨM & CAM KẾT CHẤT LƯỢNG'
                      : 'HÓA ĐƠN BÁN HÀNG & PHIẾU BẢO HÀNH'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {docType === 'warranty'
                      ? '(Chứng nhận bảo hành điện tử chính hãng theo số IMEI & Serial)'
                      : '(Kiêm phiếu bàn giao thiết bị & cam kết chất lượng chính hãng)'}
                  </p>
                </div>

                {/* 2. Thông tin khách hàng & Nhân viên lập */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs mb-6">
                  <div className="space-y-1">
                    <div><b>Khách hàng:</b> <span className="font-black text-gray-950 text-sm uppercase">{order.partner_name || 'Khách Vãng Lai'}</span></div>
                    <div><b>Số điện thoại:</b> <span className="font-bold text-gray-950 font-sans text-sm">{order.partner_phone || 'N/A'}</span></div>
                    {order.partner_address && (
                      <div><b>Địa chỉ:</b> <span className="text-gray-800">{order.partner_address}</span></div>
                    )}
                    {order.partner_cccd && (
                      <div><b>Số CCCD:</b> <span className="font-sans text-gray-800">{order.partner_cccd}</span></div>
                    )}
                  </div>

                  <div className="space-y-1 text-right sm:text-left sm:pl-6 sm:border-l border-gray-200">
                    <div><b>{docType === 'warranty' ? 'Kỹ thuật xuất máy:' : 'Nhân viên bán:'}</b> <span className="font-bold text-gray-950">{order.creator_name || 'Admin'}</span></div>
                    <div><b>Hình thức:</b> <span className="font-bold text-gray-950 uppercase">{order.payment_method === 'cash' ? 'Tiền mặt' : order.payment_method === 'transfer' ? 'Chuyển khoản' : 'Kết hợp'}</span></div>
                    <div><b>Trạng thái:</b> <span className="text-emerald-700 font-bold">{docType === 'warranty' ? '✓ Đã Kiểm Định & Bàn Giao Thiết Bị' : '✓ Đã Hoàn Tất Giao Máy'}</span></div>
                  </div>
                </div>

                {/* 3. Bảng chi tiết sản phẩm mua (Chỉ sản phẩm xuất bán, KHÔNG có thu cũ) */}
                <div className="mb-6 overflow-hidden rounded-xl border border-gray-300">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">STT</th>
                        <th className="py-2.5 px-3">Dòng Sản Phẩm Xuất Bán</th>
                        {settings.showImei !== false && <th className="py-2.5 px-3">Mã IMEI / Số Serial</th>}
                        <th className="py-2.5 px-3 text-center">Gói Bảo Hành</th>
                        <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3 font-bold text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-black text-gray-950 text-sm">{item.product_name || item.name}</div>
                            <div className="text-[11px] text-gray-600 font-medium">
                              {item.color ? `${item.color} • ` : ''}{item.storage ? `${item.storage} • ` : ''}{item.condition || '99%'}
                              {settings.showBatteryHealth !== false && item.battery_health ? ` • Pin ${item.battery_health}%` : ''}
                            </div>
                          </td>
                          {settings.showImei !== false && (
                            <td className="py-3 px-3 font-mono font-bold text-gray-950 text-xs">
                              {item.imei || 'N/A'}
                            </td>
                          )}
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg font-black text-[11px]">
                              {item.warranty_months || 12} Tháng
                            </span>
                            {item.warranty_until && (
                              <div className="text-[10px] text-gray-600 font-bold mt-0.5">
                                Đến: {new Date(item.warranty_until).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-sm text-gray-950 font-sans">
                            {formatVND(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. Tổng Kết / Tóm Tắt (Phiếu Bảo Hành: Ẩn hoàn toàn thông tin Thu Cũ) */}
                {docType === 'warranty' ? (
                  <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 mb-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
                    <div className="flex items-center space-x-2.5">
                      <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      <div>
                        <div className="font-black text-emerald-950 text-sm uppercase">Sản Phẩm Đã Được Kiểm Định & Kích Hoạt Bảo Hành</div>
                        <div className="text-emerald-800 text-[11px]">Cam kết thiết bị nguyên zin - Bảo hành căn cứ trên số IMEI / Serial lưu trên hệ thống</div>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-emerald-200 pt-2 sm:pt-0 sm:pl-4">
                      <div>
                        <div className="text-gray-500 text-[10px] uppercase font-bold">Số lượng máy</div>
                        <div className="font-black text-gray-950 font-sans text-sm">{order.items?.length || 1} thiết bị</div>
                      </div>
                      <div className="border-l border-emerald-300 pl-4">
                        <div className="text-gray-500 text-[10px] uppercase font-bold">Hotline kỹ thuật</div>
                        <div className="font-black text-emerald-700 font-sans text-sm">{settings.warrantyHotline || settings.shopHotline}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end mb-8">
                    <div className="w-72 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Tổng tiền hàng:</span>
                        <span className="font-bold text-gray-950 font-sans">{formatVND(order.total_amount)}</span>
                      </div>

                      {order.discount > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>Giảm giá / Voucher:</span>
                          <span className="font-sans">-{formatVND(order.discount)}</span>
                        </div>
                      )}

                      {order.trade_in_value > 0 && (
                        <div className="flex justify-between text-amber-800 font-bold">
                          <span>Khấu trừ thu cũ:</span>
                          <span className="font-sans">-{formatVND(order.trade_in_value)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-black text-gray-950 pt-2 border-t border-gray-300">
                        <span>TỔNG THANH TOÁN:</span>
                        <span className="font-sans text-base font-black text-cyan-700">{formatVND(order.final_payment)}</span>
                      </div>

                      <div className="flex justify-between text-gray-700 font-bold pt-1">
                        <span>Tiền khách đưa:</span>
                        <span className="text-emerald-700 font-sans">{formatVND(order.paid_amount)}</span>
                      </div>

                      {changeReturned > 0 && (
                        <div className="flex justify-between text-blue-700 font-bold">
                          <span>Tiền thối lại khách:</span>
                          <span className="font-sans">{formatVND(changeReturned)}</span>
                        </div>
                      )}

                      {order.debt_added > 0 && (
                        <div className="flex justify-between text-rose-600 font-black">
                          <span>Ghi nợ đơn hàng:</span>
                          <span className="font-sans">+{formatVND(order.debt_added)}</span>
                        </div>
                      )}

                      {order.debt_added < 0 && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Nợ thừa tài khoản khách:</span>
                          <span className="font-sans">-{formatVND(Math.abs(order.debt_added))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Điều Khoản & Chính Sách Bảo Hành (Customizable) */}
                {settings.showWarrantyTerms !== false && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-700 space-y-1.5 mb-8">
                    <div className="font-black text-gray-950 uppercase flex items-center space-x-1 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>CHÍNH SÁCH BẢO HÀNH & CAM KẾT CHẤT LƯỢNG:</span>
                    </div>
                    {settings.warrantyPolicies?.map((policy, pIdx) => (
                      <p key={pIdx} className="leading-relaxed">• {policy}</p>
                    ))}
                    <p className="text-[10px] text-gray-500 italic pt-1 text-center border-t border-gray-200 mt-2">
                      {settings.footerNote}
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Chữ Ký Các Bên */}
              <div className="grid grid-cols-2 gap-4 text-center text-xs text-gray-800 pt-4 border-t border-gray-300">
                <div className="space-y-14">
                  <div>
                    <div className="font-black uppercase text-gray-950">Khách Hàng Ký Tên</div>
                    <div className="text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div className="font-bold text-gray-950">{order.partner_name || 'Khách Hàng'}</div>
                </div>

                <div className="space-y-14">
                  <div>
                    <div className="font-black uppercase text-gray-950">Đại Diện {settings.shopName}</div>
                    <div className="text-[10px] text-gray-500">(Ký tên và đóng dấu)</div>
                  </div>
                  <div className="font-bold text-gray-950">{order.creator_name || 'Quản lý cửa hàng'}</div>
                </div>
              </div>
            </div>
          ) : (
            /* K80 THERMAL RECEIPT FORMAT */
            <div
              id="printable-receipt"
              className="w-full max-w-[360px] bg-white p-6 shadow-sm border border-gray-200 text-gray-900 font-sans text-xs rounded-xl"
            >
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-gray-300">
                <div className="font-black text-base uppercase text-gray-950">{settings.shopName}</div>
                <div className="text-[10px] text-gray-500">{settings.shopAddress}</div>
                <div className="text-[10px] font-bold text-gray-700">
                  Hotline: {settings.shopHotline} {settings.warrantyHotline ? `• BH: ${settings.warrantyHotline}` : ''}
                </div>
                <div className="text-xs font-black text-gray-950 pt-2 uppercase">
                  {docType === 'warranty' ? 'PHIẾU BẢO HÀNH ĐIỆN TỬ' : 'HÓA ĐƠN THANH TOÁN'}
                </div>
                <div className="text-[10px] text-gray-500">#{order.code} • {orderDate}</div>
              </div>

              <div className="py-3 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
                <div><b>Khách:</b> {order.partner_name || 'Khách lẻ'} ({order.partner_phone || 'N/A'})</div>
                <div><b>{docType === 'warranty' ? 'Kỹ thuật:' : 'Thu ngân:'}</b> {order.creator_name || 'Admin'}</div>
              </div>

              {/* Items */}
              <div className="py-3 border-b border-dashed border-gray-300 space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-black text-gray-950 flex justify-between">
                      <span>{item.product_name || item.name}</span>
                      <span className="font-sans font-bold">{formatVND(item.price)}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-sans">
                      {settings.showImei !== false && item.imei ? `IMEI: ${item.imei} • ` : ''}
                      {settings.showBatteryHealth !== false && item.battery_health ? `Pin ${item.battery_health}% • ` : ''}
                      BH: {item.warranty_months}T
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals or Warranty Summary */}
              {docType === 'warranty' ? (
                <div className="py-3 border-b border-dashed border-gray-300 space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Số lượng thiết bị:</span>
                    <span className="font-sans">{order.items?.length || 1} máy</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-800 font-bold">
                    <span>Trạng thái bảo hành:</span>
                    <span>Đã kích hoạt IMEI</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-600">
                    <span>Hotline kỹ thuật:</span>
                    <span className="font-bold font-sans">{settings.warrantyHotline || settings.shopHotline}</span>
                  </div>
                </div>
              ) : (
                <div className="py-3 border-b border-dashed border-gray-300 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Tổng tiền:</span>
                    <span className="font-bold font-sans">{formatVND(order.total_amount)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Giảm giá:</span>
                      <span className="font-sans">-{formatVND(order.discount)}</span>
                    </div>
                  )}
                  {order.trade_in_value > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>Trừ thu cũ:</span>
                      <span className="font-sans">-{formatVND(order.trade_in_value)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm pt-1">
                    <span>THANH TOÁN:</span>
                    <span className="font-sans text-cyan-800">{formatVND(order.final_payment)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Tiền khách đưa:</span>
                    <span className="font-sans font-bold text-emerald-700">{formatVND(order.paid_amount)}</span>
                  </div>
                  {changeReturned > 0 && (
                    <div className="flex justify-between text-[11px] text-blue-700">
                      <span>Tiền thối lại:</span>
                      <span className="font-sans">{formatVND(changeReturned)}</span>
                    </div>
                  )}
                  {order.debt_added > 0 && (
                    <div className="flex justify-between text-[11px] text-rose-600 font-bold">
                      <span>Ghi nợ:</span>
                      <span className="font-sans">+{formatVND(order.debt_added)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center pt-4 space-y-1 text-[10px] text-gray-500">
                {settings.showWarrantyTerms !== false && (
                  <div className="text-[9px] text-left border-t border-dashed border-gray-300 pt-2 pb-1 space-y-0.5">
                    <div className="font-bold text-gray-700">Chính sách bảo hành:</div>
                    {settings.warrantyPolicies?.map((p, pi) => (
                      <div key={pi}>- {p}</div>
                    ))}
                  </div>
                )}
                <p className="font-bold text-gray-700 pt-1">{settings.footerNote}</p>
                <p>Quý khách vui lòng giữ hóa đơn để được phục vụ tốt nhất!</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Customize Invoice Template Settings */}
        {isEditSettingsOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-black uppercase">Tùy Biến Mẫu In Hóa Đơn</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditSettingsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tên cửa hàng / Thương hiệu</label>
                  <input
                    type="text"
                    value={editForm.shopName}
                    onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Slogan / Khẩu hiệu</label>
                  <input
                    type="text"
                    value={editForm.shopSlogan}
                    onChange={(e) => setEditForm({ ...editForm, shopSlogan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Hotline / Zalo liên hệ *</label>
                    <input
                      type="text"
                      value={editForm.shopHotline}
                      onChange={(e) => setEditForm({ ...editForm, shopHotline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Hotline tiếp nhận bảo hành *</label>
                    <input
                      type="text"
                      value={editForm.warrantyHotline}
                      onChange={(e) => setEditForm({ ...editForm, warrantyHotline: e.target.value })}
                      placeholder="VD: 0364848960"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-300">Logo Cửa Hàng</label>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={editForm.shopLogoUrl || '/logo.png'} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center space-x-1">
                        <span>Tải ảnh từ máy</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      <input
                        type="text"
                        value={editForm.shopLogoUrl}
                        onChange={(e) => setEditForm({ ...editForm, shopLogoUrl: e.target.value })}
                        placeholder="Hoặc URL logo"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Địa chỉ cửa hàng *</label>
                  <input
                    type="text"
                    value={editForm.shopAddress}
                    onChange={(e) => setEditForm({ ...editForm, shopAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                {/* Paper size and toggles */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-200">Khổ giấy in mặc định:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, paperSize: 'k80' })}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold ${
                        editForm.paperSize === 'k80'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      🧾 Bill K80 (80mm)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, paperSize: 'a4' })}
                      className={`py-1.5 px-3 rounded-lg border text-xs font-bold ${
                        editForm.paperSize === 'a4'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      📄 Khổ A5 / A4
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={editForm.showImei}
                        onChange={(e) => setEditForm({ ...editForm, showImei: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-cyan-500"
                      />
                      <span className="text-slate-300">Hiển thị mã IMEI / Serial</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={editForm.showBatteryHealth}
                        onChange={(e) => setEditForm({ ...editForm, showBatteryHealth: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-cyan-500"
                      />
                      <span className="text-slate-300">Hiển thị % Dung lượng Pin</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={editForm.showWarrantyTerms}
                        onChange={(e) => setEditForm({ ...editForm, showWarrantyTerms: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-cyan-500"
                      />
                      <span className="text-slate-300">Hiển thị Điều khoản bảo hành</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Chính sách bảo hành (Từng dòng)</label>
                  <div className="space-y-1.5">
                    {editForm.warrantyPolicies.map((p, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={p}
                          onChange={(e) => {
                            const copy = [...editForm.warrantyPolicies];
                            copy[idx] = e.target.value;
                            setEditForm({ ...editForm, warrantyPolicies: copy });
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = editForm.warrantyPolicies.filter((_, i) => i !== idx);
                            setEditForm({ ...editForm, warrantyPolicies: copy });
                          }}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, warrantyPolicies: [...editForm.warrantyPolicies, ''] })}
                      className="text-[11px] text-cyan-400 font-bold hover:underline flex items-center space-x-1 pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Thêm dòng chính sách</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Lời cảm ơn chân trang (Footer)</label>
                  <input
                    type="text"
                    value={editForm.footerNote}
                    onChange={(e) => setEditForm({ ...editForm, footerNote: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center space-x-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleResetSettings}
                    className="py-2.5 px-3 bg-slate-800 text-rose-300 border border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Mặc Định
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition"
                  >
                    Lưu Mẫu In Này
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
