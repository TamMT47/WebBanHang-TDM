'use client';

import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  BarChart3,
  FileText,
  UserCheck,
  ShieldCheck,
  PlusCircle,
  Smartphone,
  Layers,
  ChevronRight,
  Shield,
  Wallet,
  Building2,
  TrendingUp,
  Receipt,
  Sparkles,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  GraduationCap,
  BookOpen,
  Printer,
  Wifi
} from 'lucide-react';
import { UserRole } from '@/types/database';
import { exportCustomersToCSV } from '@/lib/exportHelper';

interface UtilitiesViewProps {
  user: any;
  onNavigateTab: (tab: string) => void;
}

export default function UtilitiesView({ user, onNavigateTab }: UtilitiesViewProps) {
  const isManagerOrAbove = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);

  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleDirectExportCustomers = async () => {
    try {
      setExportLoading(true);
      const res = await fetch('/api/partners');
      const data = await res.json();
      if (!data.partners || data.partners.length === 0) {
        alert('Chưa có dữ liệu đối tác để xuất!');
        return;
      }
      const success = exportCustomersToCSV(data.partners);
      if (success) {
        setExportNotice(`Đã tải về máy tính danh sách ${data.partners.length} khách hàng & đối tác!`);
        setTimeout(() => setExportNotice(null), 3500);
      }
    } catch (err) {
      alert('Lỗi khi tải dữ liệu đối tác');
    } finally {
      setExportLoading(false);
    }
  };

  const utilitySections = [
    {
      title: 'Quản Lý Máy In & Mẫu Hóa Đơn',
      description: 'Cấu hình máy in QZ Tray trên máy chủ MacBook và mẫu in hóa đơn',
      items: [
        {
          id: 'printer-settings',
          label: 'Cài Đặt Máy In (QZ Tray Print Server)',
          desc: 'Kết nối máy chủ MacBook USB, nhận diện máy in Xprinter USB Printer P & in ẩn 100%',
          icon: Printer,
          color: 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-glow-cyan',
          tag: 'MacBook USB',
        },
        {
          id: 'settings',
          label: 'Tùy Biến Giao Diện & Mẫu In',
          desc: 'Đổi 6 tông màu hệ thống & cấu hình thông tin cửa hàng trên hóa đơn K80/A4',
          icon: Sparkles,
          color: 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-glow-cyan',
          tag: 'Theme & Mẫu In',
        },
      ],
    },
    {
      title: 'Đào Tạo Nhân Viên & Học Việc (Onboarding)',
      description: 'Quy định tác phong, nghiệp vụ kỹ thuật POS & chương trình khuyến mãi tháng',
      items: [
        {
          id: 'training',
          label: 'Đào Tạo & Onboarding Nhân Viên',
          desc: '3 khối chuẩn: Quy định 5S, test máy 30 bước, thao tác bán hàng & bảng giá khuyến mãi',
          icon: GraduationCap,
          color: 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-glow-cyan',
          tag: '3 Khối Chuẩn',
        },
      ],
    },
    {
      title: 'Quản Lý Khách Hàng & Đối Tác',
      description: 'Danh bạ khách hàng, nhà cung cấp và công nợ',
      items: [
        {
          id: 'partners',
          label: 'Khách Hàng & Nhà Cung Cấp',
          desc: 'Quản lý thông tin, CCCD, lịch sử giao dịch & thu/trả nợ',
          icon: Users,
          color: 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-glow-cyan',
          tag: 'Công Nợ',
        },
        {
          id: 'orders',
          label: 'Lịch Sử Hóa Đơn & Giao Dịch',
          desc: 'Tra cứu toàn bộ hóa đơn bán hàng và phiếu nhập kho',
          icon: Receipt,
          color: 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-glow-emerald',
          tag: 'Hóa Đơn',
        },
      ],
    },
    {
      title: 'Quản Lý Nhân Sự, Chấm Công & Bảng Lương',
      description: 'Chấm công Wifi nội bộ, ca làm việc, tính lương 26 ngày và OT 150%',
      items: [
        {
          id: 'attendance',
          label: 'Chấm Công Wifi Nội Bộ',
          desc: 'Chấm công 3 ca chuẩn (Sáng/Chiều/Tối), kiểm tra IP Wifi và tự động tính giờ OT',
          icon: Clock,
          color: 'bg-gradient-to-tr from-cyan-600 to-teal-600 text-white shadow-glow-cyan',
          tag: 'Wifi IP',
        },
        {
          id: 'payroll',
          label: 'Bảng Tính Lương & Lịch Sử',
          desc: 'Tự động tính lương 26 ngày công chuẩn, giờ OT 150%, thưởng phạt và lưu trữ',
          icon: DollarSign,
          color: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-glow-cyan',
          tag: 'Lương 26 Ngày',
        },
      ],
    },
    ...(isManagerOrAbove
      ? [
          {
            title: 'Tài Chính & Báo Cáo Doanh Thu',
            description: 'Dòng tiền, lợi nhuận gộp và quản lý kinh doanh',
            items: [
              {
                id: 'cash-flow',
                label: 'Sổ Quỹ Thu / Chi',
                desc: 'Quản lý quỹ tiền mặt, quỹ chuyển khoản và chi phí vận hành',
                icon: Wallet,
                color: 'bg-gradient-to-tr from-amber-600 to-yellow-600 text-white',
                tag: 'Sổ Quỹ',
              },
              {
                id: 'reports',
                label: 'Báo Cáo Doanh Thu & Lợi Nhuận',
                desc: 'Thống kê doanh số, lợi nhuận thực tế theo ngày & tháng',
                icon: TrendingUp,
                color: 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white',
                tag: 'Kinh Doanh',
              },
            ],
          },
        ]
      : []),
    {
      title: 'Sao Lưu & Xuất Dữ Liệu Hệ Thống',
      description: 'Tải toàn bộ cơ sở dữ liệu về máy tính cá nhân (Excel/CSV)',
      items: [
        {
          id: 'export-customers-action',
          label: 'Xuất Dữ Liệu Khách Hàng (Excel/CSV)',
          desc: 'Tải về máy tính danh sách khách hàng, SĐT, CCCD, công nợ và ngày mua máy',
          icon: FileSpreadsheet,
          color: 'bg-gradient-to-tr from-emerald-600 to-cyan-600 text-white shadow-glow-cyan',
          tag: 'Tải Về Máy',
          onClick: handleDirectExportCustomers,
        },
      ],
    },
    ...(isAdminOrOwner
      ? [
          {
            title: 'Bảo Mật & Quản Trị Hệ Thống',
            description: 'Phân quyền và quản trị nhân sự cửa hàng',
            items: [
              {
                id: 'users',
                label: 'Quản Lý Tài Khoản & Phân Quyền',
                desc: 'Cấp quyền truy cập 4 cấp bậc (Admin, Owner, Manager, Staff)',
                icon: UserCheck,
                color: 'bg-gradient-to-tr from-rose-600 to-red-600 text-white',
                tag: 'Admin Only',
              },
            ],
          },
        ]
      : []),
  ];

  const isStaff = user?.role === 'staff';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Export Success Toast */}
      {exportNotice && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl font-black text-xs shadow-glow-emerald flex items-center space-x-2 animate-in slide-in-from-top border border-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Trung Tâm Tiện Ích & Quản Trị
            </h2>
            {!isStaff && (
              <p className="text-xs text-slate-400 mt-0.5">
                Tổng hợp các chức năng quản lý nâng cao, cài đặt máy in QZ Tray & xuất dữ liệu TD MOBILE STORE.
              </p>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2 bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold">Tài khoản:</span>
          <span className="font-bold text-white badge-nowrap">{user?.full_name}</span>
        </div>
      </div>

      {/* Sections */}
      {utilitySections.map((sec, idx) => (
        <div key={idx} className="space-y-3">
          <div className="px-1">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
              {sec.title}
            </h3>
            {!isStaff && <p className="text-[11px] text-slate-500">{sec.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {sec.items.map((item: any) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else {
                      onNavigateTab(item.id);
                    }
                  }}
                  className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl hover:border-slate-700 hover:bg-slate-850/80 transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-3 rounded-2xl ${item.color} group-hover:scale-105 transition`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                          {item.label}
                        </h4>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-extrabold rounded-lg badge-nowrap">
                          {item.tag}
                        </span>
                      </div>
                      {!isStaff && (
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-1">
                          {item.desc}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-1.5 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
