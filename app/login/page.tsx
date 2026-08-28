'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Lock, User, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập không thành công');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4 selection:bg-white selection:text-black">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-800/40 via-gray-950 to-black pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 border border-gray-600 shadow-2xl">
            <span className="text-2xl font-black text-white tracking-tighter">TD</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            TD MOBILE STORE
          </h1>
          <p className="text-xs font-medium text-gray-400">
            Hệ Thống Quản Lý Bán Hàng & Kho Apple Chuyên Nghiệp
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-white">Đăng nhập tài khoản</h2>
            <p className="text-xs text-gray-400">Vui lòng đăng nhập để bắt đầu phiên làm việc</p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / owner / manager / staff"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs font-bold text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs font-bold text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-gray-100 text-gray-950 rounded-xl text-xs font-extrabold shadow-lg shadow-white/5 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{loading ? 'Đang Đăng Nhập...' : 'ĐĂNG NHẬP HỆ THỐNG'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Chips */}
          <div className="pt-4 border-t border-gray-800 space-y-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block text-center">
              Chọn nhanh tài khoản Demo
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('admin', 'admin123')}
                className={`p-2 rounded-xl border text-left text-xs transition ${
                  username === 'admin'
                    ? 'border-red-500/80 bg-red-950/40 text-red-200'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="font-bold">🔴 Admin</div>
                <div className="text-[10px] text-gray-500">admin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('owner', 'owner123')}
                className={`p-2 rounded-xl border text-left text-xs transition ${
                  username === 'owner'
                    ? 'border-purple-500/80 bg-purple-950/40 text-purple-200'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="font-bold">🟣 Chủ Shop</div>
                <div className="text-[10px] text-gray-500">owner / owner123</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('manager', 'manager123')}
                className={`p-2 rounded-xl border text-left text-xs transition ${
                  username === 'manager'
                    ? 'border-blue-500/80 bg-blue-950/40 text-blue-200'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="font-bold">🔵 Quản Lý</div>
                <div className="text-[10px] text-gray-500">manager / manager123</div>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('staff', 'staff123')}
                className={`p-2 rounded-xl border text-left text-xs transition ${
                  username === 'staff'
                    ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="font-bold">🟢 Nhân Viên</div>
                <div className="text-[10px] text-gray-500">staff / staff123 (Ẩn vốn)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-gray-600">
          TD MOBILE STORE © 2026 • Hệ thống bảo mật cao cấp
        </div>
      </div>
    </div>
  );
}
