'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Smartphone,
  Save,
  Camera
} from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Product, Partner, PaymentMethod } from '@/types/database';
import MoneyInput from '@/components/ui/MoneyInput';
import ScannerModal from '@/components/ScannerModal';

interface ImportViewProps {
  user: any;
}

export default function ImportView({ user }: ImportViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  // Selected Product
  const [selectedProductId, setSelectedProductId] = useState('');
  const [storage, setStorage] = useState('128GB');
  const [color, setColor] = useState('Titan Tự Nhiên');
  const [condition, setCondition] = useState('99%');
  const [batteryHealth, setBatteryHealth] = useState(100);
  const [costPrice, setCostPrice] = useState<number>(18500000);
  const [sellingPrice, setSellingPrice] = useState<number>(21500000);
  const [imeiListText, setImeiListText] = useState('');

  // Payment
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [note, setNote] = useState('');

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Fetch Products & Suppliers
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, suppRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/partners?type=supplier'),
      ]);
      const prodData = await prodRes.json();
      const suppData = await suppRes.json();

      setProducts(prodData.products || []);
      setSuppliers(suppData.partners || []);
      if (prodData.products && prodData.products.length > 0) {
        setSelectedProductId(prodData.products[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parsedImeis = imeiListText
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const totalCost = parsedImeis.length * costPrice;
  const debtAdded = Math.max(0, totalCost - paidAmount);

  const handleScanImei = (scannedImei: string) => {
    setImeiListText((prev) => (prev ? `${prev}\n${scannedImei}` : scannedImei));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn dòng máy nhập' });
      return;
    }
    if (parsedImeis.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng nhập ít nhất 1 mã IMEI' });
      return;
    }
    if (!supplierId && (!supplierName || !supplierPhone)) {
      setMessage({ type: 'error', text: 'Vui lòng chọn hoặc nhập thông tin Nhà cung cấp' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const items = parsedImeis.map((imei) => ({
        product_id: selectedProductId,
        imei,
        cost_price: costPrice,
        selling_price: sellingPrice,
        color,
        storage,
        condition,
        battery_health: batteryHealth,
      }));

      const payload = {
        orderType: 'import',
        supplier: supplierId
          ? { id: supplierId }
          : { name: supplierName.trim(), phone: supplierPhone.trim() },
        items,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        note,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi nhập kho');
      }

      setMessage({
        type: 'success',
        text: `Đã nhập kho thành công ${parsedImeis.length} máy! Mã phiếu: ${data.code}`,
      });

      // Reset
      setImeiListText('');
      setPaidAmount(0);
      setNote('');
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
            Nhập Hàng Vào Kho (Theo Mã IMEI)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Nhập danh sách mã IMEI từ Nhà cung cấp, ghi nhận phiếu chi và theo dõi công nợ kho.
          </p>
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Form: Product Specs & IMEI List (7 cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
            1. Chọn Dòng Máy & Quy Cách
          </h3>

          {/* Product Select */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Dòng máy Apple *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-gray-900"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          {/* Specs: Storage, Color, Condition, Battery */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Dung lượng</label>
              <input
                type="text"
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                placeholder="128GB"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Màu sắc</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Titan Tự Nhiên"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Ngoại hình</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              >
                <option value="99%">99% (Keng)</option>
                <option value="98%">98% (Phẩy nhẹ)</option>
                <option value="97%">97% (Cấn xước)</option>
                <option value="new">Mới 100% (Seal)</option>
                <option value="thanh_ly">Thanh lý</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">% Pin</label>
              <input
                type="number"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-bold"
              />
            </div>
          </div>

          {/* Pricing: Cost Price & Suggested Selling Price (Auto-formatted) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Giá vốn nhập vào / 1 máy *
              </label>
              <MoneyInput
                value={costPrice}
                onValueChange={(num) => setCostPrice(num)}
                placeholder="VD: 18.500.000"
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-rose-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Giá niêm yết bán ra / 1 máy *
              </label>
              <MoneyInput
                value={sellingPrice}
                onValueChange={(num) => setSellingPrice(num)}
                placeholder="VD: 21.500.000"
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black text-emerald-700 font-mono"
              />
            </div>
          </div>

          {/* IMEI Input List with Camera Scanner */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-800">
                Danh sách mã IMEI nhập kho ({parsedImeis.length} máy) *
              </label>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-2.5 py-1 bg-gray-950 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 hover:bg-black"
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Quét Mã IMEI</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={imeiListText}
              onChange={(e) => setImeiListText(e.target.value)}
              placeholder="Nhập hoặc dán danh sách IMEI (mỗi mã 1 dòng hoặc cách nhau bằng dấu phẩy)..."
              className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Right Form: Supplier & Payment Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
            2. Nhà Cung Cấp & Thanh Toán
          </h3>

          {/* Supplier Select or New */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Chọn Nhà cung cấp có sẵn
            </label>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                if (e.target.value) {
                  setSupplierName('');
                  setSupplierPhone('');
                }
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none"
            >
              <option value="">-- Nhập nhà cung cấp mới bên dưới --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone}) - Nợ: {formatVND(Math.abs(s.debt))}
                </option>
              ))}
            </select>
          </div>

          {!supplierId && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Tên NCC mới *"
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
              />
              <input
                type="tel"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="SĐT NCC *"
                className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono"
              />
            </div>
          )}

          {/* Totals Summary */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Số lượng máy:</span>
              <span className="font-bold text-gray-950">{parsedImeis.length} máy</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
              <span>TỔNG TIỀN VỐN NHẬP:</span>
              <span className="font-mono text-rose-700 text-lg">{formatVND(totalCost)}</span>
            </div>

            {/* Paid to Supplier Auto-formatted */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-800">Thanh toán cho NCC:</span>
              <div className="w-40">
                <MoneyInput
                  value={paidAmount}
                  onValueChange={(num) => setPaidAmount(num)}
                  placeholder="0"
                  className="px-3 py-2 text-right bg-white border-2 border-gray-900 rounded-xl text-sm font-black text-emerald-700 font-mono"
                />
              </div>
            </div>

            {debtAdded > 0 && (
              <div className="flex justify-between font-bold text-red-600 pt-1">
                <span>Còn nợ NCC:</span>
                <span className="font-mono">+{formatVND(debtAdded)}</span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Hình thức chi trả
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'transfer'
                    ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                💳 Chuyển khoản
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'cash'
                    ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                💵 Tiền mặt
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú phiếu nhập (Lô hàng Sài Gòn đợt 1...)"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || parsedImeis.length === 0}
            className="w-full py-3.5 bg-gray-950 hover:bg-black text-white rounded-2xl text-sm font-black shadow-lg shadow-gray-900/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <span>{submitting ? 'Đang Nhập Kho...' : 'XÁC NHẬN NHẬP KHO & LẬP PHIẾU'}</span>
          </button>
        </div>
      </form>

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanImei}
        title="Quét Barcode / QR IMEI Nhập Hàng"
      />
    </div>
  );
}
