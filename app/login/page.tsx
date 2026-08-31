'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Lock, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-[#080d1a] flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-[#080d1a] to-[#04070f] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-slate-700 shadow-glow-cyan p-2 overflow-hidden">
            <img src="/logo.png" alt="TD Mobile Store" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            TD MOBILE STORE
          </h1>
          <p className="text-xs font-medium text-slate-400">
            Hệ Thống Quản Lý Bán Hàng & Bảo Hành Apple Chuyên Nghiệp
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-white">Đăng nhập tài khoản</h2>
            <p className="text-xs text-slate-400">Nhập thông tin nhân sự để truy cập vào hệ thống</p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-2xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 rounded-2xl text-xs font-black shadow-glow-cyan flex items-center justify-center space-x-2 transition disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{loading ? 'Đang Kiểm Tra Đăng Nhập...' : 'ĐĂNG NHẬP HỆ THỐNG'}</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>TD MOBILE STORE © 2026 • Hệ thống bảo mật dữ liệu an toàn</span>
        </div>
      </div>
    </div>
  );
}
