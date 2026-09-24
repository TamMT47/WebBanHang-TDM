'use client';

import React from 'react';
import { ShoppingCart, Layers, ShieldCheck, PlusCircle, Settings2 } from 'lucide-react';
import { UserRole } from '@/types/database';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
}

export default function BottomNav({ activeTab, setActiveTab, userRole = 'staff' }: BottomNavProps) {
  // 5 Main Tabs for Mobile-First Navigation
  const items = [
    { id: 'pos', label: 'Bán hàng', icon: ShoppingCart },
    { id: 'inventory', label: 'Kho hàng', icon: Layers },
    { id: 'warranty', label: 'Bảo hành', icon: ShieldCheck },
    { id: 'import', label: 'Nhập hàng', icon: PlusCircle },
    { id: 'utilities', label: 'Tiện ích', icon: Settings2 },
  ];

  const isUtilitySubTab = ['partners', 'cash-flow', 'reports', 'orders', 'users', 'attendance', 'payroll', 'training', 'settings', 'printer-settings'].includes(activeTab);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl px-1.5 py-1.5 flex items-center justify-around safe-area-pb">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id || (item.id === 'utilities' && isUtilitySubTab);
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-cyan-300 font-black scale-105'
                : 'text-slate-400 hover:text-slate-200 font-semibold'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-glow-cyan'
                  : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight leading-none badge-nowrap">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
