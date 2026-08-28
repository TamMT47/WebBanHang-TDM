'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { formatVND } from '@/lib/format';

interface ReportsViewProps {
  user: any;
}

export default function ReportsView({ user }: ReportsViewProps) {
  const [range, setRange] = useState('today');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?range=${range}`);
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [range]);

  const ranges = [
    { id: 'today', label: 'Hôm Nay' },
    { id: 'yesterday', label: 'Hôm Qua' },
    { id: 'this_week', label: '7 Ngày Qua' },
    { id: 'this_month', label: 'Tháng Này' },
    { id: 'all', label: 'Toàn Bộ Thời Gian' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-gray-950 text-white rounded-xl">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
              Báo Cáo Doanh Thu & Lợi Nhuận
            </h2>
            <p className="text-xs text-gray-500">
              Phân tích hiệu quả kinh doanh, lợi nhuận gộp theo từng ngày và mẫu máy bán chạy.
            </p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                range === r.id
                  ? 'bg-gray-950 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 text-xs text-gray-400">
          Đang tính toán dữ liệu báo cáo kinh doanh...
        </div>
      ) : !reportData ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 text-xs text-gray-500">
          Không có dữ liệu báo cáo trong khoảng thời gian này.
        </div>
      ) : (
        <div className="space-y-4">
          {/* 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tổng Doanh Thu
                </span>
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-950 font-mono">
                {formatVND(reportData.kpis?.total_revenue || 0)}
              </div>
              <div className="text-[11px] text-gray-500">
                Đã trừ giảm giá & chiết khấu bán lẻ
              </div>
            </div>

            {/* Profit */}
            <div className="bg-white p-5 rounded-2xl border-2 border-gray-950 shadow-md space-y-1 bg-gradient-to-br from-white to-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Lợi Nhuận Gộp
                </span>
                <div className="p-2 bg-purple-900 text-white rounded-xl shadow-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-900 font-mono">
                {formatVND(reportData.kpis?.gross_profit || 0)}
              </div>
              <div className="text-[11px] text-gray-600 font-semibold">
                = Doanh thu bán ra - Giá vốn nhập kho
              </div>
            </div>

            {/* Orders & Trade-in */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Số Đơn Bán Ra
                </span>
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-gray-950 font-mono">
                {reportData.kpis?.total_orders || 0} <span className="text-sm font-bold text-gray-500">đơn hàng</span>
              </div>
              <div className="text-[11px] text-amber-800 font-semibold">
                🔄 Tổng giá trị thu cũ: {formatVND(reportData.kpis?.total_trade_in || 0)}
              </div>
            </div>
          </div>

          {/* Daily Breakdown & Top Products Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Daily History Table (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-3">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Doanh Thu & Lợi Nhuận Theo Ngày
              </h3>

              {(!reportData.daily || reportData.daily.length === 0) ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Chưa phát sinh giao dịch trong kỳ này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Ngày</th>
                        <th className="py-2.5 px-3">Số Đơn</th>
                        <th className="py-2.5 px-3 text-right">Doanh Thu</th>
                        <th className="py-2.5 px-3 text-right">Lợi Nhuận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData.daily.map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-bold text-gray-900 font-mono">
                            {new Date(d.sale_date).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {d.order_count} đơn
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-gray-950 font-mono">
                            {formatVND(d.revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-purple-900 font-mono">
                            {formatVND(d.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Products (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-3">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Mẫu Máy Bán Chạy Nhất
              </h3>

              {(!reportData.top_products || reportData.top_products.length === 0) ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  Chưa có số liệu sản phẩm bán chạy.
                </div>
              ) : (
                <div className="space-y-2">
                  {reportData.top_products.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded-lg bg-gray-900 text-white font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-950">{p.product_name}</div>
                          <div className="text-[10px] text-gray-500 uppercase">{p.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-800">
                          {p.quantity_sold} máy
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 font-bold">
                          {formatVND(p.total_sales)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
