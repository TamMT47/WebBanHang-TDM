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
  const isManagerOrAbove = ['admin', 'owner', 'manager'].includes(userRole);

  // 5 Main Tabs for Mobile-First Navigation
  const items = [
    { id: 'pos', label: 'Bán hàng', icon: ShoppingCart },
    { id: 'inventory', label: 'Kho hàng', icon: Layers },
    { id: 'warranty', label: 'Bảo hành', icon: ShieldCheck },
    { id: 'import', label: 'Nhập hàng', icon: PlusCircle },
    { id: 'utilities', label: 'Tiện ích', icon: Settings2 },
  ];

  const isUtilitySubTab = ['partners', 'cash-flow', 'reports', 'orders', 'users'].includes(activeTab);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl px-1.5 py-1.5 flex items-center justify-around safe-area-pb">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id || (item.id === 'utilities' && isUtilitySubTab);
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all ${
              isActive
                ? 'text-gray-950 font-black scale-105'
                : 'text-gray-500 hover:text-gray-900 font-semibold'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-gray-950 text-white shadow-md shadow-black/20'
                  : 'text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
