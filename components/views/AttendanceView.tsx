'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Sun,
  Sunset,
  ShieldCheck,
  RotateCw,
  Sparkles,
  User,
  Settings,
  Coffee,
  Check,
  AlertCircle,
  Users
} from 'lucide-react';
import { ShiftType } from '@/types/database';

interface AttendanceViewProps {
  user: any;
}

export default function AttendanceView({ user }: AttendanceViewProps) {
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);
  const isManagerOrAbove = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isStaff = user?.role === 'staff';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Network & IP Info
  const [clientIp, setClientIp] = useState('');
  const [storeWifiIp, setStoreWifiIp] = useState('');
  const [isWifiMatch, setIsWifiMatch] = useState(false);

  // Admin Config State
  const [editingWifiIp, setEditingWifiIp] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Shift & Records State
  const [assignedShift, setAssignedShift] = useState<string>('shift1');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [morningRecord, setMorningRecord] = useState<any>(null);
  const [afternoonRecord, setAfternoonRecord] = useState<any>(null);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [isTodayOff, setIsTodayOff] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    active_days: 0,
    off_days_worked: 0,
    total_shifts: 0,
    total_work_hours: 0,
    total_ot_hours: 0,
    actual_days: 0,
  });

  // Off-days State
  const [offDaysData, setOffDaysData] = useState<{
    currentWeek: any;
    nextWeek: any;
    offDays: any[];
    users: any[];
    canEditCurrentWeek: boolean;
  } | null>(null);
  const [savingOffDay, setSavingOffDay] = useState(false);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDateStr(
        now.toLocaleDateString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/attendance');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải dữ liệu chấm công');

      setClientIp(data.clientIp || '');
      setStoreWifiIp(data.storeWifiIp || '');
      setEditingWifiIp(data.storeWifiIp || '');
      setIsWifiMatch(data.isWifiMatch ?? false);
      setAssignedShift(data.assignedShift || 'shift1');
      setWeekNumber(data.weekNumber || 1);
      setMorningRecord(data.morningRecord || null);
      setAfternoonRecord(data.afternoonRecord || null);
      setTodayRecords(data.todayRecords || []);
      setIsTodayOff(data.isTodayOff || false);
      setHistory(data.history || []);
      if (data.summary) setSummary(data.summary);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffDaysData = async () => {
    try {
      const res = await fetch('/api/attendance/off-days');
      const data = await res.json();
      if (res.ok) {
        setOffDaysData(data);
      }
    } catch (err) {
      console.error('Error fetching off-days:', err);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchOffDaysData();
  }, []);

  const handleSaveStoreWifiIp = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'store_wifi_ip',
          value: editingWifiIp.trim(),
          description: 'Địa chỉ IP Wifi cửa hàng dùng cho chấm công',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu cấu hình Wifi');

      setMessage({ type: 'success', text: 'Đã lưu cấu hình IP Wifi cửa hàng thành công!' });
      fetchAttendanceData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  // Session Check In handler
  const handleSessionCheckIn = async (session: 'morning' | 'afternoon') => {
    try {
      setSubmitting(true);
      setMessage(null);
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift: assignedShift, session }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi chấm công vào ca');

      setMessage({ type: 'success', text: data.message });
      fetchAttendanceData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Session Check Out handler
  const handleSessionCheckOut = async (session: 'morning' | 'afternoon', recordId?: string) => {
    try {
      setSubmitting(true);
      setMessage(null);
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, attendance_id: recordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi chấm công ra ca');

      setMessage({ type: 'success', text: data.message });
      fetchAttendanceData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterOffDay = async (targetUserId: string, date: string, weekStr: string) => {
    try {
      setSavingOffDay(true);
      setMessage(null);
      const res = await fetch('/api/attendance/off-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId, date, week_str: weekStr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi đăng ký ngày Off');

      setMessage({ type: 'success', text: data.message });
      fetchOffDaysData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingOffDay(false);
    }
  };

  const formatHourMinute = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const shiftLabel =
    assignedShift === 'shift1'
      ? 'Ca 1 (Sáng: 08:30-11:30 | Chiều: 13:00-21:00)'
      : assignedShift === 'shift2'
      ? 'Ca 2 (Sáng: 08:30-13:00 | Chiều: 14:30-21:00)'
      : 'Ca Quản Lý (08:30 - 21:00)';

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* Alert Messages */}
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
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. KHUNG CHẤM CÔNG DẠNG DỌC (VERTICAL STACK - RESPONSIVE MOBILE) */}
      {/* ======================================================== */}
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl p-3.5 sm:p-4 space-y-3">
        
        {/* Khối 1: Thông tin nhân viên, Ca làm việc tuần này & Trạng thái Wifi */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs flex-shrink-0">
              {user?.full_name?.slice(0, 1) || 'NV'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-white">{user?.full_name || 'Nhân Viên'}</span>
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md text-[10px] font-bold uppercase">
                  {user?.role === 'admin' ? 'Admin' : user?.role === 'owner' ? 'Chủ Shop' : user?.role === 'manager' ? 'Quản Lý' : 'Nhân Viên'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs">
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-black">
                  Tuần {weekNumber}
                </span>
                <span className="font-bold text-slate-200">
                  {assignedShift === 'shift1' ? 'Ca 1' : assignedShift === 'shift2' ? 'Ca 2' : 'Ca Quản Lý'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  ({assignedShift === 'shift1' ? '08:30-11:30 | 13:00-21:00' : assignedShift === 'shift2' ? '08:30-13:00 | 14:30-21:00' : '08:30-21:00'})
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Realtime Clock */}
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 rounded-xl border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-xs font-black text-white">{currentTime || '--:--:--'}</span>
              <span className="text-[10px] text-slate-400 capitalize">({currentDateStr})</span>
            </div>

            {/* Wifi Status */}
            {isWifiMatch ? (
              <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wifi Shop: Sẵn sàng</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-2.5 py-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold">
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Chưa kết nối Wifi Shop</span>
              </div>
            )}

            {isTodayOff && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold">
                🎉 Ngày Off (+1 công)
              </span>
            )}
          </div>
        </div>

        {/* Khối 2: Nút bấm Chấm công Ca Sáng & Ca Chiều dàn đều rộng rãi theo chiều ngang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Card Ca Sáng */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-black text-xs text-white uppercase tracking-wider">CHẤM CÔNG CA SÁNG</span>
              </div>
              <span className="text-[11px] font-bold text-amber-300 font-sans">
                {assignedShift === 'shift1' ? '08:30 - 11:30' : assignedShift === 'shift2' ? '08:30 - 13:00' : '08:30 - 13:00'}
              </span>
            </div>

            {!morningRecord ? (
              <button
                type="button"
                onClick={() => handleSessionCheckIn('morning')}
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl text-xs shadow-md hover:brightness-110 active:scale-98 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>VÀO CA SÁNG</span>
              </button>
            ) : morningRecord.status === 'working' ? (
              <div className="space-y-2">
                <div className="text-center text-xs font-bold text-amber-300">
                  🟢 Đang làm việc (Vào lúc: {formatHourMinute(morningRecord.check_in)})
                </div>
                <button
                  type="button"
                  onClick={() => handleSessionCheckOut('morning', morningRecord.id)}
                  disabled={submitting}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>RA CA SÁNG (Nghỉ trưa)</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                  <span>Đã xong ca sáng:</span>
                </div>
                <div className="font-mono text-white font-bold">
                  {formatHourMinute(morningRecord.check_in)} - {formatHourMinute(morningRecord.check_out)}
                  <span className="text-emerald-400 ml-1 font-sans">({morningRecord.work_hours}h)</span>
                </div>
              </div>
            )}
          </div>

          {/* Card Ca Chiều */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sunset className="w-4 h-4 text-cyan-400" />
                <span className="font-black text-xs text-white uppercase tracking-wider">CHẤM CÔNG CA CHIỀU</span>
              </div>
              <span className="text-[11px] font-bold text-cyan-300 font-sans">
                {assignedShift === 'shift1' ? '13:00 - 21:00' : assignedShift === 'shift2' ? '14:30 - 21:00' : '13:00 - 21:00'}
              </span>
            </div>

            {!afternoonRecord ? (
              <button
                type="button"
                onClick={() => handleSessionCheckIn('afternoon')}
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-glow-cyan hover:brightness-110 active:scale-98 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>VÀO CA CHIỀU</span>
              </button>
            ) : afternoonRecord.status === 'working' ? (
              <div className="space-y-2">
                <div className="text-center text-xs font-bold text-cyan-300">
                  🟢 Đang làm việc (Vào lúc: {formatHourMinute(afternoonRecord.check_in)})
                </div>
                <button
                  type="button"
                  onClick={() => handleSessionCheckOut('afternoon', afternoonRecord.id)}
                  disabled={submitting}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>RA CA CHIỀU (Hết ngày)</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                  <span>Đã xong ca chiều:</span>
                </div>
                <div className="font-mono text-white font-bold">
                  {formatHourMinute(afternoonRecord.check_in)} - {formatHourMinute(afternoonRecord.check_out)}
                  <span className="text-emerald-400 ml-1 font-sans">
                    ({afternoonRecord.work_hours}h{afternoonRecord.ot_hours > 0 ? ` +${afternoonRecord.ot_hours}h OT` : ''})
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Khối 3: Ô chọn Đăng ký Off Tuần Tới nằm bên dưới & Nút Làm Mới */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-bold text-slate-200">
              Đăng ký ngày Off tuần tới ({offDaysData?.nextWeek?.weekStr || 'Tuần sau'}):
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {offDaysData?.nextWeek && (
              <select
                value={
                  (() => {
                    const match = offDaysData.offDays?.find(
                      (od) => od.user_id === user?.id && od.week_str === offDaysData.nextWeek.weekStr
                    );
                    if (!match?.date) return '';
                    return typeof match.date === 'string' ? match.date.slice(0, 10) : new Date(match.date).toISOString().slice(0, 10);
                  })()
                }
                onChange={(e) => {
                  if (e.target.value) {
                    handleRegisterOffDay(user?.id, e.target.value, offDaysData.nextWeek.weekStr);
                  }
                }}
                disabled={savingOffDay}
                className="flex-1 sm:flex-initial bg-slate-900 border border-slate-700 text-xs font-bold text-purple-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Chọn ngày Off --</option>
                {offDaysData.nextWeek.days?.map((d: any) => {
                  const isoVal = d.date || d.dateStr;
                  const label = `${d.dayName} (${d.formattedDate || d.formatted || isoVal})`;
                  return (
                    <option key={isoVal} value={isoVal}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}

            <button
              type="button"
              onClick={() => {
                fetchAttendanceData();
                fetchOffDaysData();
              }}
              title="Làm mới trạng thái"
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex-shrink-0"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. ADMIN DASHBOARD: CẤU HÌNH WIFI & QUẢN LÝ NGÀY OFF */}
      {/* ======================================================== */}
      {isManagerOrAbove && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Card Lưu IP Wifi Cửa Hàng */}
          <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-black text-white uppercase">Cài Đặt IP Wifi Cửa Hàng</h3>
              </div>
              {clientIp && (
                <button
                  type="button"
                  onClick={() => setEditingWifiIp(clientIp)}
                  className="text-[10px] text-cyan-400 hover:underline font-bold"
                >
                  Lấy IP máy hiện tại: {clientIp}
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editingWifiIp}
                onChange={(e) => setEditingWifiIp(e.target.value)}
                placeholder="VD: 14.169.123.45"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleSaveStoreWifiIp}
                disabled={savingSettings}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl text-xs transition shadow-glow-cyan active:scale-95 disabled:opacity-50 badge-nowrap"
              >
                {savingSettings ? 'Đang lưu...' : 'Lưu IP Wifi'}
              </button>
            </div>
          </div>

          {/* Card Quản lý Ngày Off của Nhân Viên */}
          <div className="lg:col-span-7 bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-black text-white uppercase">Quản Lý Ngày Off Nhân Viên (Tuần Này & Tuần Tới)</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase border-b border-slate-800">
                    <th className="pb-1.5 font-bold">Nhân Viên</th>
                    <th className="pb-1.5 font-bold">Off Tuần Này ({offDaysData?.currentWeek?.weekStr})</th>
                    <th className="pb-1.5 font-bold">Off Tuần Tới ({offDaysData?.nextWeek?.weekStr})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {offDaysData?.users?.map((u: any) => {
                    const curOff = offDaysData?.offDays?.find((od) => od.user_id === u.id && od.week_str === offDaysData.currentWeek?.weekStr);
                    const nextOff = offDaysData?.offDays?.find((od) => od.user_id === u.id && od.week_str === offDaysData.nextWeek?.weekStr);

                    const curVal = curOff?.date ? (typeof curOff.date === 'string' ? curOff.date.slice(0, 10) : new Date(curOff.date).toISOString().slice(0, 10)) : '';
                    const nextVal = nextOff?.date ? (typeof nextOff.date === 'string' ? nextOff.date.slice(0, 10) : new Date(nextOff.date).toISOString().slice(0, 10)) : '';

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2 font-bold text-white">{u.full_name}</td>
                        <td className="py-2">
                          <select
                            value={curVal}
                            onChange={(e) => {
                              if (e.target.value) handleRegisterOffDay(u.id, e.target.value, offDaysData.currentWeek.weekStr);
                            }}
                            className="bg-slate-950 border border-slate-700 text-[10px] font-bold text-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="">-- Chưa đăng ký --</option>
                            {offDaysData?.currentWeek?.days?.map((d: any) => {
                              const isoVal = d.date || d.dateStr;
                              return (
                                <option key={isoVal} value={isoVal}>
                                  {d.dayName} ({d.formattedDate || d.formatted || isoVal})
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="py-2">
                          <select
                            value={nextVal}
                            onChange={(e) => {
                              if (e.target.value) handleRegisterOffDay(u.id, e.target.value, offDaysData.nextWeek.weekStr);
                            }}
                            className="bg-slate-950 border border-slate-700 text-[10px] font-bold text-purple-300 rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="">-- Chưa đăng ký --</option>
                            {offDaysData?.nextWeek?.days?.map((d: any) => {
                              const isoVal = d.date || d.dateStr;
                              return (
                                <option key={isoVal} value={isoVal}>
                                  {d.dayName} ({d.formattedDate || d.formatted || isoVal})
                                </option>
                              );
                            })}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. LỊCH SỬ CHẤM CÔNG (BẢNG DẠNG DÒNG NẰM NGANG) */}
      {/* ======================================================== */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase">
              {isManagerOrAbove ? 'Lịch Sử Chấm Công Toàn Cửa Hàng' : 'Lịch Sử Chấm Công Của Bạn'}
            </h3>
          </div>
          <div className="text-[11px] text-slate-400">
            Tổng cộng: <b className="text-white font-sans">{summary.actual_days}</b> ngày công ({summary.total_work_hours}h làm việc • +{summary.total_ot_hours}h OT)
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400 animate-pulse">
            Đang tải dữ liệu chấm công...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Chưa có lượt chấm công nào được ghi nhận trong tháng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Ngày</th>
                  <th className="px-3.5 py-2.5">Nhân Viên</th>
                  <th className="px-3.5 py-2.5">Ca Làm</th>
                  <th className="px-3.5 py-2.5">Buổi</th>
                  <th className="px-3.5 py-2.5">Vào Ca</th>
                  <th className="px-3.5 py-2.5">Ra Ca</th>
                  <th className="px-3.5 py-2.5">Giờ Làm</th>
                  <th className="px-3.5 py-2.5">Vào Muộn</th>
                  <th className="px-3.5 py-2.5">Về Sớm</th>
                  <th className="px-3.5 py-2.5">Tăng Ca OT</th>
                  <th className="px-3.5 py-2.5">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {history.map((rec) => {
                  const dateFormatted = new Date(rec.date).toLocaleDateString('vi-VN');
                  const isLate = rec.late_minutes > 0;
                  const isEarly = rec.early_minutes > 0;
                  const hasOt = rec.ot_hours > 0;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-white">{dateFormatted}</td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-200">
                        {rec.user_name}
                        {rec.is_off_day && (
                          <span className="ml-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[9px] font-bold">
                            Ngày Off (+1)
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-300">
                        {rec.shift === 'shift1' ? 'Ca 1' : rec.shift === 'shift2' ? 'Ca 2' : 'Quản Lý'}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-cyan-300">
                        {rec.session === 'morning' ? 'Sáng' : 'Chiều'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-white">{formatHourMinute(rec.check_in)}</td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-white">{formatHourMinute(rec.check_out)}</td>
                      <td className="px-3.5 py-2.5 font-bold text-emerald-400 font-sans">
                        {rec.work_hours > 0 ? `${rec.work_hours}h` : '--'}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {isLate ? (
                          <span className="text-rose-400 font-bold">+{rec.late_minutes} phút</span>
                        ) : (
                          <span className="text-slate-500">Đúng giờ</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {isEarly ? (
                          <span className="text-amber-400 font-bold">-{rec.early_minutes} phút</span>
                        ) : (
                          <span className="text-slate-500">Đủ giờ</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {hasOt ? (
                          <span className="text-amber-400 font-bold font-sans">+{rec.ot_hours}h (150%)</span>
                        ) : (
                          <span className="text-slate-500">0h</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            rec.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {rec.status === 'completed' ? 'Hoàn thành' : 'Đang làm'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
