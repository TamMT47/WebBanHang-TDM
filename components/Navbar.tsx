'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Layers,
  FileText,
  DollarSign,
  Users,
  BarChart3,
  UserCheck,
  LogOut,
  Search,
  Shield,
  Menu,
  X,
  PlusCircle,
  QrCode
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: {
    id: string;
    username: string;
    full_name: string;
    role: UserRole;
  } | null;
  onLogout: () => void;
  onOpenWarrantyLookup?: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenWarrantyLookup,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-red-900/60 text-red-200 border border-red-700/50 rounded-full">ADMIN</span>;
      case 'owner':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-purple-900/60 text-purple-200 border border-purple-700/50 rounded-full">CHỦ CỬA HÀNG</span>;
      case 'manager':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-900/60 text-blue-200 border border-blue-700/50 rounded-full">QUẢN LÝ</span>;
      case 'staff':
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-900/60 text-emerald-200 border border-emerald-700/50 rounded-full">NHÂN VIÊN</span>;
    }
  };

  const navItems = [
    { id: 'pos', label: 'Bán Hàng', icon: Smartphone, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'inventory', label: 'Kho Hàng', icon: Layers, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'warranty', label: 'Bảo Hành', icon: Shield, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'import', label: 'Nhập Hàng', icon: PlusCircle, roles: ['admin', 'owner', 'manager'] },
    { id: 'partners', label: 'Khách & NCC', icon: Users, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'orders', label: 'Hóa Đơn', icon: FileText, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'cash-flow', label: 'Sổ Quỹ', icon: DollarSign, roles: ['admin', 'owner', 'manager'] },
    { id: 'reports', label: 'Báo Cáo', icon: BarChart3, roles: ['admin', 'owner', 'manager'] },
    { id: 'users', label: 'Tài Khoản', icon: UserCheck, roles: ['admin', 'owner'] },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <header className="sticky top-0 z-40 bg-gray-950 text-white shadow-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('pos')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center border border-gray-600 shadow-inner">
              <span className="text-lg font-black tracking-tighter text-white">TD</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-extrabold tracking-tight text-white">TD MOBILE STORE</span>
              </div>
              <span className="text-[10px] text-gray-400 block -mt-1 font-medium tracking-wide">APPLE SALES & REPAIR</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gray-800 text-white shadow-sm border border-gray-700'
                      : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2">
            {onOpenWarrantyLookup && (
              <button
                onClick={onOpenWarrantyLookup}
                title="Tra cứu bảo hành nhanh"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs font-medium rounded-lg border border-gray-700 transition"
              >
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Tra Bảo Hành</span>
              </button>
            )}

            {user && (
              <div className="hidden sm:flex items-center space-x-2 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800">
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-100">{user.full_name}</div>
                  <div className="text-[10px] text-gray-400">{getRoleBadge(user.role)}</div>
                </div>
              </div>
            )}

            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-900 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-gray-950 border-b border-gray-800 px-4 pt-2 pb-4 space-y-1">
          {user && (
            <div className="flex items-center justify-between py-2 px-3 mb-2 bg-gray-900 rounded-lg border border-gray-800">
              <div>
                <div className="text-xs font-bold text-white">{user.full_name}</div>
                <div className="text-[11px] text-gray-400">@{user.username}</div>
              </div>
              {getRoleBadge(user.role)}
            </div>
          )}

          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? 'bg-gray-800 text-white border border-gray-700'
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
