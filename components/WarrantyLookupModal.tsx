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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">Tra Cứu Thông Tin & Bảo Hành IMEI</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Nhập mã IMEI, Số điện thoại khách hoặc Mã đơn..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
            >
              {loading ? 'Đang tìm...' : 'Tra cứu'}
            </button>
          </form>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="text-center py-10 text-xs text-gray-500">
              Đang kiểm tra dữ liệu bảo hành...
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-10">
              <ShieldAlert className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-700">Không tìm thấy thông tin bảo hành</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
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
                  className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-gray-300 transition space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{item.product_name}</div>
                      <div className="text-xs font-mono text-gray-600 mt-0.5">
                        Mã IMEI: <span className="font-bold text-gray-900">{item.imei}</span>
                      </div>
                    </div>
                    {active ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>CÒN BẢO HÀNH</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 border border-red-300 text-[10px] font-bold rounded-full">
                        HẾT HẠN BẢO HÀNH
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-gray-500">Khách hàng: </span>
                      <span className="font-semibold text-gray-800">{item.partner_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Số ĐT: </span>
                      <span className="font-mono">{item.partner_phone}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ngày mua: </span>
                      <span>{new Date(item.order_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Hạn bảo hành: </span>
                      <span className="font-bold text-gray-900">
                        {item.warranty_until
                          ? new Date(item.warranty_until).toLocaleDateString('vi-VN')
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Thời hạn gói: </span>
                      <span className="font-bold">{item.warranty_months} tháng</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Mã hóa đơn: </span>
                      <span className="font-bold text-blue-700">#{item.order_code}</span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
