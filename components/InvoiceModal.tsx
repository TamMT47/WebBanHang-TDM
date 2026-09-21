'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Phone,
  MapPin,
  ShieldCheck,
  Sparkles,
  Settings,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Wifi,
  Loader2,
  AlertCircle,
  PlayCircle,
  Globe
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import {
  getInvoiceSettings,
  saveInvoiceSettings,
  InvoiceSettings,
  DEFAULT_INVOICE_SETTINGS
} from '@/lib/invoiceSettings';
import { printToLanPrinter, testLanPrinter } from '@/lib/printerHelper';

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

export default function InvoiceModal({
  isOpen,
  onClose,
  order,
  initialDocType = 'invoice'
}: InvoiceModalProps) {
  const [docType, setDocType] = useState<'invoice' | 'warranty'>(initialDocType);
  const [printFormat, setPrintFormat] = useState<'a4' | 'k80'>('k80');
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);
  const [editForm, setEditForm] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);

  // Printing state
  const [isPrintingLan, setIsPrintingLan] = useState(false);
  const [isTestingLan, setIsTestingLan] = useState(false);
  const [printNotice, setPrintNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDocType(initialDocType || 'invoice');
      const current = getInvoiceSettings();
      setSettings(current);
      setEditForm(current);
      if (current.paperSize) {
        setPrintFormat(current.paperSize === 'a4' ? 'a4' : 'k80');
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isEditSettingsOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initialDocType, isEditSettingsOpen, onClose]);

  if (!isOpen || !order) return null;

  const showToast = (text: string, isError = false) => {
    setPrintNotice({ text, isError });
    setTimeout(() => setPrintNotice(null), 4500);
  };

  /**
   * Pure Silent Direct Print: Sends ESC/POS binary directly to LAN IP (192.168.1.133:9100).
   * Completely bypasses window.print() and blocks iOS AirPrint popup.
   */
  const handleDirectLanPrint = async () => {
    if (!order) return;
    setIsPrintingLan(true);
    setPrintNotice({ text: `Đang gửi lệnh in trực tiếp tới máy in ${settings.printerIp}...` });

    try {
      const res = await printToLanPrinter(order, docType, {
        customSettings: settings,
      });

      if (res.success) {
        showToast(res.message || `🟢 Đã gửi lệnh in thành công tới máy in Xprinter (${settings.printerIp})`);
      } else {
        showToast(res.error || `🔴 Không kết nối được máy in LAN (${settings.printerIp})`, true);
      }
    } catch (err: any) {
      showToast(`🔴 Không kết nối được máy in LAN (${settings.printerIp}:${settings.printerPort})`, true);
    } finally {
      setIsPrintingLan(false);
    }
  };

  /**
   * Test Connection inside Settings Modal
   */
  const handleTestLanConnection = async () => {
    setIsTestingLan(true);
    try {
      const res = await testLanPrinter(editForm.printerIp, editForm.printerPort, editForm);
      if (res.success) {
        showToast(res.message || `Đã gửi mẫu test thành công tới ${editForm.printerIp}:${editForm.printerPort}!`);
      } else {
        showToast(res.error || `Không kết nối được máy in LAN (${editForm.printerIp}:${editForm.printerPort})`, true);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kiểm tra kết nối', true);
    } finally {
      setIsTestingLan(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveInvoiceSettings(editForm);
    setSettings(updated);
    if (updated.paperSize) {
      setPrintFormat(updated.paperSize === 'a4' ? 'a4' : 'k80');
    }
    setIsEditSettingsOpen(false);
    showToast('Đã lưu cấu hình mẫu in & máy in thành công!');
  };

  const handleResetSettings = () => {
    if (confirm('Khôi phục mẫu in và máy in về thiết lập mặc định của TD Mobile Store?')) {
      const reset = saveInvoiceSettings(DEFAULT_INVOICE_SETTINGS);
      setSettings(reset);
      setEditForm(reset);
      if (reset.paperSize) {
        setPrintFormat(reset.paperSize === 'a4' ? 'a4' : 'k80');
      }
      setIsEditSettingsOpen(false);
      showToast('Đã khôi phục thiết lập về mặc định!');
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

  // VietQR Image URL for on-screen & web printing
  const vietQrImgUrl = `https://img.vietqr.io/image/MB-${settings.bankAccount || '0364848960'}-compact2.png?amount=${order.final_payment || 0}&addInfo=TT%20DON%20${order.code}&accountName=TRUONG%20MINH%20TAM`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Toast Notice */}
      {printNotice && (
        <div
          className={`fixed top-4 right-4 z-70 px-4 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center space-x-2.5 animate-in slide-in-from-top border ${
            printNotice.isError
              ? 'bg-rose-500 text-white border-rose-400 shadow-glow-rose'
              : 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-glow-emerald'
          }`}
        >
          {printNotice.isError ? (
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-slate-950 flex-shrink-0" />
          )}
          <span>{printNotice.text}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh]">
        
        {/* Modal Header Bar (Hidden during Print) */}
        <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            {docType === 'warranty' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <Printer className="w-5 h-5 text-cyan-400" />
            )}
            <div>
              <h3 className="text-sm font-extrabold tracking-wide">
                {docType === 'warranty' ? 'PHIẾU BẢO HÀNH CHÍNH HÃNG' : 'HÓA ĐƠN BÁN HÀNG'} #{order.code}
              </h3>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{settings.printerConnectionMode === 'tunnel' ? 'Cloudflare Tunnel:' : 'Máy in LAN:'}</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {settings.printerConnectionMode === 'tunnel'
                    ? (settings.printerTunnelUrl ? settings.printerTunnelUrl.replace('https://', '').split('.')[0] + '...' : 'Tunnel Active')
                    : `${settings.printerIp || '192.168.1.133'}:9100`}
                </span>
              </div>
            </div>
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
              <span>Cấu Hình Máy In</span>
            </button>

            {/* Format Toggle */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
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
            </div>

            {/* DIRECT SILENT LAN PRINT */}
            <button
              onClick={handleDirectLanPrint}
              disabled={isPrintingLan}
              title={`In trực tiếp qua máy in LAN (${settings.printerIp}:9100) - Không mở popup AirPrint`}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black transition badge-nowrap active:scale-95 disabled:opacity-50 ${
                docType === 'warranty'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-glow-emerald'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan'
              }`}
            >
              {isPrintingLan ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Printer className="w-4 h-4 text-slate-950" />
              )}
              <span>{docType === 'warranty' ? 'In Phiếu Bảo Hành' : 'In Hóa Đơn'}</span>
            </button>

            <button
              onClick={onClose}
              title="Đóng (ESC)"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition border border-transparent hover:border-slate-700"
            >
              <X className="w-5 h-5 text-slate-300 hover:text-rose-400" />
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
                {/* 1. Header */}
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

                {/* 2. Customer Details */}
                <div className="py-4 border-b border-gray-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Khách hàng:</span>
                    <p className="font-black text-sm text-gray-950">{order.partner_name || 'Khách lẻ'}</p>
                    <p className="text-gray-600">SĐT: <span className="font-bold text-gray-950 font-sans">{order.partner_phone || '---'}</span></p>
                    {order.partner_address && <p className="text-gray-600">Đ/C: {order.partner_address}</p>}
                    {order.partner_cccd && <p className="text-gray-600">CCCD: <span className="font-mono font-bold">{order.partner_cccd}</span></p>}
                  </div>

                  <div className="text-right">
                    <span className="text-gray-500">Nhân viên phụ trách:</span>
                    <p className="font-black text-sm text-gray-950">{order.creator_name || 'TD Mobile'}</p>
                    <p className="text-gray-600">Hình thức: <span className="font-bold uppercase text-gray-950">{order.payment_method}</span></p>
                    <p className="text-gray-600">Máy in nhiệt: <span className="font-mono font-bold text-cyan-800">{settings.printerIp}</span></p>
                  </div>
                </div>

                {/* 3. Items Table */}
                <div className="py-4">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-900 bg-gray-50 text-[11px] uppercase font-black text-gray-800">
                        <th className="py-2.5 px-2 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Tên Sản Phẩm / Quy Cách</th>
                        <th className="py-2.5 px-3">IMEI / Serial</th>
                        <th className="py-2.5 px-2 text-center">Bảo Hành</th>
                        <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-3 px-2 text-center font-bold text-gray-500">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-black text-gray-950 text-sm">
                              {item.product_name || item.name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {[item.storage, item.color, item.condition].filter(Boolean).join(' | ')}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-950">
                            {settings.showImei && item.imei ? item.imei : '---'}
                            {settings.showBatteryHealth && item.battery_health ? (
                              <span className="block text-[10px] text-emerald-700 font-sans">Pin: {item.battery_health}%</span>
                            ) : null}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-emerald-800">
                            {item.warranty_months ? `${item.warranty_months} Tháng` : 'Cam kết'}
                          </td>
                          <td className="py-3 px-3 text-right font-sans font-black text-sm text-gray-950">
                            {formatVND(item.price)}
                          </td>
                        </tr>
                      ))}

                      {/* Trade-in */}
                      {order.trade_in_item && (
                        <tr className="bg-amber-50/70 border-t border-amber-200">
                          <td className="py-3 px-2 text-center font-bold text-amber-700">★</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-black mr-2">
                              THU CŨ ĐỔI MỚI
                            </span>
                            <span className="font-bold text-amber-950">{order.trade_in_item.name}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-amber-900">
                            IMEI: {order.trade_in_item.imei || '---'}
                          </td>
                          <td className="py-3 px-2 text-center text-amber-800 font-bold">Thu vào</td>
                          <td className="py-3 px-3 text-right font-sans font-black text-sm text-amber-950">
                            -{formatVND(order.trade_in_item.value)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Payment Totals & QR Code */}
                <div className="pt-2 pb-6 border-t-2 border-gray-900 grid grid-cols-2 gap-6 items-start">
                  
                  {/* Bank Transfer QR Code */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center space-x-3.5">
                    <div className="w-24 h-24 bg-white p-1 rounded-xl border border-gray-300 flex items-center justify-center flex-shrink-0">
                      <img
                        src={vietQrImgUrl}
                        alt="VietQR Chuyển Khoản"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] space-y-1">
                      <p className="font-black text-gray-950 uppercase">Quét Mã QR Chuyển Khoản</p>
                      <p className="text-gray-600">Ngân hàng: <b>{settings.bankName}</b></p>
                      <p className="text-gray-600">STK: <b className="font-mono text-gray-950 font-bold">{settings.bankAccount}</b></p>
                      <p className="text-gray-600">Chủ TK: <b>{settings.bankAccountHolder}</b></p>
                      <p className="text-gray-500 text-[10px]">Nội dung: <b>TT DON {order.code}</b></p>
                    </div>
                  </div>

                  {/* Summary Numbers */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng:</span>
                      <span className="font-sans font-bold text-gray-950">{formatVND(order.total_amount)}</span>
                    </div>

                    {order.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Giảm giá / Ưu đãi:</span>
                        <span className="font-sans font-bold">-{formatVND(order.discount)}</span>
                      </div>
                    )}

                    {order.trade_in_value > 0 && (
                      <div className="flex justify-between text-amber-800">
                        <span>Trừ thu cũ đổi mới:</span>
                        <span className="font-sans font-bold">-{formatVND(order.trade_in_value)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-gray-300 text-base font-black text-gray-950">
                      <span>KHÁCH PHẢI TRẢ:</span>
                      <span className="font-sans text-cyan-800 text-lg">{formatVND(order.final_payment)}</span>
                    </div>

                    <div className="flex justify-between text-gray-600 pt-1">
                      <span>Tiền khách đã trả:</span>
                      <span className="font-sans font-bold text-emerald-800">{formatVND(order.paid_amount)}</span>
                    </div>

                    {order.debt_added > 0 ? (
                      <div className="flex justify-between text-rose-600 font-black">
                        <span>GHI NỢ CÒN LẠI:</span>
                        <span className="font-sans">+{formatVND(order.debt_added)}</span>
                      </div>
                    ) : changeReturned > 0 ? (
                      <div className="flex justify-between text-blue-700">
                        <span>Tiền thối lại khách:</span>
                        <span className="font-sans font-bold">{formatVND(changeReturned)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 5. Warranty Terms & Footer */}
                {settings.showWarrantyTerms && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-700 space-y-1">
                    <p className="font-bold text-gray-950 uppercase">Chính Sách & Cam Kết Bảo Hành TD Mobile Store:</p>
                    {settings.warrantyPolicies?.map((policy, pIdx) => (
                      <p key={pIdx} className="leading-relaxed">• {policy}</p>
                    ))}
                    <p className="text-[10px] text-gray-500 italic pt-1 text-center border-t border-gray-200 mt-2">
                      {settings.footerNote}
                    </p>
                  </div>
                )}
              </div>

              {/* 6. Signatures */}
              <div className="grid grid-cols-2 gap-4 text-center text-xs text-gray-800 pt-6 border-t border-gray-300">
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
              className="w-full max-w-[360px] bg-white p-5 shadow-lg border border-gray-300 text-gray-900 font-sans text-xs rounded-xl"
            >
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
                <div className="font-black text-lg uppercase text-gray-950">{settings.shopName}</div>
                <div className="text-[10px] text-gray-600">{settings.shopAddress}</div>
                <div className="text-[10px] font-bold text-gray-800">
                  Hotline: {settings.shopHotline} {settings.warrantyHotline ? `• BH: ${settings.warrantyHotline}` : ''}
                </div>
                <div className="text-xs font-black text-gray-950 pt-2 uppercase">
                  {docType === 'warranty' ? 'PHIẾU BẢO HÀNH ĐIỆN TỬ' : 'HÓA ĐƠN THANH TOÁN'}
                </div>
                <div className="text-[10px] text-gray-500">#{order.code} • {orderDate}</div>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
                <div><b>Khách:</b> {order.partner_name || 'Khách lẻ'} ({order.partner_phone || '---'})</div>
                <div><b>{docType === 'warranty' ? 'Kỹ thuật:' : 'Thu ngân:'}</b> {order.creator_name || 'Admin'}</div>
              </div>

              {/* Items */}
              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-black text-gray-950 flex justify-between">
                      <span>{idx + 1}. {item.product_name || item.name}</span>
                      <span className="font-sans font-bold">{formatVND(item.price)}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-sans pl-3">
                      {[item.storage, item.color, item.condition].filter(Boolean).join(' | ')}
                      {settings.showImei && item.imei ? ` • IMEI: ${item.imei}` : ''}
                      {settings.showBatteryHealth && item.battery_health ? ` • Pin ${item.battery_health}%` : ''}
                      {` • BH: ${item.warranty_months || 12}T`}
                    </div>
                  </div>
                ))}

                {order.trade_in_item && (
                  <div className="pt-1.5 border-t border-dashed border-gray-300">
                    <div className="font-bold text-amber-900 flex justify-between">
                      <span>★ Thu cũ: {order.trade_in_item.name}</span>
                      <span className="font-sans">-{formatVND(order.trade_in_item.value)}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 pl-3">
                      IMEI: {order.trade_in_item.imei || '---'}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-bold font-sans">{formatVND(order.total_amount)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Giảm giá:</span>
                    <span className="font-sans font-bold">-{formatVND(order.discount)}</span>
                  </div>
                )}
                {order.trade_in_value > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>Trừ thu cũ:</span>
                    <span className="font-sans font-bold">-{formatVND(order.trade_in_value)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm pt-1 border-t border-dashed border-gray-300">
                  <span>THANH TOÁN:</span>
                  <span className="font-sans text-cyan-900 text-base">{formatVND(order.final_payment)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>Khách đưa:</span>
                  <span className="font-sans font-bold text-emerald-800">{formatVND(order.paid_amount)}</span>
                </div>
                {changeReturned > 0 && (
                  <div className="flex justify-between text-[11px] text-blue-800 font-bold">
                    <span>Tiền thối lại:</span>
                    <span className="font-sans">{formatVND(changeReturned)}</span>
                  </div>
                )}
                {order.debt_added > 0 && (
                  <div className="flex justify-between text-[11px] text-rose-600 font-black">
                    <span>Ghi nợ:</span>
                    <span className="font-sans">+{formatVND(order.debt_added)}</span>
                  </div>
                )}
              </div>

              {/* VietQR in K80 */}
              <div className="py-3 text-center border-b border-dashed border-gray-400 space-y-1.5">
                <div className="text-[10px] font-bold text-gray-700 uppercase">Quét mã QR Chuyển Khoản:</div>
                <div className="w-28 h-28 mx-auto bg-white p-1 border border-gray-300 rounded-lg flex items-center justify-center">
                  <img src={vietQrImgUrl} alt="VietQR" className="w-full h-full object-contain" />
                </div>
                <div className="text-[10px] text-gray-600">
                  {settings.bankName} - STK: <b className="font-mono">{settings.bankAccount}</b>
                </div>
              </div>

              {/* Warranty Policies */}
              <div className="text-center pt-2.5 space-y-1 text-[10px] text-gray-600">
                {settings.showWarrantyTerms && (
                  <div className="text-[9px] text-left border-b border-dashed border-gray-300 pb-2 space-y-0.5">
                    <div className="font-bold text-gray-800">Chính sách bảo hành:</div>
                    {settings.warrantyPolicies?.map((p, pi) => (
                      <div key={pi}>• {p}</div>
                    ))}
                  </div>
                )}
                <p className="font-bold text-gray-800 pt-1">{settings.footerNote}</p>
                <p className="text-[9px] text-gray-500">Quý khách vui lòng giữ hóa đơn để được phục vụ tốt nhất!</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar (Hidden during Print) */}
        <div className="no-print p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
          <div className="text-xs text-slate-400 hidden sm:flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Đơn hàng <b>#{order.code}</b> đã lưu thành công</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
            {/* DIRECT SILENT LAN PRINT BUTTON */}
            <button
              type="button"
              onClick={handleDirectLanPrint}
              disabled={isPrintingLan}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-black transition active:scale-95 disabled:opacity-50 ${
                docType === 'warranty'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-glow-emerald'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan'
              }`}
            >
              {isPrintingLan ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Đang In LAN...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>{docType === 'warranty' ? 'In Phiếu Bảo Hành (LAN)' : 'In Hóa Đơn (LAN)'}</span>
                </>
              )}
            </button>

            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-xl text-xs font-black transition shadow-lg active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Đóng / Bán Đơn Mới</span>
            </button>
          </div>
        </div>

        {/* Modal Customize Invoice Template & Printer Settings */}
        {isEditSettingsOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-black uppercase">Cấu Hình Mẫu In & Máy In LAN</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditSettingsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
                
                {/* LAN & CLOUDFLARE TUNNEL PRINTER SETTINGS BLOCK */}
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-cyan-500/40 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-black text-cyan-300 flex items-center space-x-1.5">
                      <Wifi className="w-4 h-4" />
                      <span>Cấu Hình Máy In (Xprinter XP-Q80BS)</span>
                    </span>
                    <button
                      type="button"
                      disabled={isTestingLan}
                      onClick={handleTestLanConnection}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] flex items-center space-x-1"
                    >
                      {isTestingLan ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <PlayCircle className="w-3 h-3" />
                      )}
                      <span>[In Thử Nghiệm]</span>
                    </button>
                  </div>

                  {/* Mode selector */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Phương thức kết nối:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, printerConnectionMode: 'tunnel' })}
                        className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold transition text-left ${
                          editForm.printerConnectionMode === 'tunnel'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        ⚡ Cloudflare Tunnel (Khuyên dùng)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, printerConnectionMode: 'lan' })}
                        className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold transition text-left ${
                          editForm.printerConnectionMode === 'lan'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        📶 Trực tiếp IP LAN
                      </button>
                    </div>
                  </div>

                  {/* Cloudflare Tunnel URL */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">Cloudflare Tunnel URL:</label>
                    <input
                      type="text"
                      value={editForm.printerTunnelUrl}
                      onChange={(e) => setEditForm({ ...editForm, printerTunnelUrl: e.target.value.trim() })}
                      placeholder="https://cet-step-perfectly-joseph.trycloudflare.com"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-cyan-300 font-mono text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">IP Máy in LAN:</label>
                      <input
                        type="text"
                        value={editForm.printerIp}
                        onChange={(e) => setEditForm({ ...editForm, printerIp: e.target.value.trim() })}
                        placeholder="192.168.1.133"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-cyan-300 font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">Port:</label>
                      <input
                        type="number"
                        value={editForm.printerPort}
                        onChange={(e) => setEditForm({ ...editForm, printerPort: parseInt(e.target.value, 10) || 9100 })}
                        placeholder="9100"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <label className="flex items-center space-x-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.printerAutoCut}
                        onChange={(e) => setEditForm({ ...editForm, printerAutoCut: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-cyan-500"
                      />
                      <span className="text-slate-300">Tự cắt giấy (GS V 0)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.printerOpenDrawer}
                        onChange={(e) => setEditForm({ ...editForm, printerOpenDrawer: e.target.checked })}
                        className="w-3.5 h-3.5 rounded text-cyan-500"
                      />
                      <span className="text-slate-300">Tự mở két tiền (DLE DC4)</span>
                    </label>
                  </div>
                </div>

                {/* STORE INFO BLOCK */}
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
                    <label className="block text-xs font-bold text-slate-300 mb-1">Hotline bảo hành *</label>
                    <input
                      type="text"
                      value={editForm.warrantyHotline}
                      onChange={(e) => setEditForm({ ...editForm, warrantyHotline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                      required
                    />
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
                      onClick={() => setEditForm({ ...editForm, paperSize: 'k80', printerPaperSize: 'k80' })}
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
                      onClick={() => setEditForm({ ...editForm, paperSize: 'a4', printerPaperSize: 'a4' })}
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
                    Lưu Cấu Hình
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
