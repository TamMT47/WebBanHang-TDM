'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Camera,
  Smartphone,
  Calendar,
  Phone,
  User,
  CheckCircle2,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import ScannerModal from '@/components/ScannerModal';
import InvoiceModal from '@/components/InvoiceModal';

interface WarrantyViewProps {
  user: any;
}

export default function WarrantyView({ user }: WarrantyViewProps) {
  const [searchKey, setSearchKey] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Selected Order for re-print
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const handleSearch = async (query?: string) => {
    const term = query !== undefined ? query : searchKey;
    if (!term.trim()) return;

    try {
      setLoading(true);
      setSearched(true);
      const res = await fetch(`/api/orders?search=${encodeURIComponent(term.trim())}&limit=30`);
      const data = await res.json();

      const foundItems: any[] = [];
      (data.orders || []).forEach((order: any) => {
        (order.items || []).forEach((item: any) => {
          if (
            !term ||
            (item.imei && item.imei.toLowerCase().includes(term.toLowerCase())) ||
            (order.partner_phone && order.partner_phone.includes(term)) ||
            (order.partner_name && order.partner_name.toLowerCase().includes(term.toLowerCase())) ||
            (order.code && order.code.toLowerCase().includes(term.toLowerCase()))
          ) {
            foundItems.push({
              order_id: order.id,
              order_code: order.code,
              order_date: order.created_at,
              partner_name: order.partner_name,
              partner_phone: order.partner_phone,
              partner_address: order.partner_address,
              creator_name: order.creator_name,
              total_amount: order.total_amount,
              final_payment: order.final_payment,
              paid_amount: order.paid_amount,
              debt_added: order.debt_added,
              payment_method: order.payment_method,
              raw_order: order,
              ...item,
            });
          }
        });
      });

      setResults(foundItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isWarrantyValid = (warrantyUntil?: string) => {
    if (!warrantyUntil) return false;
    return new Date(warrantyUntil) > new Date();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Tra Cứu Thông Tin & Bảo Hành Apple
            </h2>
            <p className="text-xs text-slate-400">
              Kiểm tra nhanh hạn bảo hành 1 đổi 1, lịch sử mua máy và thời hạn phần cứng theo IMEI hoặc Số điện thoại.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Nhập 15 số IMEI, Số điện thoại khách hoặc Mã đơn hàng #HD..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-2xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5 badge-nowrap"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Quét Camera</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-2xl text-xs font-black shadow-glow-cyan transition badge-nowrap"
          >
            {loading ? 'Đang tra...' : 'Tra Cứu'}
          </button>
        </form>
      </div>

      {/* Results Container */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-400 animate-pulse">
            Đang tra cứu cơ sở dữ liệu bảo hành TD MOBILE STORE...
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16 bg-slate-900/60 rounded-3xl border border-slate-800 p-6 space-y-2">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-slate-300">Không tìm thấy thông tin bảo hành</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              Không tìm thấy máy hoặc số điện thoại này trong hệ thống. Vui lòng kiểm tra lại 15 số IMEI hoặc số điện thoại đã mua hàng.
            </div>
          </div>
        )}

        {!loading &&
          results.map((item, idx) => {
            const active = isWarrantyValid(item.warranty_until);
            return (
              <div
                key={idx}
                className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl hover:border-slate-700 transition space-y-3"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-black text-white">{item.product_name}</h3>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold rounded-lg badge-nowrap">
                        {item.condition || '99%'}
                      </span>
                      {item.battery_health && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-lg badge-nowrap">
                          🔋 {item.battery_health}%
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-400 mt-1">
                      MÃ IMEI: <span className="bg-slate-950 px-2 py-0.5 rounded text-cyan-300 font-extrabold border border-slate-800">{item.imei}</span>
                    </div>
                  </div>

                  {active ? (
                    <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black rounded-xl flex items-center space-x-1.5 self-start sm:self-auto shadow-sm badge-nowrap">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>CÒN BẢO HÀNH CHÍNH HÃNG</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl self-start sm:self-auto badge-nowrap">
                      ĐÃ HẾT HẠN BẢO HÀNH
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold badge-nowrap">Khách Hàng</span>
                    <span className="font-bold text-white">{item.partner_name || 'Khách lẻ'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold badge-nowrap">Số Điện Thoại</span>
                    <span className="font-mono font-bold text-slate-300 badge-nowrap">{item.partner_phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold badge-nowrap">Ngày Mua Máy</span>
                    <span className="font-semibold text-slate-300 badge-nowrap">
                      {new Date(item.order_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold badge-nowrap">Hạn Bảo Hành Đến</span>
                    <span className={`font-black badge-nowrap ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {item.warranty_until
                        ? new Date(item.warranty_until).toLocaleDateString('vi-VN')
                        : '12 Tháng'}
                    </span>
                  </div>
                </div>

                {/* Footer Bar with Invoice Re-print */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    Hóa đơn bán hàng: <span className="font-bold text-cyan-400 font-mono">#{item.order_code}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedOrder(item.raw_order);
                      setIsInvoiceOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition badge-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>In Phiếu Bảo Hành</span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setSearchKey(code);
          handleSearch(code);
        }}
        title="Quét IMEI Tra Cứu Bảo Hành"
      />

      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        initialDocType="warranty"
      />
    </div>
  );
}
