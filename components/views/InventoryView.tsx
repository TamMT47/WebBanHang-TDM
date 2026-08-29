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
  DEFAULT_MASTER_MODELS,
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

  // 1. Modular Product Creation Form State (Requirement 1)
  const [newProdName, setNewProdName] = useState('iPhone 15');
  const [newProdStorage, setNewProdStorage] = useState('128GB');
  const [newProdCondition, setNewProdCondition] = useState('99%');
  const [newProdCategory, setNewProdCategory] = useState('iPhone');
  const [newProdBasePrice, setNewProdBasePrice] = useState<number>(18000000);

  // Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset State (Requirement 2)
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
          color: newColor.trim(),
          battery_health: isNaN(numBat) ? 100 : numBat,
          cost_price: newCostPrice,
          selling_price: newSellingPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra khi thêm IMEI');

      setMessage({ type: 'success', text: `Đã thêm máy IMEI ${newImei} vào kho thành công!` });
      invalidateInventoryCache();
      setIsAddImeiOpen(false);
      resetAllFormStates();
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // 1. Handle Create Modular Product Model (Requirement 1)
  const handleCreateModularProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên dòng máy mẫu' });
      return;
    }

    try {
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

    try {
      setSavingEdit(true);
      const res = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemToEdit.id,
          selling_price: editSellingPrice,
          cost_price: canSeeCost ? editCostPrice : undefined,
          battery_health: editBattery,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi cập nhật giá');

      setMessage({ type: 'success', text: `Đã cập nhật máy IMEI ${itemToEdit.imei} thành công!` });
      invalidateInventoryCache();
      setItemToEdit(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteImei = async (id: string, imei: string) => {
    if (!confirm(`Bạn có chắc muốn xóa mã máy IMEI ${imei} khỏi kho?`)) return;

    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa máy');
      invalidateInventoryCache();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter with Strict Search & Sort A-Z
  const filteredInventory = useMemo(() => {
    const list = inventory.filter((item) => {
      return strictProductMatch(item.product_name || '', item.imei, item.color, search);
    });
    return sortItemsAZ(list, (item) => item.product_name || '');
  }, [inventory, search]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-gray-950 text-white rounded-xl">
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
              Quản Lý Tồn Kho Theo Mã IMEI & Sắp Xếp A-Z
            </h2>
            <p className="text-xs text-gray-500">
              Quản lý từng máy theo IMEI, thông số dòng máy độc lập, màu sắc và % Pin thực tế.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center space-x-1"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>+ Tạo Mẫu Máy</span>
          </button>
          <button
            onClick={() => setIsAddImeiOpen(true)}
            className="px-4 py-2 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Thêm Máy Vào Kho</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-semibold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo Tên, 15 số IMEI, Màu sắc..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none"
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
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none"
            >
              <option value="all">Tất cả Trạng thái máy</option>
              <option value="in_stock">🟢 Còn hàng (Sẵn sàng bán)</option>
              <option value="sold">⚪ Đã bán</option>
              <option value="warranty">🟡 Đang bảo hành</option>
              <option value="returned">🔴 Đã hoàn trả</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-gray-400">Đang tải kho máy...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-16 text-xs text-gray-500">
            Không tìm thấy máy nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Mã IMEI</th>
                  <th className="px-4 py-3">Dòng Sản Phẩm</th>
                  <th className="px-4 py-3">Thuộc Tính & Pin</th>
                  <th className="px-4 py-3">Giá Niêm Yết</th>
                  {canSeeCost && <th className="px-4 py-3">Giá Vốn Nhập</th>}
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map((item) => {
                  const isInStock = item.status === 'in_stock';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-4 py-3 font-extrabold text-gray-950 font-mono">
                        {item.imei}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-gray-950 text-xs sm:text-sm">{item.product_name}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold">
                          {item.category}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="flex flex-wrap items-center gap-1">
                          {item.color && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-900 rounded text-[10px] font-bold">
                              {item.color}
                            </span>
                          )}
                          {item.storage && (
                            <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-[10px] font-bold font-mono">
                              {item.storage}
                            </span>
                          )}
                          {item.condition && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                              {item.condition}
                            </span>
                          )}
                        </div>
                        {item.battery_health && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-1">
                            🔋 Pin: {item.battery_health}%
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-black text-sm text-gray-950 font-mono">
                        {formatVND(item.selling_price)}
                      </td>
                      {canSeeCost && (
                        <td className="px-4 py-3 font-bold text-rose-700 font-mono">
                          {formatVND(item.cost_price)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isInStock
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'sold'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isInStock
                            ? '● Còn hàng'
                            : item.status === 'sold'
                            ? 'Đã bán'
                            : 'Đang bảo hành'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {canSeeCost && isInStock && (
                            <button
                              onClick={() => openEditModal(item)}
                              title="Sửa giá bán / giá vốn"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdminOrOwner && isInStock && (
                            <button
                              onClick={() => handleDeleteImei(item.id, item.imei)}
                              title="Xóa máy khỏi kho"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
        )}
      </div>

      {/* 1. Modal Modular Product Model Creation (Requirement 1) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200">
            <div className="px-5 py-4 bg-gray-950 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Tạo Mẫu Sản Phẩm (Thông Số Độc Lập)</h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateModularProduct} className="p-5 space-y-3.5 text-xs">
              
              {/* [Tên dòng máy] */}
              <div>
                <label className="block text-xs font-black text-gray-900 mb-1">
                  1. Tên dòng máy (VD: iPhone 11, iPhone 15 Pro Max) *
                </label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="VD: iPhone 11, iPad Air 5..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-950"
                  required
                  autoFocus
                />
              </div>

              {/* [Dung lượng] & [Tình trạng] */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    2. Dung lượng *
                  </label>
                  <select
                    value={newProdStorage}
                    onChange={(e) => setNewProdStorage(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_MASTER_STORAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    3. Tình trạng *
                  </label>
                  <select
                    value={newProdCondition}
                    onChange={(e) => setNewProdCondition(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_MASTER_CONDITIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* [Danh mục] */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  4. Danh mục sản phẩm
                </label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                >
                  {DEFAULT_MASTER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Base Price */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Giá bán tham chiếu cơ bản
                </label>
                <MoneyInput
                  value={newProdBasePrice}
                  onValueChange={(num) => setNewProdBasePrice(num)}
                  placeholder="0"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold font-mono"
                />
              </div>

              <div className="p-2.5 bg-gray-50 rounded-xl border text-[11px] text-gray-600">
                Tên hiển thị: <b className="text-gray-900 font-mono">{formatProductTitle(newProdName, newProdStorage, newProdCondition)}</b>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200">
            <div className="px-5 py-4 bg-gray-950 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Thêm Máy Mới Vào Kho (Nhập Lẻ)</h3>
              <button
                onClick={() => setIsAddImeiOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateImei} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn mẫu sản phẩm *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold"
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
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mã IMEI (15 số) *
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newImei}
                    onChange={(e) => setNewImei(e.target.value)}
                    placeholder="VD: 359123456789012"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Quét</span>
                  </button>
                </div>
              </div>

              {/* Color & Battery */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Màu sắc</label>
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="VD: Titan Tự Nhiên, Gold..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">% Pin</label>
                  <input
                    type="number"
                    value={newBattery}
                    onChange={(e) => setNewBattery(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold font-mono"
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              {canSeeCost && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-rose-800 mb-1">Giá vốn *</label>
                    <MoneyInput
                      value={newCostPrice}
                      onValueChange={(num) => setNewCostPrice(num)}
                      placeholder="0"
                      className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-rose-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 mb-1">Giá bán *</label>
                    <MoneyInput
                      value={newSellingPrice}
                      onValueChange={(num) => setNewSellingPrice(num)}
                      placeholder="0"
                      className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-emerald-700 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddImeiOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-200">
            <div className="px-5 py-4 bg-gray-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">Chỉnh Sửa Giá & Thông Số IMEI</h3>
              </div>
              <button
                onClick={() => setItemToEdit(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriceEdit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <div className="font-bold text-gray-950 text-sm">{itemToEdit.product_name}</div>
                <div className="text-[11px] font-mono text-gray-600">Mã IMEI: <b>{itemToEdit.imei}</b></div>
                <div className="text-[10px] text-gray-500">{itemToEdit.storage} • {itemToEdit.color} • {itemToEdit.condition}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">
                  Giá niêm yết bán ra *
                </label>
                <MoneyInput
                  value={editSellingPrice}
                  onValueChange={(num) => setEditSellingPrice(num)}
                  placeholder="0"
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-emerald-700 font-mono"
                />
              </div>

              {canSeeCost && (
                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1">
                    Giá vốn nhập vào
                  </label>
                  <MoneyInput
                    value={editCostPrice}
                    onValueChange={(num) => setEditCostPrice(num)}
                    placeholder="0"
                    className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-rose-700 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Dung lượng Pin (%)
                </label>
                <input
                  type="number"
                  value={editBattery}
                  onChange={(e) => setEditBattery(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold font-mono"
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setItemToEdit(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-gray-950 hover:bg-black text-white rounded-xl font-bold shadow transition"
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
