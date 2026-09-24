/**
 * Attendance and Work Hours Calculation Helper (Client & Server Safe)
 * TD Mobile Store Attendance & Payroll Module
 */

export interface ShiftConfig {
  shift?: string; // 'shift1' | 'shift2' | 'manager'
  session?: 'morning' | 'afternoon' | 'full';
  scheduledStart?: string; // 'HH:mm'
  scheduledEnd?: string;   // 'HH:mm'
}

export interface WorkHoursResult {
  workHours: number;      // Regular work hours (e.g., 7.0 for 14:00-21:00)
  otHours: number;        // Overtime hours (after scheduled end, e.g. >21:00)
  lateMinutes: number;    // Minutes late after scheduled start
  earlyMinutes: number;   // Minutes left early before scheduled end
  totalDurationHours: number; // Total duration in decimal hours (workHours + otHours)
}

/**
 * Device Token Payload for 30-day trusted attendance devices
 */
export interface DeviceTokenPayload {
  userId: string;
  type: 'attendance_device_token';
  shopId: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Check if a client IP is present in the whitelist
 */
export function isIpInWhitelist(clientIp: string, allowedIps: string[]): boolean {
  if (!clientIp || allowedIps.length === 0) return false;
  const cleanClient = clientIp.trim();
  return allowedIps.some((allowed) => {
    const cleanAllowed = allowed.trim();
    if (!cleanAllowed) return false;
    return cleanAllowed === cleanClient || cleanAllowed === '0.0.0.0' || cleanAllowed === '*';
  });
}

/**
 * Parse a time string or Date into total minutes of the day in Vietnam timezone (GMT+7)
 */
export function parseTimeToMinutes(timeInput: string | Date): { totalMinutes: number; timeStr: string } {
  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    // Case 1: "HH:mm" or "HH:mm:ss"
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const [h, m] = trimmed.split(':').map((v) => parseInt(v, 10));
      return { totalMinutes: h * 60 + m, timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
    }
    // Case 2: ISO string or date string
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const vnStr = d.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
      const vnDate = new Date(vnStr);
      const h = vnDate.getHours();
      const m = vnDate.getMinutes();
      return { totalMinutes: h * 60 + m, timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
    }
  } else if (timeInput instanceof Date && !isNaN(timeInput.getTime())) {
    const vnStr = timeInput.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnDate = new Date(vnStr);
    const h = vnDate.getHours();
    const m = vnDate.getMinutes();
    return { totalMinutes: h * 60 + m, timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
  }

  return { totalMinutes: 0, timeStr: '00:00' };
}

/**
 * Calculate actual work hours, OT hours, late minutes, and early minutes
 * 
 * Shift Schedule Rules:
 * - Ca 1: Sáng 09:00 - 12:00 (3h), Chiều 13:00 - 21:00 (8h)
 * - Ca 2: Sáng 09:00 - 13:00 (4h), Chiều 14:00 - 21:00 (7h)
 * - Manager: Sáng 09:00 - 12:00 (3h), Chiều 13:00 - 21:00 (8h)
 * - Full day: 09:00 - 21:00 (11h standard with 1h lunch break, or exact worked hours)
 */
export function calculateWorkHours(
  checkIn: string | Date,
  checkOut?: string | Date | null,
  config?: ShiftConfig
): WorkHoursResult {
  const { totalMinutes: inMinutes } = parseTimeToMinutes(checkIn);
  const outData = checkOut ? parseTimeToMinutes(checkOut) : null;

  const session = config?.session || (inMinutes >= 750 ? 'afternoon' : 'morning');
  const shift = config?.shift || 'shift1';

  // Determine standard start and end times in minutes
  let defaultStart = 540; // 09:00
  let defaultEnd = 720;   // 12:00

  if (session === 'morning') {
    defaultStart = 540; // 09:00
    defaultEnd = shift === 'shift2' ? 780 : 720; // 13:00 for Ca 2, 12:00 for Ca 1 / Manager
  } else if (session === 'afternoon') {
    defaultStart = shift === 'shift2' ? 840 : 780; // 14:00 for Ca 2, 13:00 for Ca 1 / Manager
    defaultEnd = 1260; // 21:00
  } else if (session === 'full') {
    defaultStart = 540; // 09:00
    defaultEnd = 1260;  // 21:00
  }

  // Override if custom scheduled times provided
  if (config?.scheduledStart) {
    const { totalMinutes: custStart } = parseTimeToMinutes(config.scheduledStart);
    if (custStart > 0) defaultStart = custStart;
  }
  if (config?.scheduledEnd) {
    const { totalMinutes: custEnd } = parseTimeToMinutes(config.scheduledEnd);
    if (custEnd > 0) defaultEnd = custEnd;
  }

  // Late minutes calculation
  let lateMinutes = 0;
  if (inMinutes > defaultStart) {
    lateMinutes = inMinutes - defaultStart;
  }

  if (!outData) {
    return {
      workHours: 0,
      otHours: 0,
      lateMinutes,
      earlyMinutes: 0,
      totalDurationHours: 0,
    };
  }

  let outMinutes = outData.totalMinutes;
  // Handle overnight check-out
  if (outMinutes < inMinutes) {
    outMinutes += 24 * 60;
  }

  const diffMinutes = outMinutes - inMinutes;
  const totalDurationHours = Math.round((diffMinutes / 60) * 10) / 10;

  let earlyMinutes = 0;
  let otHours = 0;
  let workHours = 0;

  if (session === 'morning') {
    // Morning session does not produce OT
    if (outMinutes < defaultEnd) {
      earlyMinutes = defaultEnd - outMinutes;
    }
    // Work hours = actual duration in morning (or diffMinutes / 60 rounded)
    // E.g. 09:00 to 12:00 = 180 min -> 3.0h; 09:00 to 13:00 = 240 min -> 4.0h
    workHours = Math.round((diffMinutes / 60) * 10) / 10;
  } else if (session === 'afternoon') {
    // Afternoon session: regular shift ends at 21:00 (1260)
    const scheduledEnd = defaultEnd; // 1260 (21:00)

    if (outMinutes < scheduledEnd) {
      earlyMinutes = scheduledEnd - outMinutes;
      workHours = Math.round((diffMinutes / 60) * 10) / 10;
      otHours = 0;
    } else {
      // Worked until or past 21:00
      // Regular hours are from inMinutes up to scheduledEnd (e.g. 14:00 to 21:00 = 420 mins = 7.0h; 13:00 to 21:00 = 480 mins = 8.0h)
      const regularMinutes = Math.max(0, scheduledEnd - inMinutes);
      workHours = Math.round((regularMinutes / 60) * 10) / 10;

      // OT hours are worked after scheduledEnd (21:00)
      const otMinutes = Math.max(0, outMinutes - scheduledEnd);
      otHours = Math.round((otMinutes / 60) * 10) / 10;
    }
  } else {
    // Full day or custom session
    workHours = Math.round((diffMinutes / 60) * 10) / 10;
  }

  return {
    workHours: Math.max(0, workHours),
    otHours: Math.max(0, otHours),
    lateMinutes: Math.max(0, lateMinutes),
    earlyMinutes: Math.max(0, earlyMinutes),
    totalDurationHours: Math.max(0, totalDurationHours),
  };
}

/**
 * Standard Salary Formula Calculation
 * 
 * - Tổng số giờ làm trong ngày = Số giờ Ca sáng + Số giờ Ca chiều + Số giờ OT
 * - Lương ngày = (Tổng số giờ làm * Lương cơ bản theo giờ) + (Giờ OT * Hệ số OT 150%) + Phụ cấp - Lệch ca/Phạt
 */
export interface SalaryCalculationParams {
  baseSalary: number;
  contractType?: string; // 'probation' (85%) | 'sales' | 'marketing' | 'manager'
  standardDays?: number; // 26 or 27
  standardHoursPerDay?: number; // 11.0
  totalWorkHours: number;
  otHours?: number;
  otRate?: number; // default 1.5
  offDaysWorked?: number;
  sharedCommission?: number;
  personalCommission?: number;
  allowances?: Array<{ amount: number }>;
  deductions?: Array<{ amount: number }>;
}

export function calculateSalary(params: SalaryCalculationParams) {
  const {
    baseSalary = 0,
    contractType = 'sales',
    standardDays = 26,
    standardHoursPerDay = 11.0,
    totalWorkHours = 0,
    otHours = 0,
    otRate = 1.5,
    offDaysWorked = 0,
    sharedCommission = 0,
    personalCommission = 0,
    allowances = [],
    deductions = [],
  } = params;

  // 1. Effective base salary according to contract type
  const contractFactor = contractType === 'probation' ? 0.85 : 1.0;
  const effectiveBaseSalary = Math.round(baseSalary * contractFactor);

  // 2. Unit daily salary and hourly rate
  const unitDailySalary = standardDays > 0 ? Math.round(effectiveBaseSalary / standardDays) : 0;
  const unitHourlyRate = standardHoursPerDay > 0 ? unitDailySalary / standardHoursPerDay : 0;

  // 3. Work Salary based on total work hours + Off-day bonus
  const salaryByWorkHours = Math.round(totalWorkHours * unitHourlyRate);
  const offDayBonusSalary = Math.round(offDaysWorked * unitDailySalary);
  const salaryByDays = salaryByWorkHours + offDayBonusSalary;

  // 4. Overtime (OT) salary (150% standard hourly rate)
  const otSalary = Math.round(otHours * unitHourlyRate * otRate);

  // 5. Total allowances & bonuses
  const customAllowances = allowances.reduce((sum, al) => sum + (parseFloat(al.amount as any) || 0), 0);
  const totalAllowance = sharedCommission + personalCommission + customAllowances;

  // 6. Total deductions & penalties
  const totalDeduction = deductions.reduce((sum, de) => sum + (parseFloat(de.amount as any) || 0), 0);

  // 7. Final Salary (Net Pay)
  const finalSalary = Math.max(0, salaryByDays + otSalary + totalAllowance - totalDeduction);

  return {
    effectiveBaseSalary,
    unitDailySalary,
    unitHourlyRate: Math.round(unitHourlyRate),
    salaryByDays,
    otSalary,
    totalAllowance,
    totalDeduction,
    finalSalary,
  };
}
