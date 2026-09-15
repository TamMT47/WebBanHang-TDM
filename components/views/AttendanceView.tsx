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
  Flame,
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

  // Shifts & Today State
  // Staff defaults to shift1, Manager defaults to manager
  const [selectedShift, setSelectedShift] = useState<ShiftType>(isStaff ? 'shift1' : 'manager');
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
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
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string>(user?.id || '');

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState<string>('');

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
      setTodayRecords(data.todayRecords || []);
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

  const handleUseCurrentIp = () => {
    if (clientIp) {
      setEditingWifiIp(clientIp);
    }
  };

  // Find currently active working shift
  const activeRecord = todayRecords.find((r) => !r.check_out);

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      setMessage(null);
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift: selectedShift }),
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

  const handleCheckOut = async () => {
    try {
      setSubmitting(true);
      setMessage(null);
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: activeRecord?.id }),
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

  // 2 Fulltime Shifts (11h) + Manager shift
  const fulltimeShifts = [
    {
      id: 'shift1',
      name: 'Ca 1 (Fulltime 11 Tiếng)',
      lunchBreak: 'Nghỉ trưa: 11:30 - 13:00 (1.5h)',
      detail: 'Sáng: 08:30 - 11:30 (3h) • Chiều: 13:00 - 21:00 (8h)',
      time: '08:30 - 21:00',
      duration: '11.0 giờ chuẩn',
      icon: Sun,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40',
      badge: 'Luân phiên Ca 1',
    },
    {
      id: 'shift2',
      name: 'Ca 2 (Fulltime 11 Tiếng)',
      lunchBreak: 'Nghỉ trưa: 13:00 - 14:30 (1.5h)',
      detail: 'Sáng: 08:30 - 13:00 (4.5h) • Chiều: 14:30 - 21:00 (6.5h)',
      time: '08:30 - 21:00',
      duration: '11.0 giờ chuẩn',
      icon: Sunset,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40',
      badge: 'Luân phiên Ca 2',
    },
  ];

  const managerShift = {
    id: 'manager',
    name: 'Ca Quản Lý (Fulltime 11 Tiếng)',
    lunchBreak: 'Linh hoạt theo phân công',
    detail: 'Toàn ca: 08:30 - 21:00 (11h chuẩn)',
    time: '08:30 - 21:00',
    duration: '11.0 giờ chuẩn',
    icon: ShieldCheck,
    color: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/40',
    badge: 'Quản Lý (Không xoay ca)',
  };

  // Get current user's registered off-day for next week and current week
  const myCurrentWeekOff = offDaysData?.offDays.find(
    (o) => o.user_id === user?.id && o.week_str === offDaysData?.currentWeek?.weekStr
  );
  const myNextWeekOff = offDaysData?.offDays.find(
    (o) => o.user_id === user?.id && o.week_str === offDaysData?.nextWeek?.weekStr
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      
      {/* Top Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-2xl shadow-glow-cyan">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
              Chấm Công Wifi Cửa Hàng & Phân Ca Fulltime (11H)
            </h2>
            <p className="text-xs text-slate-400">
              Chấm công 2 ca fulltime 11 tiếng luân phiên, đăng ký ngày Off tuần và tự động tính tăng ca sau 21:00 (OT 150%).
            </p>
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="flex items-center space-x-2 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 self-start sm:self-auto shadow-inner">
          <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-base font-black text-cyan-300 tracking-wider">
            {currentTime || '--:--:--'}
          </span>
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

      {/* ======================================================= */}
      {/* 1. WIFI CONNECTION STATUS BANNER */}
      {/* For Staff: Minimalist, NO IP numbers displayed */}
      {/* For Admin/Owner: Shows IP details */}
      {/* ======================================================= */}
      <div
        className={`p-4 rounded-3xl border transition-all duration-300 ${
          isWifiMatch
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-glow-emerald/10'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300 shadow-glow-rose/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-2xl ${
                isWifiMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isWifiMatch ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6 animate-pulse" />}
            </div>
            <div>
              <div className="font-black text-sm uppercase flex items-center space-x-2">
                <span>{isWifiMatch ? 'Đã Kết Nối Wifi Cửa Hàng (Hợp Lệ)' : 'Chưa Kết Nối Wifi Cửa Hàng'}</span>
                {isWifiMatch && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {isWifiMatch
                  ? 'Thiết bị của bạn đã kết nối đúng mạng Wifi cửa hàng TD Mobile Store. Bạn có thể chấm công ngay.'
                  : 'Vui lòng kết nối Wifi cửa hàng để chấm công! Nút chấm công sẽ bị khóa khi ở ngoài cửa hàng.'}
              </div>
            </div>
          </div>

          {/* ADMIN ONLY: Show IP addresses */}
          {!isStaff && (
            <div className="flex items-center space-x-2 text-xs">
              <div className="px-3 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">IP Của Bạn</span>
                <span className="font-mono font-bold text-cyan-300">{clientIp || 'Đang lấy...'}</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">IP Wifi Cửa Hàng</span>
                <span className="font-mono font-bold text-amber-300">{storeWifiIp || 'Chưa cài đặt'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* 2. ADMIN ONLY: STORE WIFI IP CONFIGURATION BOX */}
      {/* ======================================================= */}
      {isAdminOrOwner && (
        <div className="bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wide">
              Cấu Hình IP Wifi Cửa Hàng (Dành Cho Quản Trị Viên)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Địa chỉ IP Public Wifi Cửa hàng chuẩn *
              </label>
              <input
                type="text"
                value={editingWifiIp}
                onChange={(e) => setEditingWifiIp(e.target.value)}
                placeholder="VD: 113.161.45.22"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleUseCurrentIp}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                title="Lấy địa chỉ IP hiện tại làm chuẩn"
              >
                <span>📡 Lấy IP Hiện Tại</span>
              </button>
            </div>
            <div className="sm:col-span-3">
              <button
                type="button"
                onClick={handleSaveStoreWifiIp}
                disabled={savingSettings}
                className="w-full py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-glow-cyan transition active:scale-95 disabled:opacity-50"
              >
                {savingSettings ? 'Đang lưu...' : '💾 Lưu IP Wifi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* 3. MAIN CHECK-IN / CHECK-OUT ACTION STATION */}
      {/* ======================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left (8 cols): Shift Selection & Check-in Controls */}
        <div className="lg:col-span-8 bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-white text-xs uppercase flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>
                {isStaff ? '1. Chọn Ca Làm Việc Hôm Nay (Xoay Ca 11H):' : '1. Ca Làm Việc Quản Lý (11H):'}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>

          {/* Shift Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isStaff ? (
              fulltimeShifts.map((s) => {
                const Icon = s.icon;
                const isSelected = selectedShift === s.id;
                const isCurrentShiftActive = activeRecord && activeRecord.shift === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => !activeRecord && setSelectedShift(s.id as any)}
                    disabled={Boolean(activeRecord && !isCurrentShiftActive)}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      isSelected
                        ? `bg-gradient-to-br ${s.color} shadow-lg scale-[1.01] ring-2 ring-cyan-500/30`
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    } ${activeRecord && !isCurrentShiftActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-slate-900/90 text-white shadow-sm">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-cyan-300">
                        {s.badge}
                      </span>
                      {isCurrentShiftActive && (
                        <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full shadow-glow-emerald animate-pulse">
                          Đang làm việc
                        </span>
                      )}
                    </div>
                    <div className="font-black text-sm text-white">{s.name}</div>
                    <div className="text-xs font-mono font-bold mt-1 text-slate-200">{s.time}</div>
                    <div className="text-[11px] text-amber-300 mt-1 font-semibold flex items-center space-x-1">
                      <Coffee className="w-3 h-3" />
                      <span>{s.lunchBreak}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{s.detail}</div>
                  </button>
                );
              })
            ) : (
              <div
                className={`sm:col-span-2 p-4 rounded-2xl border text-left bg-gradient-to-br ${managerShift.color} shadow-lg ring-2 ring-purple-500/30`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-slate-900/90 text-white shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {managerShift.badge}
                  </span>
                  {activeRecord && (
                    <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full shadow-glow-emerald animate-pulse">
                      Đang làm việc
                    </span>
                  )}
                </div>
                <div className="font-black text-sm text-white">{managerShift.name}</div>
                <div className="text-xs font-mono font-bold mt-1 text-slate-200">{managerShift.time}</div>
                <div className="text-[11px] text-slate-300 mt-1">{managerShift.detail}</div>
              </div>
            )}
          </div>

          {/* Action Button Section */}
          <div className="pt-2 border-t border-slate-800">
            {!activeRecord ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={!isWifiMatch || submitting}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase transition flex items-center justify-center space-x-2 shadow-2xl active:scale-95 ${
                    isWifiMatch
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-glow-emerald hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <LogIn className="w-5 h-5" />
                  <span>
                    {!isWifiMatch
                      ? '🔒 Khóa Chấm Công (Cần kết nối Wifi Cửa Hàng)'
                      : submitting
                      ? 'Đang chấm công...'
                      : `🟢 VÀO CA ${selectedShift === 'shift1' ? '1 (08:30 - 21:00)' : selectedShift === 'shift2' ? '2 (08:30 - 21:00)' : 'QUẢN LÝ (08:30 - 21:00)'}`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/40 text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase font-bold text-emerald-400">
                      Bạn đang trong ca làm việc:
                    </div>
                    <div className="text-base font-black text-white mt-0.5">
                      {activeRecord.shift === 'shift1' ? 'Ca 1 (11 tiếng)' : activeRecord.shift === 'shift2' ? 'Ca 2 (11 tiếng)' : 'Ca Quản Lý (11 tiếng)'} • Vào ca lúc: {new Date(activeRecord.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {activeRecord.late_minutes > 0 && (
                      <div className="text-xs text-rose-400 font-bold mt-0.5">
                        ⚠️ Vào muộn {activeRecord.late_minutes} phút (sau 08:30)
                      </div>
                    )}
                    {activeRecord.is_off_day && (
                      <div className="text-xs text-amber-300 font-bold mt-0.5">
                        ⭐ Đi làm ngày Off đăng ký: Được tính thêm +1 ngày công!
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-amber-300 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span>Làm sau 21:00 tính OT 150%</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={!isWifiMatch || submitting}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase transition flex items-center justify-center space-x-2 shadow-2xl active:scale-95 ${
                    isWifiMatch
                      ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-glow-rose hover:brightness-110 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                  <span>
                    {!isWifiMatch
                      ? '🔒 Khóa Chấm Công (Cần kết nối Wifi Cửa Hàng)'
                      : submitting
                      ? 'Đang tính giờ...'
                      : '🔴 KẾT THÚC CA & RA CA (TÍNH GIỜ & OT SAU 21:00)'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right (4 cols): User Monthly KPI & Summary */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
            <div className="font-bold text-slate-200 uppercase text-xs flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Tổng Kết Công Tháng Này</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Công Thực Tế</span>
                <span className="text-lg font-black text-cyan-300 font-sans tracking-tight">
                  {summary.actual_days} <span className="text-xs text-slate-400 font-normal">ngày</span>
                </span>
                {summary.off_days_worked > 0 && (
                  <span className="text-[10px] text-amber-400 block font-bold mt-0.5">
                    +{summary.off_days_worked} ngày Off
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">Giờ Tăng Ca (OT)</span>
                <span className="text-lg font-black text-amber-300 font-sans tracking-tight">
                  +{summary.total_ot_hours} <span className="text-xs text-slate-400 font-normal">h (150%)</span>
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ca Hoàn Thành</span>
                <span className="text-base font-black text-emerald-400 font-sans">
                  {summary.total_shifts} ca
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tổng Giờ Làm</span>
                <span className="text-base font-black text-white font-sans">
                  {summary.total_work_hours} giờ
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">Quy tắc chấm công 11 tiếng:</div>
              <div>• <b>Ca 11h chuẩn:</b> 08:30 đến 21:00.</div>
              <div>• Đi sớm hơn 08:30: Không tính lương.</div>
              <div>• Tăng ca (OT 150%): Bắt đầu tính sau 21:00.</div>
              <div>• Đi làm ngày Off đăng ký: <b>+1 ngày công</b>.</div>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================= */}
      {/* 4. WEEKLY OFF-DAY REGISTRATION SECTION */}
      {/* ======================================================= */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center space-x-2">
            <Coffee className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wide">
                Đăng Ký Ngày Nghỉ (Off Tuần - 1 Ngày / Tuần)
              </h3>
              <p className="text-[11px] text-slate-400">
                Nhân viên đăng ký 1 ngày nghỉ cho <b>TUẦN TIẾP THEO</b> (Tuần hiện tại đã khóa). Quản lý có quyền chỉnh sửa.
              </p>
            </div>
          </div>

          {/* Admin user selector for editing other employees */}
          {isManagerOrAbove && offDaysData?.users && (
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold badge-nowrap">Xem/sửa cho:</span>
              <select
                value={adminSelectedUserId}
                onChange={(e) => setAdminSelectedUserId(e.target.value)}
                className="bg-slate-900 text-cyan-300 font-bold rounded-lg px-2 py-1 border border-slate-700 text-xs focus:outline-none"
              >
                {offDaysData.users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2 Columns: Current Week (Locked for Staff) & Next Week (Editable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Column A: Tuần Hiện Tại */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-200 block">
                  Tuần Hiện Tại ({offDaysData?.currentWeek?.weekStr || 'Đang tải...'})
                </span>
                <span className="text-[10px] text-slate-400">
                  {offDaysData?.currentWeek?.days[0]?.formatted} đến {offDaysData?.currentWeek?.days[6]?.formatted}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                🔒 Tuần Hiện Tại (Khóa sửa)
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {offDaysData?.currentWeek?.days.map((d: any) => {
                const effectiveUserId = isManagerOrAbove ? adminSelectedUserId : user?.id;
                const isSelected = offDaysData?.offDays.some(
                  (o) => o.user_id === effectiveUserId && o.date.slice(0, 10) === d.dateStr
                );
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    disabled={!isManagerOrAbove || savingOffDay}
                    onClick={() => isManagerOrAbove && handleRegisterOffDay(effectiveUserId, d.dateStr, offDaysData.currentWeek.weekStr)}
                    className={`p-2 rounded-xl text-center border transition text-xs ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-black shadow-glow-amber'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    } ${isManagerOrAbove ? 'hover:border-slate-600 cursor-pointer' : 'cursor-not-allowed'}`}
                    title={isManagerOrAbove ? 'Quản lý bấm để đổi ngày Off' : 'Đã khóa'}
                  >
                    <div className="text-[10px] font-bold">{d.dayName.replace('Thứ ', 'T')}</div>
                    <div className="text-[11px] font-sans mt-0.5">{d.formatted}</div>
                    {isSelected && <div className="text-[9px] text-amber-400 font-bold mt-0.5">OFF</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column B: Tuần Tiếp Theo (Staff Register Here) */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-cyan-500/30 space-y-3 shadow-glow-cyan/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-white block">
                  Tuần Tiếp Theo ({offDaysData?.nextWeek?.weekStr || 'Đang tải...'})
                </span>
                <span className="text-[10px] text-slate-400">
                  {offDaysData?.nextWeek?.days[0]?.formatted} đến {offDaysData?.nextWeek?.days[6]?.formatted}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                ✓ Được Phép Đăng Ký
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {offDaysData?.nextWeek?.days.map((d: any) => {
                const effectiveUserId = isManagerOrAbove ? adminSelectedUserId : user?.id;
                const isSelected = offDaysData?.offDays.some(
                  (o) => o.user_id === effectiveUserId && o.date.slice(0, 10) === d.dateStr
                );
                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    disabled={savingOffDay}
                    onClick={() => handleRegisterOffDay(effectiveUserId, d.dateStr, offDaysData.nextWeek.weekStr)}
                    className={`p-2 rounded-xl text-center border transition text-xs cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-cyan-500/25 border-cyan-500 text-cyan-300 font-black shadow-glow-cyan'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-850'
                    }`}
                  >
                    <div className="text-[10px] font-bold">{d.dayName.replace('Thứ ', 'T')}</div>
                    <div className="text-[11px] font-sans mt-0.5">{d.formatted}</div>
                    {isSelected ? (
                      <div className="text-[9px] text-cyan-300 font-bold mt-0.5">OFF</div>
                    ) : (
                      <div className="text-[9px] text-slate-500 mt-0.5">Chọn</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================= */}
      {/* 5. ATTENDANCE HISTORY TABLE */}
      {/* For Admin: Full history with Late / Early minutes */}
      {/* For Staff: Personal history table */}
      {/* ======================================================= */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="font-black text-xs text-white uppercase tracking-wider flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>
              {isManagerOrAbove ? 'Lịch Sử Chấm Công Toàn Bộ Nhân Viên (Vào Muộn / Về Sớm / OT 150%)' : 'Lịch Sử Chấm Công Của Bạn'}
            </span>
          </div>
          <button
            onClick={fetchAttendanceData}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Làm mới"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400 animate-pulse">
            Đang tải lịch sử chấm công...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-400">
            Chưa có bản ghi chấm công nào trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Ngày</th>
                  <th className="px-4 py-3.5">Nhân Viên</th>
                  <th className="px-4 py-3.5">Ca Làm</th>
                  <th className="px-4 py-3.5">Giờ Vào</th>
                  <th className="px-4 py-3.5">Giờ Ra</th>
                  <th className="px-4 py-3.5">Đi Muộn</th>
                  <th className="px-4 py-3.5">Về Sớm</th>
                  <th className="px-4 py-3.5">Giờ Chuẩn (11h)</th>
                  <th className="px-4 py-3.5">OT Sau 21h (150%)</th>
                  <th className="px-4 py-3.5">Ngày Off</th>
                  <th className="px-4 py-3.5">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-white">
                      {new Date(row.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-200">
                      {row.user_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-950 border border-slate-800 text-cyan-300">
                        {row.shift === 'shift1' ? 'Ca 1 (11h)' : row.shift === 'shift2' ? 'Ca 2 (11h)' : row.shift === 'manager' ? 'Ca Quản Lý' : row.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-400 font-bold">
                      {new Date(row.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {row.check_out
                        ? new Date(row.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-amber-400 font-bold animate-pulse">Đang trong ca...</span>}
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      {row.late_minutes > 0 ? (
                        <span className="text-rose-400 font-bold">+{row.late_minutes} phút</span>
                      ) : (
                        <span className="text-slate-500">Đúng giờ</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      {row.early_minutes > 0 ? (
                        <span className="text-amber-400 font-bold">-{row.early_minutes} phút</span>
                      ) : (
                        <span className="text-slate-500">Đúng giờ</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white font-sans">
                      {row.work_hours}h
                    </td>
                    <td className="px-4 py-3.5 font-bold font-sans">
                      {row.ot_hours > 0 ? (
                        <span className="text-amber-400 font-black">+{row.ot_hours}h (150%)</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.is_off_day ? (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black">
                          +1 Công Off
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.check_out ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                          Hoàn thành
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">
                          Đang làm việc
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
