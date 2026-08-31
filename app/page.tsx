'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import POSView from '@/components/views/POSView';
import InventoryView from '@/components/views/InventoryView';
import ImportView from '@/components/views/ImportView';
import OrdersView from '@/components/views/OrdersView';
import PartnersView from '@/components/views/PartnersView';
import CashFlowView from '@/components/views/CashFlowView';
import ReportsView from '@/components/views/ReportsView';
import UsersView from '@/components/views/UsersView';
import WarrantyView from '@/components/views/WarrantyView';
import UtilitiesView from '@/components/views/UtilitiesView';
import WarrantyLookupModal from '@/components/WarrantyLookupModal';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pos');
  const [isWarrantyLookupOpen, setIsWarrantyLookupOpen] = useState(false);

  useEffect(() => {
    // Check authentication
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setAuthLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-glow-cyan animate-pulse">
          <span className="text-xl font-black text-white">TD</span>
        </div>
        <div className="text-xs font-bold text-cyan-300">Đang khởi động TD MOBILE STORE...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col pb-24 lg:pb-8">
      {/* Top Header & Desktop Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onOpenWarrantyLookup={() => setIsWarrantyLookupOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8">
        {activeTab === 'pos' && <POSView user={user} />}
        {activeTab === 'inventory' && <InventoryView user={user} />}
        {activeTab === 'warranty' && <WarrantyView user={user} />}
        {activeTab === 'import' && <ImportView user={user} />}
        {activeTab === 'utilities' && <UtilitiesView user={user} onNavigateTab={setActiveTab} />}
        {activeTab === 'orders' && <OrdersView user={user} />}
        {activeTab === 'partners' && <PartnersView user={user} />}
        {activeTab === 'cash-flow' && <CashFlowView user={user} />}
        {activeTab === 'reports' && <ReportsView user={user} />}
        {activeTab === 'users' && <UsersView currentUser={user} />}
      </main>

      {/* Mobile Bottom Navigation Bar (5 Fixed Main Tabs) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={user.role}
      />

      {/* Global Quick Warranty Lookup Modal */}
      <WarrantyLookupModal
        isOpen={isWarrantyLookupOpen}
        onClose={() => setIsWarrantyLookupOpen(false)}
      />
    </div>
  );
}
