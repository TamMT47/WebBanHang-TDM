'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Key,
  Shield,
  CheckCircle2,
  AlertTriangle,
  User,
  Crown
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface UsersViewProps {
  currentUser: any;
}

export default function UsersView({ currentUser }: UsersViewProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editPassword, setEditPassword] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          full_name: newFullName.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo tài khoản');

      setMessage({ type: 'success', text: `Đã tạo tài khoản "${newUsername}" thành công!` });
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setMessage(null);
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editFullName.trim(),
          role: editRole,
          password: editPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật tài khoản');

      setMessage({ type: 'success', text: `Đã cập nhật thông tin tài khoản "${editingUser.username}"!` });
      setIsEditUserOpen(false);
      setEditingUser(null);
      setEditPassword('');
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}"?`)) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xóa tài khoản');

      setMessage({ type: 'success', text: `Đã xóa tài khoản "${username}"` });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Quản Trị Viên (Admin)', class: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' };
      case 'owner':
        return { label: 'Chủ Cửa Hàng (Owner)', class: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
      case 'manager':
        return { label: 'Quản Lý (Manager)', class: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' };
      case 'staff':
      default:
        return { label: 'Nhân Viên Bán Hàng (Staff)', class: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Crown className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Quản Lý Tài Khoản & Phân Quyền
            </h2>
            <p className="text-xs text-slate-400">
              Cấp quyền truy cập hệ thống TD MOBILE STORE theo 4 cấp bậc (Admin, Owner, Manager, Staff).
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1.5 self-start sm:self-auto badge-nowrap active:scale-95"
        >
          <Plus className="w-4 h-4 text-slate-950 font-black" />
          <span>+ Cấp Tài Khoản Mới</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm ${
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
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Role Permissions Matrix Explanatory Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 text-xs space-y-3 shadow-xl">
        <div className="font-black text-slate-300 uppercase text-[11px] tracking-wider">
          Chính Sách Bảo Mật Kinh Doanh Theo Vai Trò:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-rose-400 block badge-nowrap">🔴 Admin / 🟣 Owner:</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Toàn quyền hệ thống, xem giá vốn, doanh thu, lợi nhuận, sổ quỹ, quản lý tài khoản & phân quyền.</span>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-bold text-cyan-300 block badge-nowrap">🔵 Manager (Quản lý):</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Xem giá vốn, doanh thu, lợi nhuận, sổ quỹ, tạo đơn nhập hàng. Không thể xóa sửa tài khoản người khác.</span>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 col-span-1 sm:col-span-2">
            <span className="font-bold text-emerald-400 block badge-nowrap">🟢 Staff (Nhân viên bán hàng):</span>
            <span className="text-[11px] text-slate-400 mt-1 block"><b className="text-rose-400">ẨN HOÀN TOÀN</b> giá nhập vốn, lợi nhuận, sổ quỹ, báo cáo tài chính. Chỉ được thao tác Bán hàng (POS), Tra cứu IMEI tồn kho & Tra cứu bảo hành.</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">Đang tải danh sách tài khoản...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Họ và tên</th>
                  <th className="px-4 py-3.5">Tên đăng nhập</th>
                  <th className="px-4 py-3.5">Vai trò phân quyền</th>
                  <th className="px-4 py-3.5">Số đơn đã lập</th>
                  <th className="px-4 py-3.5">Ngày tạo</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => {
                  const roleMeta = getRoleLabel(u.role);
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition duration-150">
                      <td className="px-4 py-3.5 font-bold text-white">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm badge-nowrap">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div>{u.full_name}</div>
                            {isCurrent && (
                              <span className="text-[10px] text-cyan-400 font-semibold badge-nowrap">(Tài khoản hiện tại)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-300 badge-nowrap">
                        @{u.username}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold badge-nowrap ${roleMeta.class}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-200 badge-nowrap">
                        {u.total_orders_created || 0} đơn
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 badge-nowrap">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditFullName(u.full_name);
                            setEditRole(u.role);
                            setIsEditUserOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
                          title="Chỉnh sửa tài khoản"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Cấp Tài Khoản Mới</h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Họ và tên nhân viên *
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Nam"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên đăng nhập (Username) *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="VD: namnv"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mật khẩu khởi tạo *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vai trò & Quyền hạn
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  <option value="staff">Nhân Viên Bán Hàng (Staff) - Ẩn vốn & lợi nhuận</option>
                  <option value="manager">Quản Lý Cửa Hàng (Manager)</option>
                  <option value="owner">Chủ Cửa Hàng (Owner)</option>
                  <option value="admin">Quản Trị Viên (Admin)</option>
                </select>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Chỉnh Sửa Tài Khoản @{editingUser.username}</h3>
              <button
                onClick={() => setIsEditUserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vai trò phân quyền
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                >
                  <option value="staff">Nhân Viên Bán Hàng (Staff)</option>
                  <option value="manager">Quản Lý Cửa Hàng (Manager)</option>
                  <option value="owner">Chủ Cửa Hàng (Owner)</option>
                  <option value="admin">Quản Trị Viên (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Đặt lại mật khẩu mới (Bỏ trống nếu không đổi)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan"
                >
                  Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
