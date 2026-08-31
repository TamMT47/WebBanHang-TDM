'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Coins,
  Smartphone,
  Flame,
  PieChart,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { formatProductTitle } from '@/lib/masterAttributes';

interface ReportsViewProps {
  user: any;
}

export default function ReportsView({ user }: ReportsViewProps) {
  const [range, setRange] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('range', range);
      if (range === 'custom' && dateFrom && dateTo) {
        params.append('dateFrom', dateFrom);
        params.append('dateTo', dateTo);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
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
  }, [range, dateFrom, dateTo]);

  const ranges = [
    { id: 'today', label: 'Hôm Nay' },
    { id: 'yesterday', label: 'Hôm Qua' },
    { id: 'this_week', label: '7 Ngày Qua' },
    { id: 'this_month', label: 'Tháng Này' },
    { id: 'all', label: 'Toàn Bộ Thời Gian' },
    { id: 'custom', label: 'Tùy Chọn Ngày' },
  ];

  const totalUnitsSold = useMemo(() => {
    if (!reportData?.model_series) return 0;
    return reportData.model_series.reduce((sum: number, s: any) => sum + s.quantity_sold, 0);
  }, [reportData]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      
      {/* 1. TOP HEADER CARD */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Báo Cáo Thống Kê & Phân Tích Doanh Thu
            </h2>
            <p className="text-xs text-slate-400">
              Phân tích số lượng máy bán ra theo dòng máy, danh sách Top bán chạy, lợi nhuận gộp và dòng tiền.
            </p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition badge-nowrap ${
                range === r.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-glow-cyan'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={fetchReports}
            title="Làm mới dữ liệu"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Custom Date Picker */}
      {range === 'custom' && (
        <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 rounded-3xl border border-slate-800 shadow-xl flex flex-wrap items-center gap-3 animate-in fade-in">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-xs font-bold text-slate-400 badge-nowrap">Từ ngày:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-xs font-bold text-slate-400 badge-nowrap">Đến ngày:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={fetchReports}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan badge-nowrap"
          >
            Lọc Dữ Liệu
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-400 animate-pulse">
          Đang tổng hợp báo cáo kinh doanh...
        </div>
      ) : !reportData ? (
        <div className="text-center py-20 bg-slate-900/60 rounded-3xl border border-slate-800 text-xs text-slate-400">
          Không có dữ liệu trong khoảng thời gian này.
        </div>
      ) : (
        <div className="space-y-5">
          
          {/* 2. FOUR OVERVIEW KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Revenue */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tổng Doanh Thu
                </span>
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-sans tracking-tight badge-nowrap">
                {formatVND(reportData.kpis?.total_revenue || 0)}
              </div>
              <div className="text-[11px] text-slate-400">
                Đã trừ chiết khấu giảm giá
              </div>
            </div>

            {/* Profit */}
            <div className="bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border-2 border-cyan-500/50 shadow-glow-cyan space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                  Lợi Nhuận Gộp
                </span>
                <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-cyan-300 font-sans tracking-tight badge-nowrap">
                {formatVND(reportData.kpis?.gross_profit || 0)}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">
                = Doanh thu - Giá vốn nhập kho
              </div>
            </div>

            {/* Orders & Units */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tổng Máy Bán Ra
                </span>
                <div className="p-2 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/30">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-sans tracking-tight badge-nowrap">
                {totalUnitsSold} <span className="text-sm font-bold text-slate-400">máy ({reportData.kpis?.total_orders || 0} đơn)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Thực thu: <b className="text-emerald-400 font-sans font-bold badge-nowrap">{formatVND(reportData.kpis?.total_collected || 0)}</b>
              </div>
            </div>

            {/* Trade-in */}
            <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 shadow-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Tổng Thu Cũ (Trade-in)
                </span>
                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-300 font-sans tracking-tight badge-nowrap">
                {formatVND(reportData.kpis?.total_trade_in || 0)}
              </div>
              <div className="text-[11px] text-amber-400/80 font-semibold">
                Tiền máy cũ cấn trừ vào đơn
              </div>
            </div>
          </div>

          {/* 3. TWO DETAILED BREAKDOWN TABLES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* BẢNG 1: THỐNG KÊ SỐ LƯỢNG MÁY BÁN RA THEO TỪNG DÒNG MÁY (7 COLS) */}
            <div className="lg:col-span-7 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                    1. Số Lượng Bán Ra Chi Tiết Theo Dòng Máy
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400 font-mono badge-nowrap">
                  Tổng: {totalUnitsSold} máy
                </span>
              </div>

              {(!reportData.model_series || reportData.model_series.length === 0) ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  Chưa phát sinh giao dịch trong kỳ này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/90 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Dòng Sản Phẩm</th>
                        <th className="py-2.5 px-3 text-center">Số Lượng Bán</th>
                        <th className="py-2.5 px-3 text-right">Tổng Doanh Thu</th>
                        <th className="py-2.5 px-3 text-right">Lợi Nhuận Gộp</th>
                        <th className="py-2.5 px-3 text-right">Tỷ Trọng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {reportData.model_series.map((item: any, idx: number) => {
                        const pct = totalUnitsSold > 0 ? Math.round((item.quantity_sold / totalUnitsSold) * 100) : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/50 transition">
                            <td className="py-3 px-3">
                              <div className="font-black text-white">{item.series_name}</div>
                              <div className="w-24 bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
                                <div
                                  className="bg-cyan-400 h-full rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 font-black rounded-lg text-xs font-mono border border-cyan-500/30 badge-nowrap">
                                {item.quantity_sold} máy
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-white font-sans tracking-tight badge-nowrap">
                              {formatVND(item.total_revenue)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-cyan-300 font-sans tracking-tight badge-nowrap">
                              {formatVND(item.gross_profit)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-400 font-mono badge-nowrap">
                              {pct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* BẢNG 2: TOP CÁC SẢN PHẨM BÁN CHẠY NHẤT (5 COLS) */}
            <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                    2. Top Sản Phẩm Bán Chạy Nhất
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase badge-nowrap">Xếp Hạng</span>
              </div>

              {(!reportData.top_products || reportData.top_products.length === 0) ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  Chưa có sản phẩm bán ra.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {reportData.top_products.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs hover:border-slate-700 transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl font-black flex items-center justify-center text-xs shadow-sm badge-nowrap ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 font-black shadow-glow-cyan'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950 font-black'
                              : idx === 2
                              ? 'bg-amber-700 text-white font-bold'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-black text-white">
                            {formatProductTitle(p.product_name, p.storage, p.condition)}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            {p.category}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-emerald-400 font-mono text-sm badge-nowrap">
                          {p.quantity_sold} máy
                        </div>
                        <div className="text-[11px] font-sans font-bold text-slate-300 badge-nowrap">
                          {formatVND(p.total_sales)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. DAILY SALES & PROFIT HISTORY TABLE */}
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Doanh Thu & Lợi Nhuận Theo Từng Ngày
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Sắp xếp theo ngày mới nhất</span>
            </div>

            {(!reportData.daily || reportData.daily.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Chưa có dữ liệu theo ngày.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Ngày Bán</th>
                      <th className="py-2.5 px-3">Số Đơn Hàng</th>
                      <th className="py-2.5 px-3 text-right">Doanh Thu Thu Được</th>
                      <th className="py-2.5 px-3 text-right">Lợi Nhuận Gộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {reportData.daily.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-3 font-bold text-white font-mono badge-nowrap">
                          {new Date(d.sale_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-semibold badge-nowrap">
                          {d.order_count} đơn
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-white font-sans tracking-tight badge-nowrap">
                          {formatVND(d.revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-cyan-300 font-sans tracking-tight badge-nowrap">
                          {formatVND(d.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
