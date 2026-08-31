'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Layers,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Tag,
  Camera,
  Filter,
  Eye,
  EyeOff,
  DollarSign,
  X,
  Sparkles,
  RefreshCw,
  Palette,
  RotateCcw
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import {
  strictProductMatch,
  getAllMasterColors,
  saveCustomColor,
  getAllMasterModels,
  saveCustomModel,
  DEFAULT_MASTER_STORAGES,
  DEFAULT_MASTER_CONDITIONS,
  DEFAULT_MASTER_CATEGORIES,
  sortItemsAZ,
  formatProductTitle
} from '@/lib/masterAttributes';
import {
  getCachedInventory,
  setCachedInventory,
  invalidateInventoryCache,
  subscribeToCacheInvalidation
} from '@/lib/cache';
import { InventoryItem, Product } from '@/types/database';
import MoneyInput from '@/components/ui/MoneyInput';
import ScannerModal from '@/components/ScannerModal';

interface InventoryViewProps {
  user: any;
}

export default function InventoryView({ user }: InventoryViewProps) {
  const canSeeCost = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Master Colors
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isAddImeiOpen, setIsAddImeiOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Edit Price Modal
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editCostPrice, setEditCostPrice] = useState<number>(0);
  const [editBattery, setEditBattery] = useState<number>(100);
  const [savingEdit, setSavingEdit] = useState(false);

  // Add IMEI State (Single Machine)
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newImei, setNewImei] = useState('');
  const [newColor, setNewColor] = useState('Titan Tự Nhiên (Natural Titanium)');
  const [newBattery, setNewBattery] = useState<number | string>(100);
  const [newCostPrice, setNewCostPrice] = useState<number>(18000000);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(21000000);

  // Modular Product Creation Form State
  const [newProdName, setNewProdName] = useState('iPhone 15');
  const [newProdStorage, setNewProdStorage] = useState('128GB');
  const [newProdCondition, setNewProdCondition] = useState('99%');
  const [newProdCategory, setNewProdCategory] = useState('iPhone');
  const [newProdBasePrice, setNewProdBasePrice] = useState<number>(18000000);

  // Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset State
  const resetAllFormStates = () => {
    setNewImei('');
    setNewBattery(100);
    setNewColor('Titan Tự Nhiên (Natural Titanium)');
    setNewProdName('iPhone 15');
    setNewProdStorage('128GB');
    setNewProdCondition('99%');
    setItemToEdit(null);
    setMessage(null);
  };

  const fetchData = async () => {
    try {
      const cached = getCachedInventory();
      if (cached && cached.length > 0 && statusFilter === 'all' && categoryFilter === 'all') {
        setInventory(cached);
        setLoading(false);
      }

      setAvailableColors(getAllMasterColors());

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const [invRes, prodRes] = await Promise.all([
        fetch(`/api/inventory?${params.toString()}`),
        fetch('/api/products'),
      ]);

      const invData = await invRes.json();
      const prodData = await prodRes.json();

      const rawInv = invData.inventory || [];
      const rawProds = prodData.products || [];

      // Sort A-Z by product name
      const sortedInv = sortItemsAZ(rawInv, (item: InventoryItem) => item.product_name || '');
      const sortedProds = sortItemsAZ(rawProds, (p: Product) => p.name);

      setInventory(sortedInv);
      setProducts(sortedProds);

      if (statusFilter === 'all' && categoryFilter === 'all') {
        setCachedInventory(sortedInv);
      }

      if (sortedProds.length > 0 && !selectedProductId) {
        setSelectedProductId(sortedProds[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = subscribeToCacheInvalidation(() => {
      fetchData();
    });

    return () => unsubscribe();
  }, [statusFilter, categoryFilter]);

  // Handle Add Single IMEI
  const handleCreateImei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImei.trim() || !selectedProductId) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ mã IMEI và chọn dòng máy' });
      return;
    }

    try {
      const numBat = typeof newBattery === 'string' ? parseInt(newBattery, 10) : newBattery;

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductId,
          imei: newImei.trim(),
          cost_price: newCostPrice,
          selling_price: newSellingPrice,
          battery_health: isNaN(numBat) ? 100 : numBat,
          status: 'in_stock',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi thêm máy');

      setMessage({ type: 'success', text: `Đã thêm máy IMEI ${newImei.trim()} vào kho thành công!` });
      setIsAddImeiOpen(false);
      resetAllFormStates();
      invalidateInventoryCache();
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Handle Create Modular Product Model
  const handleCreateModularProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên dòng máy mẫu' });
      return;
    }

    try {
      saveCustomModel(newProdName.trim());

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName.trim(),
          storage: newProdStorage,
          condition: newProdCondition,
          category: newProdCategory,
          base_price: newProdBasePrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tạo sản phẩm');

      setMessage({
        type: 'success',
        text: `Đã tạo mẫu máy ${formatProductTitle(newProdName, newProdStorage, newProdCondition)} thành công!`,
      });
      setIsAddProductOpen(false);
      resetAllFormStates();
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setItemToEdit(item);
    setEditSellingPrice(parseFloat(item.selling_price as any) || 0);
    setEditCostPrice(parseFloat(item.cost_price as any) || 0);
    setEditBattery(item.battery_health || 100);
  };

  const handleSavePriceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit) return;

    const prevInv = [...inventory];
    const editedId = itemToEdit.id;
    const editedImei = itemToEdit.imei;

    // Optimistically update local array immediately
    setInventory((prev) =>
      prev.map((item) =>
        item.id === editedId
          ? {
              ...item,
              selling_price: editSellingPrice,
              cost_price: canSeeCost ? editCostPrice : item.cost_price,
              battery_health: editBattery,
            }
          : item
      )
    );
    setItemToEdit(null);
    setMessage({ type: 'success', text: `Đã cập nhật máy IMEI ${editedImei} thành công!` });

    try {
      setSavingEdit(true);
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editedId,
          selling_price: editSellingPrice,
          cost_price: canSeeCost ? editCostPrice : undefined,
          battery_health: editBattery,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật giá');

      invalidateInventoryCache();
    } catch (err: any) {
      setInventory(prevInv);
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteImei = async (id: string, imei: string) => {
    if (!confirm(`Bạn có chắc muốn xóa mã máy IMEI ${imei} khỏi kho?`)) return;

    const prevInv = [...inventory];
    // Optimistically remove from local array immediately
    setInventory((prev) => prev.filter((item) => item.id !== id));
    setMessage({ type: 'success', text: `Đã xóa mã máy IMEI ${imei} khỏi kho` });

    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa');
      invalidateInventoryCache();
    } catch (err: any) {
      setInventory(prevInv);
      setMessage({ type: 'error', text: err.message });
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch = strictProductMatch(
        item.product_name || '',
        item.imei,
        item.color,
        search
      );
      return matchSearch;
    });
  }, [inventory, search]);

  const totalInStock = inventory.filter((i) => i.status === 'in_stock').length;
  const totalSold = inventory.filter((i) => i.status === 'sold').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Quản Lý Kho Hàng & Tồn Kho IMEI
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
              <span className="text-emerald-400 font-bold badge-nowrap">● Còn hàng: {totalInStock} máy</span>
              <span>•</span>
              <span className="text-slate-400 font-bold badge-nowrap">Đã bán: {totalSold} máy</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 badge-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>+ Thêm Mẫu Máy</span>
          </button>

          <button
            onClick={() => setIsAddImeiOpen(true)}
            className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1.5 badge-nowrap active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-slate-950 font-black" />
            <span>+ Nhập Lẻ 1 Máy</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border shadow-sm animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span className="font-bold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Tên, 15 số IMEI, Màu sắc..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Tất cả Dòng sản phẩm</option>
              <option value="iPhone">iPhone</option>
              <option value="iPad">iPad</option>
              <option value="Macbook">Macbook</option>
              <option value="Airpods">Airpods</option>
              <option value="AppleWatch">Apple Watch</option>
              <option value="PhuKien">Phụ Kiện</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Tất cả Trạng thái máy</option>
              <option value="in_stock">🟢 Còn hàng (Sẵn sàng bán)</option>
              <option value="sold">⚪ Đã bán</option>
              <option value="warranty">🟡 Đang bảo hành</option>
              <option value="trade_in_pending">🟠 Thu cũ chờ duyệt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory List (Responsive: Mobile Cards + Desktop Table) */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">Đang tải kho máy...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            Không tìm thấy máy nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div>
            {/* 1. Mobile Cards View (< 640px) */}
            <div className="block sm:hidden divide-y divide-slate-800/80">
              {filteredInventory.map((item) => {
                const isInStock = item.status === 'in_stock';
                return (
                  <div key={item.id} className="p-4 space-y-2.5 hover:bg-slate-850/50 transition">
                    {/* Top: Product Name + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-white text-sm">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{item.category}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold badge-nowrap ${
                          isInStock
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.status === 'sold'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isInStock ? '● Còn hàng' : item.status === 'sold' ? 'Đã bán' : 'Bảo hành'}
                      </span>
                    </div>

                    {/* IMEI */}
                    <div className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[10px] uppercase font-sans">IMEI:</span>
                      <span className="text-cyan-300 font-mono tracking-wider">{item.imei}</span>
                    </div>

                    {/* 2x2 Attributes */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 bg-slate-950 text-cyan-300 rounded-md text-[10px] font-black border border-cyan-500/30 badge-nowrap">
                        {item.storage || 'N/A'}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded-md text-[10px] font-bold border border-amber-500/30 badge-nowrap">
                        {item.condition || '99%'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded-md text-[10px] font-bold border border-slate-700 badge-nowrap max-w-[120px] truncate">
                        {item.color || 'Mặc định'}
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-md text-[10px] font-bold border border-emerald-500/30 badge-nowrap">
                        {item.battery_health ? `🔋 ${item.battery_health}%` : '🔋 N/A'}
                      </span>
                    </div>

                    {/* Bottom: Pricing & Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Giá Niêm Yết</div>
                        <div className="text-sm font-black text-cyan-300 font-sans tracking-tight">
                          {formatVND(item.selling_price)}
                        </div>
                        {canSeeCost && (
                          <div className="text-[11px] font-bold text-rose-400 font-sans">
                            Vốn: {formatVND(item.cost_price)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {canSeeCost && isInStock && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {isAdminOrOwner && isInStock && (
                          <button
                            onClick={() => handleDeleteImei(item.id, item.imei)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Desktop Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5">Mã IMEI</th>
                    <th className="px-4 py-3.5">Dòng Sản Phẩm</th>
                    <th className="px-4 py-3.5">Thông Số & Thuộc Tính</th>
                    <th className="px-4 py-3.5">Giá Niêm Yết</th>
                    {canSeeCost && <th className="px-4 py-3.5">Giá Vốn Nhập</th>}
                    <th className="px-4 py-3.5">Trạng Thái</th>
                    <th className="px-4 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredInventory.map((item) => {
                    const isInStock = item.status === 'in_stock';
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition duration-150">
                        <td className="px-4 py-3.5 font-extrabold text-white font-mono">
                          {item.imei}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-black text-white text-xs sm:text-sm">{item.product_name}</div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold">
                            {item.category}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 min-w-[190px]">
                          <div className="space-y-1.5">
                            {/* 2 Trên: Dung lượng & Ngoại hình */}
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2 py-0.5 bg-slate-950 text-cyan-300 rounded-md text-[10px] font-black border border-cyan-500/30 badge-nowrap min-w-[50px] text-center">
                                {item.storage || 'N/A'}
                              </span>
                              <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded-md text-[10px] font-bold border border-amber-500/30 badge-nowrap text-center">
                                {item.condition || '99%'}
                              </span>
                            </div>

                            {/* 2 Dưới: Màu sắc & % Pin */}
                            <div className="flex items-center space-x-1.5">
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded-md text-[10px] font-bold border border-slate-700 badge-nowrap max-w-[100px] truncate" title={item.color}>
                                {item.color || 'Mặc định'}
                              </span>
                              <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 rounded-md text-[10px] font-bold border border-emerald-500/30 badge-nowrap">
                                {item.battery_health ? `🔋 ${item.battery_health}%` : '🔋 N/A'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-sm text-cyan-300 font-sans tracking-tight badge-nowrap">
                          {formatVND(item.selling_price)}
                        </td>
                        {canSeeCost && (
                          <td className="px-4 py-3.5 font-bold text-xs text-rose-400 font-sans tracking-tight badge-nowrap">
                            {formatVND(item.cost_price)}
                          </td>
                        )}
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold badge-nowrap ${
                              isInStock
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'sold'
                                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isInStock
                              ? '● Còn hàng'
                              : item.status === 'sold'
                              ? 'Đã bán'
                              : 'Đang bảo hành'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {canSeeCost && isInStock && (
                              <button
                                onClick={() => openEditModal(item)}
                                title="Sửa giá bán / giá vốn"
                                className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isAdminOrOwner && isInStock && (
                              <button
                                onClick={() => handleDeleteImei(item.id, item.imei)}
                                title="Xóa máy khỏi kho"
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Create Modular Product Model */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Tạo Mẫu Sản Phẩm (Thông Số Độc Lập)</span>
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateModularProduct} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-black text-slate-200 mb-1">
                  1. Tên dòng máy (VD: iPhone 11, iPhone 15 Pro Max) *
                </label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="VD: iPhone 11, iPad Air 5..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    2. Dung lượng *
                  </label>
                  <select
                    value={newProdStorage}
                    onChange={(e) => setNewProdStorage(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    {DEFAULT_MASTER_STORAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    3. Tình trạng *
                  </label>
                  <select
                    value={newProdCondition}
                    onChange={(e) => setNewProdCondition(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    {DEFAULT_MASTER_CONDITIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  4. Danh mục sản phẩm
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  {DEFAULT_MASTER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Giá bán tham chiếu cơ bản
                </label>
                <MoneyInput
                  value={newProdBasePrice}
                  onValueChange={(num) => setNewProdBasePrice(num)}
                  placeholder="0"
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold font-mono text-cyan-300 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Tên hiển thị:</span>
                <b className="text-white font-mono badge-nowrap">{formatProductTitle(newProdName, newProdStorage, newProdCondition)}</b>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan"
                >
                  Tạo Mẫu Máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Single IMEI */}
      {isAddImeiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Thêm Máy Mới Vào Kho (Nhập Lẻ)</h3>
              <button
                onClick={() => setIsAddImeiOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateImei} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Chọn mẫu sản phẩm *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatProductTitle(p.name, p.storage, p.condition)} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mã IMEI (15 số) *
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newImei}
                    onChange={(e) => setNewImei(e.target.value)}
                    placeholder="VD: 359123456789012"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 badge-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Quét</span>
                  </button>
                </div>
              </div>

              {/* Color & Battery */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Màu sắc</label>
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="VD: Titan Tự Nhiên, Gold..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">% Pin</label>
                  <input
                    type="number"
                    value={newBattery}
                    onChange={(e) => setNewBattery(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="100"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold font-mono text-white focus:outline-none"
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              {canSeeCost && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-rose-400 mb-1">Giá vốn *</label>
                    <MoneyInput
                      value={newCostPrice}
                      onValueChange={(num) => setNewCostPrice(num)}
                      placeholder="0"
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-rose-400 font-sans focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-400 mb-1">Giá bán *</label>
                    <MoneyInput
                      value={newSellingPrice}
                      onValueChange={(num) => setNewSellingPrice(num)}
                      placeholder="0"
                      className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-cyan-300 font-sans focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddImeiOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan"
                >
                  Thêm Vào Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Price Modal */}
      {itemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Chỉnh Sửa Giá & Thông Số IMEI</h3>
              </div>
              <button
                onClick={() => setItemToEdit(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriceEdit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white text-sm">{itemToEdit.product_name}</div>
                <div className="text-[11px] font-mono text-slate-400">Mã IMEI: <b className="text-cyan-300">{itemToEdit.imei}</b></div>
                <div className="text-[10px] text-slate-500">{itemToEdit.storage} • {itemToEdit.color} • {itemToEdit.condition}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-cyan-400 mb-1">
                  Giá niêm yết bán ra *
                </label>
                <MoneyInput
                  value={editSellingPrice}
                  onValueChange={(num) => setEditSellingPrice(num)}
                  placeholder="0"
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-black text-cyan-300 font-sans focus:outline-none"
                />
              </div>

              {canSeeCost && (
                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-1">
                    Giá vốn nhập vào
                  </label>
                  <MoneyInput
                    value={editCostPrice}
                    onValueChange={(num) => setEditCostPrice(num)}
                    placeholder="0"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-black text-rose-400 font-sans focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Dung lượng Pin (%)
                </label>
                <input
                  type="number"
                  value={editBattery}
                  onChange={(e) => setEditBattery(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold font-mono text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setItemToEdit(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl font-bold shadow-glow-cyan transition"
                >
                  {savingEdit ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scanned) => setNewImei(scanned)}
        title="Quét Mã IMEI Nhập Kho"
      />
    </div>
  );
}
