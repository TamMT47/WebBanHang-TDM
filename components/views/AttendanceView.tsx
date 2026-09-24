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
  Shield,
  RotateCw,
  Sparkles,
  User,
  Settings,
  Coffee,
  Check,
  AlertCircle,
  Users,
  Plus,
  Edit2,
  Smartphone,
  Key,
  Trash2
} from 'lucide-react';
import { ShiftType } from '@/types/database';
import ManualAttendanceModal from '@/components/ManualAttendanceModal';
import { calculateWorkHours } from '@/lib/attendanceHelper';

interface AttendanceViewProps {
  user: any;
}

export default function AttendanceView({ user }: AttendanceViewProps) {
  const isAdmin = user?.role === 'admin';
  const isAdminOrOwner = user && ['admin', 'owner'].includes(user.role);
  const isManagerOrAbove = user && ['admin', 'owner', 'manager'].includes(user.role);
  const isStaff = user?.role === 'staff';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Network & IP Info
  const [clientIp, setClientIp] = useState('');
  const [storeWifiIp, setStoreWifiIp] = useState('');
  const [storeWifiIps, setStoreWifiIps] = useState<string[]>([]);
  const [isWifiMatch, setIsWifiMatch] = useState(false);

  // Device Token State
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [isDeviceTrusted, setIsDeviceTrusted] = useState(false);
  const [isAccessAllowed, setIsAccessAllowed] = useState(false);
  const [deviceTokenExpiresAt, setDeviceTokenExpiresAt] = useState<string | null>(null);
  const [grantingToken, setGrantingToken] = useState(false);
  const [selectedStaffForToken, setSelectedStaffForToken] = useState<string>('');

  // Admin Config State
  const [newWifiIpInput, setNewWifiIpInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Attendance Modal State (Bù công & Sửa giờ làm cho Quản lý)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedManualRecord, setSelectedManualRecord] = useState<any>(null);
  const [selectedManualUserId, setSelectedManualUserId] = useState<string | undefined>(undefined);
  const [usersList, setUsersList] = useState<any[]>([]);

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

  // 1. Initialize Device Token from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('td_attendance_device_token');
      const savedTokenUserId = localStorage.getItem('td_attendance_device_token_user_id');
      if (savedToken && (!savedTokenUserId || savedTokenUserId === user?.id)) {
        setDeviceToken(savedToken);
      }
    }
  }, [user?.id]);

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

  const getPublicIp = async (): Promise<string> => {
    try {
      const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      const data = await res.json();
      if (data && data.ip) return data.ip.trim();
    } catch (e) {
      console.warn('Could not fetch public IP from ipify:', e);
    }
    return clientIp || '';
  };

  const fetchAttendanceData = async (tokenOverride?: string) => {
    try {
      setLoading(true);
      const activeToken = tokenOverride !== undefined ? tokenOverride : (deviceToken || (typeof window !== 'undefined' ? localStorage.getItem('td_attendance_device_token') || '' : ''));

      let detectedIp = '';
      try {
        const ipifyRes = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        const ipifyData = await ipifyRes.json();
        if (ipifyData && ipifyData.ip) detectedIp = ipifyData.ip.trim();
      } catch (e) {
        // fallback to server detected
      }

      const params = new URLSearchParams();
      if (activeToken) params.append('device_token', activeToken);
      if (detectedIp) params.append('client_public_ip', detectedIp);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải dữ liệu chấm công');

      const serverDetectedIp = detectedIp || data.clientIp || '';
      const allowedIps: string[] = Array.isArray(data.storeWifiIps) ? data.storeWifiIps : (data.storeWifiIp ? [data.storeWifiIp] : []);

      setClientIp(serverDetectedIp);
      setStoreWifiIp(data.storeWifiIp || '');
      setStoreWifiIps(allowedIps);
      setIsWifiMatch(Boolean(data.isWifiMatch));
      setIsDeviceTrusted(Boolean(data.isDeviceTrusted));
      setIsAccessAllowed(Boolean(data.isAccessAllowed || !isStaff));
      setDeviceTokenExpiresAt(data.deviceTokenExpiresAt || null);

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
        if (data.users && data.users.length > 0) {
          setUsersList(data.users);
        }
      }
    } catch (err) {
      console.error('Error fetching off-days:', err);
    }
  };

  const fetchUsersList = async () => {
    if (!isManagerOrAbove) return;
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data && data.users) {
        setUsersList(data.users);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchOffDaysData();
    fetchUsersList();
  }, []);

  // Save updated IP Whitelist
  const handleSaveStoreWifiIpsList = async (updatedIps: string[]) => {
    try {
      setSavingSettings(true);
      const cleanList = Array.from(new Set(updatedIps.map((ip) => ip.trim()).filter(Boolean)));
      
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'store_wifi_ips',
          value: JSON.stringify(cleanList),
          description: 'Danh sách Dải IP Wi-Fi cửa hàng tin tưởng',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu cấu hình Dải IP');

      // Also sync single store_wifi_ip for backward compatibility
      if (cleanList.length > 0) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'store_wifi_ip',
            value: cleanList[0],
            description: 'Địa chỉ IP Wi-Fi chính của cửa hàng',
          }),
        });
      }

      setMessage({ type: 'success', text: 'Đã cập nhật Danh Sách IP Wi-Fi Cửa Hàng thành công!' });
      setNewWifiIpInput('');
      fetchAttendanceData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddNewWifiIp = (ipToAdd: string) => {
    const clean = ipToAdd.trim();
    if (!clean) return;
    if (storeWifiIps.includes(clean)) {
      setMessage({ type: 'error', text: `Địa chỉ IP ${clean} đã có trong danh sách tin tưởng rồi!` });
      return;
    }
    const updated = [...storeWifiIps, clean];
    handleSaveStoreWifiIpsList(updated);
  };

  const handleRemoveWifiIp = (ipToRemove: string) => {
    if (!confirm(`Bạn có chắc muốn xóa IP ${ipToRemove} khỏi danh sách tin tưởng?`)) return;
    const updated = storeWifiIps.filter((ip) => ip !== ipToRemove);
    handleSaveStoreWifiIpsList(updated);
  };

  // Grant Device Token (Admin action or self-registration when on Wifi)
  const handleGrantDeviceToken = async (targetUserId?: string) => {
    try {
      setGrantingToken(true);
      setMessage(null);

      const currentIp = await getPublicIp();
      const res = await fetch('/api/attendance/device-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: targetUserId || user?.id,
          client_public_ip: currentIp,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cấp quyền thiết bị');

      if (data.deviceToken) {
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('td_attendance_device_token', data.deviceToken);
          localStorage.setItem('td_attendance_device_token_user_id', data.userId || user?.id);
        }
        setDeviceToken(data.deviceToken);
        setIsDeviceTrusted(true);
        setIsAccessAllowed(true);
      }

      setMessage({
        type: 'success',
        text: `✓ Cấp quyền Thiết Bị Tin Tưởng thành công (Hạn 30 ngày)! Thiết bị này có thể chấm công bình thường kể cả khi Wi-Fi bị đổi IP.`,
      });
      fetchAttendanceData(data.deviceToken);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setGrantingToken(false);
    }
  };

  // Session Check In handler with RESILIENT IP + Device Token check
  const handleSessionCheckIn = async (session: 'morning' | 'afternoon') => {
    try {
      setSubmitting(true);
      setMessage(null);

      const currentIp = await getPublicIp();
      const currentToken = deviceToken || (typeof window !== 'undefined' ? localStorage.getItem('td_attendance_device_token') || '' : '');

      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift: assignedShift,
          session,
          client_public_ip: currentIp,
          device_token: currentToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi chấm công vào ca');

      // If server generated a renewed deviceToken, store in localStorage
      if (data.deviceToken && typeof window !== 'undefined') {
        localStorage.setItem('td_attendance_device_token', data.deviceToken);
        localStorage.setItem('td_attendance_device_token_user_id', user?.id);
        setDeviceToken(data.deviceToken);
      }

      setMessage({ type: 'success', text: data.message });
      fetchAttendanceData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Session Check Out handler with RESILIENT IP + Device Token check
  const handleSessionCheckOut = async (session: 'morning' | 'afternoon', recordId?: string) => {
    try {
      setSubmitting(true);
      setMessage(null);

      const currentIp = await getPublicIp();
      const currentToken = deviceToken || (typeof window !== 'undefined' ? localStorage.getItem('td_attendance_device_token') || '' : '');

      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          attendance_id: recordId,
          client_public_ip: currentIp,
          device_token: currentToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi chấm công ra ca');

      // If server generated a renewed deviceToken, store in localStorage
      if (data.deviceToken && typeof window !== 'undefined') {
        localStorage.setItem('td_attendance_device_token', data.deviceToken);
        localStorage.setItem('td_attendance_device_token_user_id', user?.id);
        setDeviceToken(data.deviceToken);
      }

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
      ? 'Ca 1 (Sáng: 09:00-12:00 | Chiều: 13:00-21:00)'
      : assignedShift === 'shift2'
      ? 'Ca 2 (Sáng: 09:00-13:00 | Chiều: 14:00-21:00)'
      : 'Ca Quản Lý (09:00 - 21:00)';

  // Controls whether staff is locked out from checking in/out:
  // Unlocked if IP is in whitelist OR device is trusted with a 30-day token
  const isStaffLocked = isStaff && !isAccessAllowed;
  const isButtonDisabled = submitting || isStaffLocked;

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
      {/* 0. BẢNG HIỂN THỊ KIỂM SOÁT IP WIFI & THIẾT BỊ TIN TƯỞNG (ADMIN & QUẢN LÝ) */}
      {/* ======================================================== */}
      {isAdmin && (
        <div
          className={`p-4 rounded-3xl border shadow-xl transition backdrop-blur-xl ${
            isWifiMatch || isDeviceTrusted
              ? 'bg-emerald-950/40 border-emerald-500/30'
              : 'bg-slate-900/90 border-rose-500/30'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            <div className="flex items-start sm:items-center space-x-3">
              <div
                className={`p-3 rounded-2xl flex-shrink-0 border ${
                  isWifiMatch
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : isDeviceTrusted
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}
              >
                {isWifiMatch ? <Wifi className="w-6 h-6" /> : isDeviceTrusted ? <Smartphone className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${
                      isWifiMatch
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isDeviceTrusted
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {isWifiMatch
                      ? '🟢 ĐÃ KẾT NỐI ĐÚNG WIFI CỬA HÀNG'
                      : isDeviceTrusted
                      ? '🟢 THIẾT BỊ ĐÃ XÁC THỰC TIN TƯỞNG (30 NGÀY)'
                      : '🔴 CHƯA KẾT NỐI WIFI HOẶC CHƯA CẤP QUYỀN THIẾT BỊ'}
                  </span>
                  {isDeviceTrusted && (
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md text-[10px] font-black uppercase flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      <span>TOKEN HỢP LỆ {deviceTokenExpiresAt ? `(Hết hạn: ${new Date(deviceTokenExpiresAt).toLocaleDateString('vi-VN')})` : ''}</span>
                    </span>
                  )}
                  {isStaffLocked && (
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-md text-[10px] font-black uppercase">
                      🔒 ĐÃ KHÓA NÚT CHẤM CÔNG CỦA NHÂN VIÊN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  {isWifiMatch
                    ? 'IP thiết bị trùng khớp với Dải IP Wi-Fi cửa hàng. Hệ thống đã tự động ghi nhớ và cấp Token 30 ngày cho thiết bị.'
                    : isDeviceTrusted
                    ? 'Thiết bị này đã được cấp quyền tin tưởng (Device Token 30 ngày). Nhân viên có thể chấm công bình thường mà không bị ảnh hưởng khi Router đổi IP!'
                    : storeWifiIps.length === 0
                    ? 'Cửa hàng chưa lưu Dải IP Wi-Fi tin tưởng. Quản lý / Admin vui lòng thêm IP Wi-Fi bên dưới hoặc cấp quyền thiết bị.'
                    : 'IP thiết bị không khớp với Dải IP Shop và thiết bị chưa có Token tin tưởng. Vui lòng kết nối Wi-Fi Shop hoặc liên hệ Quản lý để cấp quyền.'}
                </p>
              </div>
            </div>

            {/* Diagnostic Badges & Actions */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3 py-2 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Dải IP Shop ({storeWifiIps.length}):</span>
                <span className="font-mono font-bold text-amber-300">
                  {storeWifiIps.length > 0 ? storeWifiIps.join(', ') : 'Chưa lưu'}
                </span>
              </div>
              <div className="px-3 py-2 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">IP Máy Hiện Tại:</span>
                <span className={`font-mono font-bold ${isWifiMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {clientIp || 'Đang lấy...'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fetchAttendanceData()}
                title="Kiểm tra lại mạng, IP & Token"
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl transition border border-slate-700 active:scale-95"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
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
                  ({assignedShift === 'shift1' ? '09:00-12:00 | 13:00-21:00' : assignedShift === 'shift2' ? '09:00-13:00 | 14:00-21:00' : '09:00-21:00'})
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

            {/* Wifi Status Badge */}
            {isWifiMatch ? (
              <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wifi: Khớp ({clientIp})</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-2.5 py-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold">
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Sai Wifi ({clientIp || 'Chưa nhận'})</span>
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
                {assignedShift === 'shift1' ? '09:00 - 12:00' : assignedShift === 'shift2' ? '09:00 - 13:00' : '09:00 - 12:00'}
              </span>
            </div>

            {!morningRecord ? (
              <button
                type="button"
                onClick={() => handleSessionCheckIn('morning')}
                disabled={isButtonDisabled}
                className={`w-full py-2.5 font-black rounded-xl text-xs transition flex items-center justify-center space-x-2 ${
                  isStaffLocked
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md hover:brightness-110 active:scale-98 disabled:opacity-50'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>{isStaffLocked ? '🔒 KHÓA CHẤM CÔNG (SAI WIFI)' : 'VÀO CA SÁNG'}</span>
              </button>
            ) : morningRecord.status === 'working' ? (
              <div className="space-y-2">
                <div className="text-center text-xs font-bold text-amber-300">
                  🟢 Đang làm việc (Vào lúc: {formatHourMinute(morningRecord.check_in)})
                </div>
                <button
                  type="button"
                  onClick={() => handleSessionCheckOut('morning', morningRecord.id)}
                  disabled={isButtonDisabled}
                  className={`w-full py-2 border rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${
                    isStaffLocked
                      ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/50 disabled:opacity-50'
                  }`}
                >
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>{isStaffLocked ? '🔒 KHÓA RA CA (SAI WIFI)' : 'RA CA SÁNG (Nghỉ trưa)'}</span>
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
                {assignedShift === 'shift1' ? '13:00 - 21:00' : assignedShift === 'shift2' ? '14:00 - 21:00' : '13:00 - 21:00'}
              </span>
            </div>

            {!afternoonRecord ? (
              <button
                type="button"
                onClick={() => handleSessionCheckIn('afternoon')}
                disabled={isButtonDisabled}
                className={`w-full py-2.5 font-black rounded-xl text-xs transition flex items-center justify-center space-x-2 ${
                  isStaffLocked
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-glow-cyan hover:brightness-110 active:scale-98 disabled:opacity-50'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>{isStaffLocked ? '🔒 KHÓA CHẤM CÔNG (SAI WIFI)' : 'VÀO CA CHIỀU'}</span>
              </button>
            ) : afternoonRecord.status === 'working' ? (
              <div className="space-y-2">
                <div className="text-center text-xs font-bold text-cyan-300">
                  🟢 Đang làm việc (Vào lúc: {formatHourMinute(afternoonRecord.check_in)})
                </div>
                <button
                  type="button"
                  onClick={() => handleSessionCheckOut('afternoon', afternoonRecord.id)}
                  disabled={isButtonDisabled}
                  className={`w-full py-2 font-black rounded-xl text-xs transition flex items-center justify-center space-x-1.5 ${
                    isStaffLocked
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md disabled:opacity-50'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isStaffLocked ? '🔒 KHÓA RA CA (SAI WIFI)' : 'RA CA CHIỀU (Hết ngày)'}</span>
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
          
          {/* Card Quản Lý IP Whitelist & Cấp Quyền Thiết Bị Tin Tưởng */}
          <div className="lg:col-span-5 bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Wi-Fi & Thiết Bị Tin Tưởng</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                {storeWifiIps.length} IP Whitelist
              </span>
            </div>

            {/* 1. Danh sách IP Tin Tưởng (Whitelist) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Danh sách IP Tin Tưởng (Wi-Fi Shop):</span>
                {clientIp && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    IP máy: <strong className="text-cyan-400">{clientIp}</strong>
                  </span>
                )}
              </label>

              {/* IP Badges */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-slate-950/70 border border-slate-800 rounded-2xl">
                {storeWifiIps.length === 0 ? (
                  <span className="text-[11px] text-slate-500 italic">Chưa có IP tin tưởng nào. Vui lòng thêm IP bên dưới.</span>
                ) : (
                  storeWifiIps.map((ip) => (
                    <span
                      key={ip}
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold group"
                    >
                      <span>{ip}</span>
                      {ip === clientIp && (
                        <span className="text-[9px] bg-cyan-500 text-slate-950 px-1 rounded font-black">Máy này</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveWifiIp(ip)}
                        disabled={savingSettings}
                        title={`Xóa ${ip}`}
                        className="text-slate-400 hover:text-rose-400 transition p-0.5 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add custom IP */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={newWifiIpInput}
                  onChange={(e) => setNewWifiIpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewWifiIp(newWifiIpInput);
                    }
                  }}
                  placeholder="Nhập IP mới (VD: 14.169.123.45)..."
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => handleAddNewWifiIp(newWifiIpInput)}
                  disabled={savingSettings || !newWifiIpInput.trim()}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition shadow-sm active:scale-95 disabled:opacity-40 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm IP</span>
                </button>
              </div>

              {/* Quick Add Current IP Button */}
              {clientIp && (
                <button
                  type="button"
                  onClick={() => handleAddNewWifiIp(clientIp)}
                  disabled={savingSettings || storeWifiIps.includes(clientIp)}
                  className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1.5 border ${
                    storeWifiIps.includes(clientIp)
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-cyan-300 hover:border-cyan-500'
                  }`}
                >
                  {storeWifiIps.includes(clientIp) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>IP hiện tại ({clientIp}) đã nằm trong danh sách tin tưởng</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>+ Thêm IP Hiện Tại ({clientIp}) Vào Danh Sách Tin Tưởng</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 2. Cấp Quyền Thiết Bị Tin Tưởng (Device Token) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cấp Quyền Thiết Bị Tin Tưởng (Hạn 30 Ngày):</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Issue for this device */}
                <button
                  type="button"
                  onClick={() => handleGrantDeviceToken()}
                  disabled={grantingToken}
                  className="w-full py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-[11px] transition shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{grantingToken ? 'Đang cấp...' : '🛡️ Tin Tưởng Máy Này'}</span>
                </button>

                {/* Issue for another staff */}
                <div className="flex items-center space-x-1">
                  <select
                    value={selectedStaffForToken}
                    onChange={(e) => setSelectedStaffForToken(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Chọn NV --</option>
                    {(usersList.length > 0 ? usersList : offDaysData?.users || []).map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedStaffForToken) {
                        setMessage({ type: 'error', text: 'Vui lòng chọn nhân viên cần cấp quyền!' });
                        return;
                      }
                      handleGrantDeviceToken(selectedStaffForToken);
                    }}
                    disabled={grantingToken || !selectedStaffForToken}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition active:scale-95 disabled:opacity-40"
                  >
                    Cấp
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                * Thiết bị được cấp Token sẽ chấm công thành công suốt 30 ngày kể cả khi Router đổi IP mạng.
              </p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase">
              {isManagerOrAbove ? 'Lịch Sử Chấm Công Toàn Cửa Hàng' : 'Lịch Sử Chấm Công Của Bạn'}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-[11px] text-slate-400">
              Tổng cộng: <b className="text-white font-sans">{summary.actual_days}</b> ngày công ({summary.total_work_hours}h làm việc • +{summary.total_ot_hours}h OT)
            </div>
            {isManagerOrAbove && (
              <button
                type="button"
                onClick={() => {
                  setSelectedManualRecord(null);
                  setSelectedManualUserId(undefined);
                  setIsManualModalOpen(true);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Bù công / Sửa giờ làm</span>
              </button>
            )}
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
                  <th className="px-3.5 py-2.5">Ghi Chú</th>
                  {isManagerOrAbove && <th className="px-3.5 py-2.5 text-center">Hành Động</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {history.map((rec) => {
                  const dateFormatted = new Date(rec.date).toLocaleDateString('vi-VN');
                  const isLate = parseInt(rec.late_minutes || '0', 10) > 0;
                  const isEarly = parseInt(rec.early_minutes || '0', 10) > 0;
                  const otVal = parseFloat(rec.ot_hours || '0');
                  const hasOt = otVal > 0;

                  const rawWorkHours = parseFloat(rec.work_hours || '0');
                  const displayWorkHours = rawWorkHours > 0
                    ? `${rawWorkHours}h`
                    : (rec.check_in && rec.check_out
                        ? `${calculateWorkHours(rec.check_in, rec.check_out, { shift: rec.shift, session: rec.session }).workHours}h`
                        : '--');

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
                        {displayWorkHours}
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
                          <span className="text-amber-400 font-bold font-sans">+{otVal}h (150%)</span>
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
                      <td className="px-3.5 py-2.5 text-[11px] text-slate-400 max-w-xs truncate" title={rec.note || ''}>
                        {rec.note || '-'}
                      </td>
                      {isManagerOrAbove && (
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedManualRecord(rec);
                              setSelectedManualUserId(rec.user_id);
                              setIsManualModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-lg transition"
                            title="Chỉnh sửa ca chấm công này"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Attendance & Shift Edit Modal */}
      {isManualModalOpen && (
        <ManualAttendanceModal
          isOpen={isManualModalOpen}
          onClose={() => {
            setIsManualModalOpen(false);
            setSelectedManualRecord(null);
            setSelectedManualUserId(undefined);
          }}
          onSuccess={() => {
            setMessage({ type: 'success', text: 'Đã cập nhật dữ liệu chấm công thành công!' });
            fetchAttendanceData();
          }}
          users={usersList.length > 0 ? usersList : offDaysData?.users || []}
          initialUserId={selectedManualUserId}
          initialRecord={selectedManualRecord}
        />
      )}

    </div>
  );
}
