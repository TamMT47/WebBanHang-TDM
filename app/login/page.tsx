'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
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
            Hệ Thống Quản Lý Bán Hàng & Bảo Hành Apple Chuyên Nghiệp
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-white">Đăng nhập tài khoản</h2>
            <p className="text-xs text-gray-400">Nhập thông tin nhân sự để truy cập vào hệ thống</p>
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
                  placeholder="Nhập tên tài khoản..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs font-bold text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none transition"
                  required
                  autoFocus
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
              className="w-full py-3 bg-white hover:bg-gray-100 text-gray-950 rounded-xl text-xs font-extrabold shadow-lg shadow-white/5 flex items-center justify-center space-x-2 transition disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{loading ? 'Đang Kiểm Tra Đăng Nhập...' : 'ĐĂNG NHẬP HỆ THỐNG'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-gray-600 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
          <span>TD MOBILE STORE © 2026 • Hệ thống bảo mật dữ liệu an toàn</span>
        </div>
      </div>
    </div>
  );
}
