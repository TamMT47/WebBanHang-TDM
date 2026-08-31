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
  Crown,
  RotateCcw,
  AlertOctagon,
  Lock,
  Sparkles,
  Database
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface UsersViewProps {
  currentUser: any;
}

export default function UsersView({ currentUser }: UsersViewProps) {
  const isAdminOrOwner = currentUser && ['admin', 'owner'].includes(currentUser.role);

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

  // System Factory Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [wipeCustomers, setWipeCustomers] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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
          password: editPassword ? editPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật tài khoản');

      setMessage({ type: 'success', text: `Đã cập nhật tài khoản "${editingUser.username}" thành công!` });
      setIsEditUserOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (userToDelete: any) => {
    if (userToDelete.id === currentUser?.id) {
      alert('Không thể tự xóa tài khoản của chính bạn!');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userToDelete.full_name}" (@${userToDelete.username})?`)) {
      return;
    }

    try {
      setMessage(null);
      const res = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xóa tài khoản');

      setMessage({ type: 'success', text: `Đã xóa tài khoản "${userToDelete.username}" thành công!` });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditRole(u.role);
    setEditPassword('');
    setIsEditUserOpen(true);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmText.trim().toUpperCase() !== 'XAC NHAN XOA') {
      setResetError('Vui lòng gõ chính xác: XAC NHAN XOA');
      return;
    }

    try {
      setResetSubmitting(true);
      setResetError(null);
      const res = await fetch('/api/system/reset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetPassword,
          confirmationText: resetConfirmText.trim().toUpperCase(),
          wipeCustomers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa dữ liệu');

      setIsResetModalOpen(false);
      setResetPassword('');
      setResetConfirmText('');
      setMessage({ type: 'success', text: data.message });
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetSubmitting(false);
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
              Quản Lý Tài Khoản & Cài Đặt Hệ Thống
            </h2>
            <p className="text-xs text-slate-400">
              Cấp quyền truy cập hệ thống TD MOBILE STORE theo 4 cấp bậc và công cụ bảo trì dữ liệu.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isAdminOrOwner && (
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 badge-nowrap shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Khởi Chạy Chính Thức</span>
            </button>
          )}

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 rounded-xl text-xs font-black shadow-glow-cyan transition flex items-center space-x-1.5 self-start sm:self-auto badge-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4 text-slate-950 font-black" />
            <span>+ Cấp Tài Khoản Mới</span>
          </button>
        </div>
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
            <span className="text-[11px] text-slate-400 mt-1 block">Toàn quyền hệ thống, xem giá vốn, doanh thu, lợi nhuận, sổ quỹ, quản lý tài khoản & reset kho/công nợ.</span>
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
                      <td className="px-4 py-3.5 text-slate-300 font-medium">
                        {u.order_count || 0} đơn hàng
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Sửa thông tin / Đổi mật khẩu"
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Xóa tài khoản"
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
        )}
      </div>

      {/* Danger Zone: Factory Reset for Production Launch */}
      {isAdminOrOwner && (
        <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-rose-500/30 bg-rose-500/5 shadow-2xl space-y-3">
          <div className="flex items-center space-x-2.5 text-rose-400">
            <AlertOctagon className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-wide">
              Khu Vực Quản Trị Đặc Biệt: Đưa Hệ Thống Vào Hoạt Động Chính Thức
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Tính năng này cho phép chủ cửa hàng <b>xóa sạch toàn bộ dữ liệu thử nghiệm</b> (kho hàng test, hóa đơn bán lẻ, sổ quỹ thu/chi và đặt lại toàn bộ công nợ khách hàng & NCC về 0 đ) để bắt đầu nhập kho hàng thật phục vụ kinh doanh chính thức. Tài khoản đăng nhập được giữ nguyên an toàn 100%.
          </p>
          <div>
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-glow-rose transition flex items-center space-x-2 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>🧹 XÓA SẠCH DỮ LIỆU TEST & RESET HỆ THỐNG VỀ 0</span>
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Cấp Tài Khoản Mới</span>
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Họ và tên nhân viên *
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên đăng nhập *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="VD: sale01, quanly01"
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
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vai trò phân quyền *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="staff">🟢 Staff - Nhân viên bán hàng (Ẩn giá vốn & sổ quỹ)</option>
                  <option value="manager">🔵 Manager - Quản lý (Xem giá vốn & sổ quỹ)</option>
                  <option value="owner">🟣 Owner - Chủ cửa hàng (Toàn quyền)</option>
                  <option value="admin">🔴 Admin - Quản trị viên cao nhất</option>
                </select>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-glow-cyan"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                <span>Chỉnh Sửa Tài Khoản @{editingUser.username}</span>
              </h3>
              <button
                onClick={() => setIsEditUserOpen(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Họ và tên nhân viên *
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Đổi mật khẩu mới (Bỏ trống nếu giữ nguyên)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (nếu muốn đổi)..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vai trò phân quyền *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="staff">🟢 Staff - Nhân viên bán hàng (Ẩn giá vốn & sổ quỹ)</option>
                  <option value="manager">🔵 Manager - Quản lý (Xem giá vốn & sổ quỹ)</option>
                  <option value="owner">🟣 Owner - Chủ cửa hàng (Toàn quyền)</option>
                  <option value="admin">🔴 Admin - Quản trị viên cao nhất</option>
                </select>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-glow-cyan"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Factory Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 bg-rose-950 text-white flex items-center justify-between border-b border-rose-800">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-black uppercase">Xác Nhận Khởi Chạy Hoạt Động Chính Thức</h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteReset} className="p-5 space-y-3.5 text-xs">
              <div className="p-3.5 bg-rose-500/10 rounded-2xl border border-rose-500/30 text-rose-300 space-y-1.5 leading-relaxed">
                <div className="font-black text-rose-400 uppercase text-[11px] flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>CẢNH BÁO XÓA TOÀN BỘ DỮ LIỆU THỬ NGHIỆM:</span>
                </div>
                <p>• Toàn bộ máy trong <b>Kho Hàng & Tồn kho IMEI</b> sẽ bị xóa sạch.</p>
                <p>• Toàn bộ <b>Hóa đơn bán lẻ (#HD) & Phiếu nhập (#NH)</b> sẽ bị xóa sạch.</p>
                <p>• Toàn bộ <b>Sổ quỹ thu / chi</b> sẽ được đặt về 0 đ.</p>
                <p>• Toàn bộ <b>Công nợ của Khách hàng & NCC</b> sẽ được đặt về 0 đ.</p>
                <p className="text-emerald-300 font-bold">✓ Các tài khoản đăng nhập Admin & Nhân viên được giữ nguyên an toàn.</p>
              </div>

              {resetError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500 text-rose-200 rounded-xl font-bold">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  1. Mật khẩu tài khoản của bạn *
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Nhập mật khẩu tài khoản hiện tại..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-rose-400 mb-1">
                  2. Nhập chính xác chuỗi xác nhận: <span className="text-white font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">XAC NHAN XOA</span>
                </label>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Gõ: XAC NHAN XOA"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-rose-500 uppercase font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-glow-rose transition active:scale-95 disabled:opacity-50"
                >
                  {resetSubmitting ? 'Đang Xóa Dữ Liệu...' : '🚨 TIẾN HÀNH XÓA TOÀN BỘ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
