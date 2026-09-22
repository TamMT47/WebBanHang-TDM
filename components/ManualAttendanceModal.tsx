'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Sun,
  Sunset,
  Briefcase,
  Trash2,
  Zap,
} from 'lucide-react';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: Array<{ id: string; full_name: string; role?: string; username?: string }>;
  initialUserId?: string;
  initialDate?: string;
  initialRecord?: any;
}

export default function ManualAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  users,
  initialUserId,
  initialDate,
  initialRecord,
}: ManualAttendanceModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [userId, setUserId] = useState<string>('');
  const [date, setDate] = useState<string>(todayStr);
  const [shift, setShift] = useState<string>('shift1');
  const [session, setSession] = useState<'morning' | 'afternoon'>('morning');
  const [checkInTime, setCheckInTime] = useState<string>('09:00');
  const [checkOutTime, setCheckOutTime] = useState<string>('12:00');
  const [workHours, setWorkHours] = useState<number>(3.0);
  const [otHours, setOtHours] = useState<number>(0);
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [earlyMinutes, setEarlyMinutes] = useState<number>(0);
  const [isOffDay, setIsOffDay] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('Nhân viên quên chấm công, quản lý bù công');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialRecord) {
        setUserId(initialRecord.user_id || initialUserId || (users[0]?.id || ''));
        const recDate = initialRecord.date
          ? typeof initialRecord.date === 'string'
            ? initialRecord.date.slice(0, 10)
            : new Date(initialRecord.date).toISOString().slice(0, 10)
          : initialDate || todayStr;
        setDate(recDate);
        setShift(initialRecord.shift || 'shift1');
        setSession(initialRecord.session || 'morning');

        if (initialRecord.check_in) {
          const inD = new Date(initialRecord.check_in);
          setCheckInTime(inD.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        } else {
          setCheckInTime('09:00');
        }

        if (initialRecord.check_out) {
          const outD = new Date(initialRecord.check_out);
          setCheckOutTime(outD.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        } else {
          setCheckOutTime(initialRecord.session === 'afternoon' ? '21:00' : '12:00');
        }

        setWorkHours(parseFloat(initialRecord.work_hours || '0') || 3.0);
        setOtHours(parseFloat(initialRecord.ot_hours || '0') || 0);
        setLateMinutes(parseInt(initialRecord.late_minutes || '0', 10) || 0);
        setEarlyMinutes(parseInt(initialRecord.early_minutes || '0', 10) || 0);
        setIsOffDay(Boolean(initialRecord.is_off_day));
        setReason(initialRecord.note || 'Chỉnh sửa ca chấm công');
      } else {
        setUserId(initialUserId || (users[0]?.id || ''));
        setDate(initialDate || todayStr);
        applyPreset('morning1');
        setReason('Nhân viên quên chấm công, quản lý bù công');
      }
    }
  }, [isOpen, initialRecord, initialUserId, initialDate, users]);

  const applyPreset = (type: string) => {
    switch (type) {
      case 'morning1':
        setShift('shift1');
        setSession('morning');
        setCheckInTime('09:00');
        setCheckOutTime('12:00');
        setWorkHours(3.0);
        setOtHours(0);
        setLateMinutes(0);
        setEarlyMinutes(0);
        break;
      case 'morning2':
        setShift('shift2');
        setSession('morning');
        setCheckInTime('09:00');
        setCheckOutTime('13:00');
        setWorkHours(4.0);
        setOtHours(0);
        setLateMinutes(0);
        setEarlyMinutes(0);
        break;
      case 'afternoon1':
        setShift('shift1');
        setSession('afternoon');
        setCheckInTime('13:00');
        setCheckOutTime('21:00');
        setWorkHours(8.0);
        setOtHours(0);
        setLateMinutes(0);
        setEarlyMinutes(0);
        break;
      case 'afternoon2':
        setShift('shift2');
        setSession('afternoon');
        setCheckInTime('14:00');
        setCheckOutTime('21:00');
        setWorkHours(7.0);
        setOtHours(0);
        setLateMinutes(0);
        setEarlyMinutes(0);
        break;
      case 'full1':
        setShift('shift1');
        setSession('afternoon');
        setCheckInTime('09:00');
        setCheckOutTime('21:00');
        setWorkHours(11.0);
        setOtHours(0);
        setLateMinutes(0);
        setEarlyMinutes(0);
        break;
      case 'ot':
        setOtHours((prev) => (prev > 0 ? prev : 2.0));
        break;
      default:
        break;
    }
  };

  const handleCalculateHours = (inTime: string, outTime: string) => {
    try {
      const [inH, inM] = inTime.split(':').map((v) => parseInt(v, 10));
      const [outH, outM] = outTime.split(':').map((v) => parseInt(v, 10));
      const diffM = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffM > 0) {
        const computed = Math.round((diffM / 60) * 10) / 10;
        setWorkHours(computed);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Vui lòng chọn nhân viên');
      return;
    }
    if (!date) {
      setError('Vui lòng chọn ngày làm việc');
      return;
    }
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do chỉnh sửa/bù công');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        attendance_id: initialRecord?.id || undefined,
        user_id: userId,
        date,
        shift,
        session,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        work_hours: workHours,
        ot_hours: otHours,
        late_minutes: lateMinutes,
        early_minutes: earlyMinutes,
        is_off_day: isOffDay,
        reason: reason.trim(),
      };

      const res = await fetch('/api/attendance/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu dữ liệu bù công');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialRecord?.id) return;
    if (!confirm('Bạn có chắc chắn muốn xóa lượt chấm công này?')) return;

    try {
      setDeleting(true);
      setError(null);
      const res = await fetch(`/api/attendance/adjust?id=${initialRecord.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xóa lượt chấm công');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-glow-cyan">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 font-extrabold text-[10px] rounded-md border border-cyan-500/30 badge-nowrap uppercase">
                  QUẢN LÝ / ADMIN
                </span>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  {initialRecord ? 'Chỉnh Sửa Lượt Chấm Công' : 'Bù Công & Chỉnh Sửa Giờ Làm'}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Tự động cập nhật ngày công và bảng tính lương tháng của nhân viên
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User & Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-200 uppercase tracking-wide mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nhân viên *</span>
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={Boolean(initialRecord)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                required
              >
                <option value="">-- Chọn nhân viên --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role === 'staff' ? 'Nhân viên' : u.role === 'manager' ? 'Quản lý' : u.role === 'owner' ? 'Chủ shop' : 'Admin'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-200 uppercase tracking-wide mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ngày làm việc *</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wide">
              Chọn nhanh ca chuẩn
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('morning1')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition"
              >
                <div className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Sáng Ca 1</span>
                </div>
                <div className="text-[10px] text-slate-400">09:00-12:00 (3h)</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('morning2')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition"
              >
                <div className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Sáng Ca 2</span>
                </div>
                <div className="text-[10px] text-slate-400">09:00-13:00 (4h)</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('afternoon1')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition"
              >
                <div className="text-[11px] font-bold text-cyan-300 flex items-center space-x-1">
                  <Sunset className="w-3.5 h-3.5" />
                  <span>Chiều Ca 1</span>
                </div>
                <div className="text-[10px] text-slate-400">13:00-21:00 (8h)</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('afternoon2')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition"
              >
                <div className="text-[11px] font-bold text-cyan-300 flex items-center space-x-1">
                  <Sunset className="w-3.5 h-3.5" />
                  <span>Chiều Ca 2</span>
                </div>
                <div className="text-[10px] text-slate-400">14:00-21:00 (7h)</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('full1')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition"
              >
                <div className="text-[11px] font-bold text-emerald-300 flex items-center space-x-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Full Cả Ngày</span>
                </div>
                <div className="text-[10px] text-slate-400">09:00-21:00 (11h)</div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('ot')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition"
              >
                <div className="text-[11px] font-bold text-purple-300 flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Tăng Ca OT</span>
                </div>
                <div className="text-[10px] text-slate-400">+2h OT (150%)</div>
              </button>
            </div>
          </div>

          {/* Time In / Time Out */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Giờ Vào Ca</span>
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => {
                    setCheckInTime(e.target.value);
                    handleCalculateHours(e.target.value, checkOutTime);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Giờ Ra Ca</span>
                </label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => {
                    setCheckOutTime(e.target.value);
                    handleCalculateHours(checkInTime, e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Giờ Làm (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={workHours}
                  onChange={(e) => setWorkHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-emerald-400 font-sans focus:outline-none focus:border-emerald-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Tăng ca OT (h)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="12"
                  value={otHours}
                  onChange={(e) => setOtHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-amber-300 font-sans focus:outline-none focus:border-amber-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Phạt Muộn (phút)
                </label>
                <input
                  type="number"
                  min="0"
                  value={lateMinutes}
                  onChange={(e) => setLateMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-rose-300 font-sans focus:outline-none focus:border-rose-500 text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Về Sớm (phút)
                </label>
                <input
                  type="number"
                  min="0"
                  value={earlyMinutes}
                  onChange={(e) => setEarlyMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 font-sans focus:outline-none focus:border-slate-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* Off-day Checkbox */}
          <div className="flex items-center space-x-2.5 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <input
              type="checkbox"
              id="isOffDayCheck"
              checked={isOffDay}
              onChange={(e) => setIsOffDay(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500"
            />
            <label htmlFor="isOffDayCheck" className="text-xs font-bold text-purple-200 cursor-pointer">
              🎉 Đi làm vào ngày Off đã đăng ký (Được tính thưởng +1 ngày công tính lương)
            </label>
          </div>

          {/* Reason / Note */}
          <div>
            <label className="block text-xs font-black text-slate-200 uppercase tracking-wide mb-1">
              Lý do chỉnh sửa / Bù công *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Nhân viên quên chấm công vào ca sáng, Sửa công bù..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-between space-x-2">
            {initialRecord?.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
                className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Đang xóa...' : 'Xóa ca này'}</span>
              </button>
            )}

            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || deleting}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black rounded-xl text-xs shadow-glow-cyan transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Đang Lưu...' : 'Lưu Thay Đổi & Cập Nhật Công'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
