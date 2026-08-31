'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle2, Phone, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { formatVND } from '@/lib/format';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function InvoiceModal({ isOpen, onClose, order }: InvoiceModalProps) {
  const [printFormat, setPrintFormat] = useState<'a4' | 'k80'>('a4');

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
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
            <Printer className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-extrabold tracking-wide">
              HÓA ĐƠN & PHIẾU BẢO HÀNH #{order.code}
            </h3>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Format Toggle */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1.5 rounded-xl font-bold transition badge-nowrap ${
                  printFormat === 'a4'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📄 Khổ Giấy A4 Chuẩn
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('k80')}
                className={`px-3 py-1.5 rounded-xl font-bold transition badge-nowrap ${
                  printFormat === 'k80'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🧾 Bill Nhiệt K80
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition badge-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>In Hóa Đơn</span>
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
                {/* 1. Header Cửa Hàng Chuẩn */}
                <div className="flex items-start justify-between pb-6 border-b-2 border-gray-900">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gray-950 text-white flex items-center justify-center font-black text-xl tracking-tighter">
                        TD
                      </div>
                      <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">
                          TD MOBILE STORE
                        </h1>
                        <p className="text-xs font-bold text-gray-700 italic tracking-wide">
                          Giá tốt - Dịch vụ đỉnh cao
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span><b>Địa chỉ:</b> 06 Nguyễn Trãi, Phường Gò Công, Đồng Tháp</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <span><b>Hotline / Zalo:</b> <span className="font-bold text-gray-950 font-mono">0364848960</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Mã Đơn & Ngày Giờ */}
                  <div className="text-right space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">
                      Mã Hóa Đơn
                    </div>
                    <div className="text-lg font-black text-gray-950 font-mono">
                      #{order.code}
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {orderDate}
                    </div>
                  </div>
                </div>

                {/* Tiêu đề hóa đơn */}
                <div className="text-center my-6">
                  <h2 className="text-xl font-black tracking-wider text-gray-950 uppercase">
                    HÓA ĐƠN BÁN HÀNG & PHIẾU BẢO HÀNH
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    (Kiêm phiếu bàn giao thiết bị & cam kết chất lượng chính hãng)
                  </p>
                </div>

                {/* 2. Thông Tin Khách Hàng */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium">Khách hàng: </span>
                    <span className="font-bold text-gray-950 text-sm">{order.partner_name || 'Khách lẻ'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Số điện thoại: </span>
                    <span className="font-bold text-gray-950 font-mono text-sm">{order.partner_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Địa chỉ: </span>
                    <span className="text-gray-800">{order.partner_address || 'Tại cửa hàng'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Số CCCD / CMND: </span>
                    <span className="font-mono text-gray-800">{order.partner_cccd || 'N/A'}</span>
                  </div>
                  {order.creator_name && (
                    <div className="col-span-2 pt-1 border-t border-gray-200 text-gray-600">
                      <span>Nhân viên tư vấn & lập đơn: </span>
                      <span className="font-bold text-gray-900">{order.creator_name}</span>
                    </div>
                  )}
                </div>

                {/* 3. Bảng Sản Phẩm Mua */}
                <div className="mb-6 overflow-hidden rounded-xl border border-gray-300">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-900 text-white font-bold uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3">Tên Sản Phẩm & Quy Cách</th>
                        <th className="py-2.5 px-3">Mã IMEI / Serial</th>
                        <th className="py-2.5 px-3 text-center">Tình Trạng / Pin</th>
                        <th className="py-2.5 px-3 text-center">Bảo Hành</th>
                        <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {order.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60">
                          <td className="py-3 px-3 text-center font-bold text-gray-600">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-950 text-sm">
                              {item.product_name || item.name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {item.color && <span>Màu: {item.color} • </span>}
                              {item.storage && <span>Dung lượng: {item.storage}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-900 text-xs">
                            {item.imei || 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="font-semibold text-gray-800">{item.condition || '99%'}</div>
                            {item.battery_health && (
                              <div className="text-[10px] text-emerald-700 font-bold">🔋 {item.battery_health}%</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-gray-900">
                            {item.warranty_months || 12} Tháng
                          </td>
                          <td className="py-3 px-3 text-right font-black text-sm text-gray-950 font-mono">
                            {formatVND(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. Mục Thu Cũ Đổi Mới (Trade-in) nếu có */}
                {order.trade_in_value > 0 && (
                  <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                      <span className="uppercase tracking-wider">🔄 MÁY THU CŨ ĐỔI MỚI (TRADE-IN)</span>
                      <span className="text-sm font-black text-amber-900 font-mono">
                        -{formatVND(order.trade_in_value)}
                      </span>
                    </div>
                    {order.trade_in_item && (
                      <div className="text-xs text-gray-700 font-medium flex items-center justify-between">
                        <span>Máy thu: <b>{order.trade_in_item.name}</b> (IMEI: <span className="font-mono">{order.trade_in_item.imei}</span>)</span>
                        {order.trade_in_item.battery_health && (
                          <span className="text-emerald-800 text-[11px] font-bold">Pin: {order.trade_in_item.battery_health}%</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Tổng Kết Thanh Toán */}
                <div className="flex justify-end mb-6">
                  <div className="w-full max-w-sm space-y-2 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex justify-between text-gray-600">
                      <span>Tổng tiền hàng:</span>
                      <span className="font-bold text-gray-950 font-mono">{formatVND(order.total_amount)}</span>
                    </div>

                    {order.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Chiết khấu / Giảm giá:</span>
                        <span className="font-mono">-{formatVND(order.discount)}</span>
                      </div>
                    )}

                    {order.trade_in_value > 0 && (
                      <div className="flex justify-between text-amber-800 font-semibold">
                        <span>Trừ máy thu cũ (Trade-in):</span>
                        <span className="font-mono">-{formatVND(order.trade_in_value)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-300">
                      <span>TỔNG CẦN THANH TOÁN:</span>
                      <span className="font-mono text-lg">{formatVND(order.final_payment)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-gray-800 pt-1">
                      <span>Khách đã thanh toán ({order.payment_method === 'cash' ? 'Tiền mặt' : order.payment_method === 'transfer' ? 'Chuyển khoản' : 'Kết hợp'}):</span>
                      <span className="text-emerald-700 font-mono">{formatVND(order.paid_amount)}</span>
                    </div>

                    {changeReturned > 0 && (
                      <div className="flex justify-between font-extrabold text-blue-700 pt-1 bg-blue-50/80 p-2 rounded-lg border border-blue-200">
                        <span>Tiền thối lại cho khách:</span>
                        <span className="font-mono">{formatVND(changeReturned)}</span>
                      </div>
                    )}

                    {order.debt_added > 0 && (
                      <div className="flex justify-between font-extrabold text-red-600 pt-1 bg-red-50 p-2 rounded-lg border border-red-200">
                        <span>Số tiền còn nợ cửa hàng:</span>
                        <span className="font-mono">+{formatVND(order.debt_added)}</span>
                      </div>
                    )}

                    {order.debt_added < 0 && (
                      <div className="flex justify-between font-extrabold text-emerald-700 pt-1 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <span>Số tiền trừ vào nợ / trả thừa:</span>
                        <span className="font-mono">-{formatVND(Math.abs(order.debt_added))}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. Chính Sách Bảo Hành & Cam Kết */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-600 space-y-1 mb-8">
                  <div className="font-bold text-gray-900 uppercase text-[11px] mb-1">
                    🛡️ CHÍNH SÁCH BẢO HÀNH & ĐỔI TRẢ TD MOBILE STORE:
                  </div>
                  <div>• <b>Bao test 30 ngày 1 đổi 1</b> nếu phát sinh lỗi từ nhà sản xuất (nguồn, màn hình cảm ứng, mainboard).</div>
                  <div>• Bảo hành phần cứng toàn diện theo gói ghi trên hóa đơn. Hỗ trợ phần mềm, vệ sinh máy trọn đời.</div>
                  <div>• Không bảo hành trong các trường hợp: Rơi vỡ cấn móp, ngấm nước, chập cháy do nguồn điện không ổn định, mất tem niêm phong.</div>
                  <div>• Quý khách vui lòng giữ hóa đơn hoặc cung cấp số điện thoại/IMEI khi đến bảo hành tại cửa hàng.</div>
                </div>
              </div>

              {/* 7. Chữ Ký 2 Bên */}
              <div className="pt-4 border-t border-gray-300 grid grid-cols-2 text-center text-xs">
                <div className="space-y-1">
                  <div className="font-extrabold text-gray-950 uppercase">KHÁCH HÀNG</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên và xác nhận nhận đủ máy)</div>
                  <div className="h-20 flex items-end justify-center font-bold text-gray-800">
                    {order.partner_name}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-gray-950 uppercase">ĐẠI DIỆN CỬA HÀNG TD MOBILE STORE</div>
                  <div className="text-[10px] text-gray-500 italic">(Ký và đóng dấu)</div>
                  <div className="h-20 flex items-end justify-center font-bold text-gray-800">
                    {order.creator_name || 'TD Mobile Store'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* K80 THERMAL BILL FORMAT */
            <div
              id="printable-receipt"
              className="w-full max-w-[360px] bg-white p-6 shadow-sm border border-gray-200 text-gray-900 font-mono text-xs rounded-xl"
            >
              <div className="text-center pb-3 border-b border-dashed border-gray-300">
                <div className="text-base font-black tracking-tight uppercase">TD MOBILE STORE</div>
                <div className="text-[10px] text-gray-600 font-medium">Giá tốt - Dịch vụ đỉnh cao</div>
                <div className="text-[10px] text-gray-500 mt-1">06 Nguyễn Trãi, P. Gò Công, Đồng Tháp</div>
                <div className="text-[10px] text-gray-600 font-bold">Hotline: 0364848960</div>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-xs">
                <div className="text-center font-bold uppercase my-1">HÓA ĐƠN BÁN HÀNG</div>
                <div className="flex justify-between"><span>Mã đơn:</span><span className="font-bold">#{order.code}</span></div>
                <div className="flex justify-between"><span>Thời gian:</span><span>{orderDate}</span></div>
                <div className="flex justify-between"><span>Khách hàng:</span><span className="font-bold">{order.partner_name || 'Khách lẻ'}</span></div>
                {order.partner_phone && <div className="flex justify-between"><span>SĐT:</span><span>{order.partner_phone}</span></div>}
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-bold">{item.product_name || item.name}</div>
                      <div className="text-[10px] text-gray-500">IMEI: {item.imei}</div>
                      <div className="text-[10px] text-emerald-800">BH: {item.warranty_months || 12}T</div>
                    </div>
                    <div className="text-right font-bold">{formatVND(item.price)}</div>
                  </div>
                ))}
              </div>

              {order.trade_in_value > 0 && (
                <div className="py-2 border-b border-dashed border-gray-300 text-xs">
                  <div className="flex justify-between font-bold text-amber-900">
                    <span>Trừ máy thu cũ:</span>
                    <span>-{formatVND(order.trade_in_value)}</span>
                  </div>
                </div>
              )}

              <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-xs">
                <div className="flex justify-between"><span>Tổng hàng:</span><span>{formatVND(order.total_amount)}</span></div>
                {order.discount > 0 && <div className="flex justify-between"><span>Giảm giá:</span><span>-{formatVND(order.discount)}</span></div>}
                <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-gray-200">
                  <span>Khách cần trả:</span>
                  <span>{formatVND(order.final_payment)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Đã thanh toán:</span>
                  <span>{formatVND(order.paid_amount)}</span>
                </div>
                {changeReturned > 0 && (
                  <div className="flex justify-between font-bold text-blue-700">
                    <span>Thối lại:</span>
                    <span>{formatVND(changeReturned)}</span>
                  </div>
                )}
                {order.debt_added > 0 && (
                  <div className="flex justify-between font-bold text-red-600">
                    <span>Còn nợ:</span>
                    <span>+{formatVND(order.debt_added)}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 text-center text-[10px] text-gray-500 space-y-1">
                <div>Bao test 30 ngày 1 đổi 1. Bảo hành chính hãng.</div>
                <div className="font-bold text-xs text-gray-800 mt-1">CẢM ƠN QUÝ KHÁCH VÀ HẸN GẶP LẠI! ❤️</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Hidden on Print) */}
        <div className="no-print p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-xs font-black shadow-glow-cyan transition badge-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>In Hóa Đơn Ngay ({printFormat === 'a4' ? 'Khổ A4' : 'K80'})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
