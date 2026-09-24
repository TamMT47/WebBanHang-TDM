'use client';

import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Sun,
  Moon,
  GraduationCap,
  Printer
} from 'lucide-react';
import { UserRole } from '@/types/database';
import { getSavedColorMode, applyColorMode, ColorMode } from '@/lib/themeHelper';

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
  const [colorMode, setColorMode] = useState<ColorMode>('dark');

  useEffect(() => {
    setColorMode(getSavedColorMode());
  }, []);

  const handleToggleColorMode = () => {
    const nextMode = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(nextMode);
    applyColorMode(nextMode);
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="badge-nowrap px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full shadow-xs">ADMIN</span>;
      case 'owner':
        return <span className="badge-nowrap px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full shadow-xs">CHỦ SHOP</span>;
      case 'manager':
        return <span className="badge-nowrap px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full shadow-xs">QUẢN LÝ</span>;
      case 'staff':
      default:
        return <span className="badge-nowrap px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full shadow-xs">NHÂN VIÊN</span>;
    }
  };

  const navItems = [
    { id: 'pos', label: 'Bán Hàng', icon: Smartphone, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'inventory', label: 'Kho Hàng', icon: Layers, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'warranty', label: 'Bảo Hành', icon: Shield, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'attendance', label: 'Chấm Công', icon: UserCheck, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'payroll', label: 'Tính Lương', icon: DollarSign, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'training', label: 'Đào Tạo', icon: GraduationCap, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'import', label: 'Nhập Hàng', icon: PlusCircle, roles: ['admin', 'owner', 'manager'] },
    { id: 'partners', label: 'Khách & NCC', icon: Users, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'orders', label: 'Hóa Đơn', icon: FileText, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'cash-flow', label: 'Sổ Quỹ', icon: DollarSign, roles: ['admin', 'owner', 'manager'] },
    { id: 'reports', label: 'Báo Cáo', icon: BarChart3, roles: ['admin', 'owner', 'manager'] },
    { id: 'users', label: 'Tài Khoản', icon: UserCheck, roles: ['admin', 'owner'] },
    { id: 'printer-settings', label: 'Máy In', icon: Printer, roles: ['admin', 'owner', 'manager', 'staff'] },
    { id: 'settings', label: 'Cài Đặt', icon: Sparkles, roles: ['admin', 'owner', 'manager', 'staff'] },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl shadow-black/40 w-full min-w-full">
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 flex-nowrap min-w-full">
          
          {/* Logo & Brand (1 Single Line + Larger Zoomed Logo) */}
          <div className="flex items-center space-x-2.5 cursor-pointer group flex-shrink-0" onClick={() => setActiveTab('pos')}>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center p-1 border border-slate-700 shadow-glow-cyan group-hover:scale-105 transition duration-200 overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="TD Mobile Store" className="w-full h-full object-contain scale-110" />
            </div>
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              <span className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-cyan-400 transition whitespace-nowrap">
                TD MOBILE STORE
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow-emerald flex-shrink-0"></span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white hover:border hover:border-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="badge-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Actions (Desktop & Mobile) */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0 flex-nowrap">
            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleColorMode}
              title={colorMode === 'dark' ? 'Chuyển sang Chế độ Sáng (Light Mode)' : 'Chuyển sang Chế độ Tối (Dark Mode)'}
              className="p-2 text-slate-300 hover:text-amber-400 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-700/80 transition flex items-center justify-center shadow-xs flex-shrink-0"
            >
              {colorMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-180 duration-300" />
              )}
            </button>

            {onOpenWarrantyLookup && (
              <button
                onClick={onOpenWarrantyLookup}
                title="Tra cứu bảo hành nhanh"
                className="hidden xl:flex items-center space-x-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 text-xs font-bold rounded-xl border border-slate-700/80 hover:border-cyan-500/50 shadow-sm transition flex-shrink-0"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span className="badge-nowrap">Tra Bảo Hành</span>
              </button>
            )}

            {/* Chi nhánh (Desktop >= lg) */}
            <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-bold flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald mr-1"></span>
              <span className="badge-nowrap">CN Chính</span>
            </div>

            {/* Thông tin tài khoản / Tên nhân viên (Desktop >= lg) */}
            {user && (
              <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-100 badge-nowrap">{user.full_name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1">
                    <span>{getRoleBadge(user.role)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nút Cài Đặt (Desktop >= lg) */}
            <button
              onClick={() => setActiveTab('settings')}
              title="Cài Đặt Hệ Thống"
              className={`hidden lg:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition flex-shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="badge-nowrap">Cài Đặt</span>
            </button>

            {/* Nút ĐĂNG XUẤT (Desktop & Mobile) */}
            <button
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
              className="flex items-center space-x-1.5 px-3 py-2 text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 rounded-xl transition border border-rose-500/30 text-xs font-bold shadow-xs active:scale-95 flex-shrink-0"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden lg:inline badge-nowrap font-black">ĐĂNG XUẤT</span>
            </button>

            {/* Mobile menu toggle (Mobile only < lg) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800 px-4 pt-3 pb-4 space-y-1.5 shadow-2xl animate-in slide-in-from-top duration-200">
          {user && (
            <div className="flex items-center justify-between py-2.5 px-3 mb-2 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <div className="text-xs font-bold text-white">{user.full_name}</div>
                <div className="text-[11px] text-slate-400">@{user.username}</div>
              </div>
              {getRoleBadge(user.role)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
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
                  className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                      : 'text-slate-300 bg-slate-900/60 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="badge-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
