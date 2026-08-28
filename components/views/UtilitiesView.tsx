'use client';

import React from 'react';
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
  Receipt
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface UtilitiesViewProps {
  user: any;
  onNavigateTab: (tab: string) => void;
}

export default function UtilitiesView({ user, onNavigateTab }: UtilitiesViewProps) {
  const isManagerOrAbove = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);

  const utilitySections = [
    {
      title: 'Quản Lý Khách Hàng & Đối Tác',
      description: 'Danh bạ khách hàng, nhà cung cấp và công nợ',
      items: [
        {
          id: 'partners',
          label: 'Khách Hàng & Nhà Cung Cấp',
          desc: 'Quản lý thông tin, CCCD, lịch sử giao dịch & thu/trả nợ',
          icon: Users,
          color: 'bg-blue-900 text-white',
          tag: 'Công Nợ',
        },
        {
          id: 'orders',
          label: 'Lịch Sử Hóa Đơn & Giao Dịch',
          desc: 'Tra cứu toàn bộ hóa đơn bán hàng và phiếu nhập kho',
          icon: Receipt,
          color: 'bg-emerald-800 text-white',
          tag: 'Hóa Đơn',
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
                color: 'bg-amber-600 text-white',
                tag: 'Sổ Quỹ',
              },
              {
                id: 'reports',
                label: 'Báo Cáo Doanh Thu & Lợi Nhuận',
                desc: 'Thống kê doanh số, lợi nhuận thực tế theo ngày & tháng',
                icon: TrendingUp,
                color: 'bg-purple-800 text-white',
                tag: 'Kinh Doanh',
              },
            ],
          },
        ]
      : []),
    ...(isAdminOrOwner
      ? [
          {
            title: 'Bảo Mật & Quản Trị Hệ Thống',
            description: 'Phân quyền và quản lý nhân sự cửa hàng',
            items: [
              {
                id: 'users',
                label: 'Quản Lý Tài Khoản & Phân Quyền',
                desc: 'Cấp quyền truy cập 4 cấp bậc (Admin, Owner, Manager, Staff)',
                icon: UserCheck,
                color: 'bg-gray-950 text-white',
                tag: 'Admin Only',
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
            Trung Tâm Tiện Ích & Quản Trị
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tổng hợp các chức năng quản lý nâng cao của hệ thống TD MOBILE STORE.
          </p>
        </div>
        <div className="hidden sm:flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
          <span className="text-gray-500 font-semibold">Tài khoản:</span>
          <span className="font-bold text-gray-900">{user?.full_name}</span>
        </div>
      </div>

      {/* Sections */}
      {utilitySections.map((sec, idx) => (
        <div key={idx} className="space-y-2.5">
          <div className="px-1">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
              {sec.title}
            </h3>
            <p className="text-[11px] text-gray-500">{sec.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab(item.id)}
                  className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-gray-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-3 rounded-xl ${item.color} shadow-sm group-hover:scale-105 transition`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-gray-950 group-hover:text-black">
                          {item.label}
                        </h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-extrabold rounded-md">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-1">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-1.5 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition">
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
