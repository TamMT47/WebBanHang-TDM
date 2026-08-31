'use client';

import React, { useState } from 'react';
import { X, Search, ShieldCheck, ShieldAlert, Smartphone, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { formatVND } from '@/lib/format';

interface WarrantyLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WarrantyLookupModal({ isOpen, onClose }: WarrantyLookupModalProps) {
  const [searchKey, setSearchKey] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKey.trim()) return;

    try {
      setLoading(true);
      setSearched(true);
      const res = await fetch(`/api/orders?search=${encodeURIComponent(searchKey.trim())}&limit=20`);
      const data = await res.json();
      
      const foundItems: any[] = [];
      (data.orders || []).forEach((order: any) => {
        (order.items || []).forEach((item: any) => {
          if (
            !searchKey ||
            (item.imei && item.imei.toLowerCase().includes(searchKey.toLowerCase())) ||
            (order.partner_phone && order.partner_phone.includes(searchKey)) ||
            (order.partner_name && order.partner_name.toLowerCase().includes(searchKey.toLowerCase())) ||
            (order.code && order.code.toLowerCase().includes(searchKey.toLowerCase()))
          ) {
            foundItems.push({
              order_code: order.code,
              order_date: order.created_at,
              partner_name: order.partner_name,
              partner_phone: order.partner_phone,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold">Tra Cứu Thông Tin & Bảo Hành IMEI</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Nhập mã IMEI, Số điện thoại khách hoặc Mã đơn..."
                className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-xs font-black rounded-xl shadow-glow-cyan transition badge-nowrap"
            >
              {loading ? 'Đang tìm...' : 'Tra cứu'}
            </button>
          </form>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="text-center py-10 text-xs text-slate-400 animate-pulse">
              Đang kiểm tra dữ liệu bảo hành...
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-10">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">Không tìm thấy thông tin bảo hành</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vui lòng kiểm tra lại mã IMEI hoặc số điện thoại đã mua hàng tại TD Mobile Store.
              </p>
            </div>
          )}

          {!loading &&
            results.map((item, idx) => {
              const active = isWarrantyValid(item.warranty_until);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-black text-sm text-white">{item.product_name}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        Mã IMEI: <span className="font-bold text-cyan-300">{item.imei}</span>
                      </div>
                    </div>
                    {active ? (
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full flex items-center space-x-1 badge-nowrap">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>CÒN BẢO HÀNH</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold rounded-full badge-nowrap">
                        HẾT HẠN BẢO HÀNH
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 badge-nowrap">Khách hàng: </span>
                      <span className="font-semibold text-white">{item.partner_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 badge-nowrap">Số ĐT: </span>
                      <span className="font-mono text-slate-300 badge-nowrap">{item.partner_phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 badge-nowrap">Ngày mua: </span>
                      <span className="text-slate-300 badge-nowrap">{new Date(item.order_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 badge-nowrap">Hạn bảo hành: </span>
                      <span className={`font-bold badge-nowrap ${active ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {item.warranty_until
                          ? new Date(item.warranty_until).toLocaleDateString('vi-VN')
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 badge-nowrap">Thời hạn gói: </span>
                      <span className="font-bold text-slate-200 badge-nowrap">{item.warranty_months} tháng</span>
                    </div>
                    <div>
                      <span className="text-slate-500 badge-nowrap">Mã hóa đơn: </span>
                      <span className="font-bold text-cyan-400 font-mono badge-nowrap">#{item.order_code}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
