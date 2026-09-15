import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';
import { ContractType } from '@/types/database';

export const dynamic = 'force-dynamic';

function calculateItemCommission(price: number, condition: string = '', category: string = ''): number {
  const cat = (category || '').toLowerCase();
  if (cat.includes('phukien') || cat.includes('phụ kiện') || cat.includes('dichvu') || cat.includes('dịch vụ')) {
    return 0;
  }
  const cond = (condition || '').toLowerCase().trim();
  const isNew = cond === 'new' || cond === 'mới' || cond === 'mới 100%' || cond === '100%';
  if (isNew) {
    return 300000;
  }
  // Máy cũ: <5tr (200k), 5tr - 10tr (300k), 10tr - 15tr (400k), >15tr (500k)
  if (price < 5000000) return 200000;
  if (price < 10000000) return 300000;
  if (price < 15000000) return 400000;
  return 500000;
}

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const isFinancialAdmin = canViewSensitiveFinancials(user.role);
    const { searchParams } = new URL(request.url);
    const todayMonth = new Date().toISOString().slice(0, 7);
    const month = searchParams.get('month') || todayMonth; // 'YYYY-MM'

    // 1. Calculate Standard Working Days for the month:
    // 30-day month = 26 standard days; 31-day month = 27 standard days (Feb: 28 -> 24)
    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const standardDays = daysInMonth === 31 ? 27 : daysInMonth === 30 ? 26 : Math.max(20, daysInMonth - 4);

    // 2. Get all users
    let userSql = `
      SELECT id, username, full_name, role, 
             COALESCE(base_salary, 0) AS base_salary,
             COALESCE(contract_type, 'sales') AS contract_type 
      FROM users
    `;
    const userParams: any[] = [];
    if (!isFinancialAdmin) {
      userParams.push(user.id);
      userSql += ` WHERE id = $1`;
    }
    userSql += ` ORDER BY role = 'admin' DESC, role = 'owner' DESC, role = 'manager' DESC, full_name ASC`;
    const usersRes = await query(userSql, userParams);

    // Count all eligible staff for Shared Commission (NV + Quản lý + Chủ shop)
    const eligibleStaffRes = await query(
      `SELECT COUNT(id) AS total_eligible FROM users WHERE role IN ('staff', 'manager', 'owner', 'admin')`
    );
    const totalEligibleStaff = Math.max(1, parseInt(eligibleStaffRes.rows[0]?.total_eligible || '1', 10));

    // 3. Get locked salary history for this month
    const historyRes = await query(
      `SELECT * FROM salary_history WHERE month = $1`,
      [month]
    );
    const lockedMap = new Map<string, any>();
    for (const row of historyRes.rows) {
      lockedMap.set(row.user_id, row);
    }

    // 4. Get attendance metrics for each user in this month
    const attendanceRes = await query(
      `SELECT 
        user_id,
        COUNT(DISTINCT date) AS active_days_count,
        COALESCE(SUM(work_hours), 0) AS total_work_hours,
        COALESCE(SUM(ot_hours), 0) AS total_ot_hours,
        COUNT(CASE WHEN is_off_day = true THEN 1 END) AS off_days_worked
       FROM attendance
       WHERE TO_CHAR(date, 'YYYY-MM') = $1 AND check_out IS NOT NULL
       GROUP BY user_id`,
      [month]
    );
    const attMap = new Map<string, any>();
    for (const row of attendanceRes.rows) {
      attMap.set(row.user_id, {
        active_days_count: parseInt(row.active_days_count, 10),
        total_work_hours: parseFloat(row.total_work_hours),
        total_ot_hours: parseFloat(row.total_ot_hours),
        off_days_worked: parseInt(row.off_days_worked || '0', 10),
      });
    }

    // 5. Query Sales & Calculate Commissions for this month
    // Order items sold in month
    const salesRes = await query(
      `SELECT 
        o.id AS order_id,
        COALESCE(o.seller_id, o.created_by) AS effective_seller_id,
        oi.price,
        COALESCE(p.category, '') AS category,
        COALESCE(p.condition, '') AS condition,
        COALESCE(p.name, '') AS product_name
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN inventory inv ON oi.inventory_id = inv.id
       LEFT JOIN products p ON inv.product_id = p.id
       WHERE o.type = 'sell' AND TO_CHAR(o.created_at, 'YYYY-MM') = $1`,
      [month]
    );

    let totalMainDevicesSold = 0;
    const personalCommissionMap = new Map<string, number>();
    const personalDevicesCountMap = new Map<string, number>();

    for (const item of salesRes.rows) {
      const price = parseFloat(item.price || '0');
      const cat = (item.category || '').toLowerCase();
      const isAccessoryOrService = cat.includes('phukien') || cat.includes('phụ kiện') || cat.includes('dichvu') || cat.includes('dịch vụ');

      if (!isAccessoryOrService) {
        totalMainDevicesSold += 1;
      }

      const comm = calculateItemCommission(price, item.condition, item.category);
      if (item.effective_seller_id) {
        const currentComm = personalCommissionMap.get(item.effective_seller_id) || 0;
        personalCommissionMap.set(item.effective_seller_id, currentComm + comm);

        if (!isAccessoryOrService) {
          const currentCount = personalDevicesCountMap.get(item.effective_seller_id) || 0;
          personalDevicesCountMap.set(item.effective_seller_id, currentCount + 1);
        }
      }
    }

    // Shared Commission per person: (Total main devices / Total eligible staff) * 50,000 đ
    const sharedCommissionPerPerson = Math.round((totalMainDevicesSold / totalEligibleStaff) * 50000);

    // 6. Compile payroll list
    const payrollItems = usersRes.rows.map((u) => {
      const lockedRecord = lockedMap.get(u.id);

      if (lockedRecord) {
        return {
          id: lockedRecord.id,
          user_id: u.id,
          user_name: lockedRecord.user_name || u.full_name,
          user_role: lockedRecord.user_role || u.role,
          contract_type: (lockedRecord.contract_type || u.contract_type || 'sales') as ContractType,
          base_salary: parseFloat(lockedRecord.base_salary || '0'),
          effective_base_salary: parseFloat(lockedRecord.base_salary || '0') * ((lockedRecord.contract_type || u.contract_type) === 'probation' ? 0.85 : 1.0),
          standard_days: parseInt(lockedRecord.standard_days || standardDays.toString(), 10),
          unit_daily_salary: Math.round(
            (parseFloat(lockedRecord.base_salary || '0') * ((lockedRecord.contract_type || u.contract_type) === 'probation' ? 0.85 : 1.0)) /
            parseInt(lockedRecord.standard_days || standardDays.toString(), 10)
          ),
          actual_days: parseFloat(lockedRecord.actual_days || '0'),
          ot_hours: parseFloat(lockedRecord.ot_hours || '0'),
          salary_by_days: parseFloat(lockedRecord.salary_by_days || '0'),
          ot_salary: parseFloat(lockedRecord.ot_salary || '0'),
          shared_commission: parseFloat(lockedRecord.shared_commission || '0'),
          personal_commission: parseFloat(lockedRecord.personal_commission || '0'),
          main_devices_count: personalDevicesCountMap.get(u.id) || 0,
          allowances: Array.isArray(lockedRecord.allowances) ? lockedRecord.allowances : [],
          deductions: Array.isArray(lockedRecord.deductions) ? lockedRecord.deductions : [],
          total_allowance: parseFloat(lockedRecord.total_allowance || '0'),
          total_deduction: parseFloat(lockedRecord.total_deduction || '0'),
          final_salary: parseFloat(lockedRecord.final_salary || '0'),
          status: lockedRecord.status || 'pending',
          is_locked: true,
          locked_at: lockedRecord.locked_at,
          note: lockedRecord.note || '',
        };
      }

      // Live Calculation
      const att = attMap.get(u.id) || { active_days_count: 0, total_work_hours: 0, total_ot_hours: 0, off_days_worked: 0 };
      const contractType = (u.contract_type || 'sales') as ContractType;
      const baseSalary = parseFloat(u.base_salary || '0');

      // Contract factor: Thử việc = 85%, Bán hàng/Sale/Quản lý = 100%
      const contractFactor = contractType === 'probation' ? 0.85 : 1.0;
      const effectiveBaseSalary = Math.round(baseSalary * contractFactor);

      // Đơn giá 1 ngày công = Lương CB Thực / standard_days (26 hoặc 27)
      const unitDailySalary = Math.round(effectiveBaseSalary / standardDays);

      // Actual workdays: active days + 1 extra for each off day worked
      const actualDays = att.active_days_count + att.off_days_worked;
      const otHours = att.total_ot_hours;

      // Lương Ngày Công = Đơn giá 1 ngày công * Số ngày làm thực tế
      const salaryByDays = Math.round(unitDailySalary * actualDays);

      // Lương OT (11 tiếng/ngày): (Đơn giá 1 ngày công / 11) * Số giờ OT * 150%
      const otSalary = Math.round((unitDailySalary / 11) * otHours * 1.5);

      // Personal & Shared Commission
      const personalCommission = personalCommissionMap.get(u.id) || 0;
      const sharedCommission = sharedCommissionPerPerson;

      const finalSalary = Math.max(0, salaryByDays + otSalary + sharedCommission + personalCommission);

      return {
        user_id: u.id,
        user_name: u.full_name,
        user_role: u.role,
        contract_type: contractType,
        base_salary: baseSalary,
        effective_base_salary: effectiveBaseSalary,
        standard_days: standardDays,
        unit_daily_salary: unitDailySalary,
        actual_days: actualDays,
        off_days_worked: att.off_days_worked,
        ot_hours: otHours,
        salary_by_days: salaryByDays,
        ot_salary: otSalary,
        shared_commission: sharedCommission,
        personal_commission: personalCommission,
        main_devices_count: personalDevicesCountMap.get(u.id) || 0,
        allowances: [],
        deductions: [],
        total_allowance: 0,
        total_deduction: 0,
        final_salary: finalSalary,
        status: 'pending',
        is_locked: false,
        note: '',
      };
    });

    return NextResponse.json({
      month,
      standardDays,
      daysInMonth,
      totalMainDevicesSold,
      totalEligibleStaff,
      sharedCommissionPerPerson,
      payroll: payrollItems,
      isFinancialAdmin,
    });
  } catch (err: any) {
    console.error('Payroll GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Lock & Save Monthly Payroll to salary_history
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Admin hoặc Chủ cửa hàng mới có quyền chốt & lưu bảng lương' },
        { status: 403 }
      );
    }

    const { month, payrollItems } = await request.json();
    if (!month || !payrollItems || !Array.isArray(payrollItems)) {
      return NextResponse.json({ error: 'Thiếu thông tin bảng lương hoặc tháng' }, { status: 400 });
    }

    for (const item of payrollItems) {
      const allowancesJson = JSON.stringify(item.allowances || []);
      const deductionsJson = JSON.stringify(item.deductions || []);

      await query(
        `INSERT INTO salary_history (
          month, user_id, user_name, user_role, contract_type, base_salary, standard_days,
          actual_days, ot_hours, salary_by_days, ot_salary, shared_commission, personal_commission,
          allowances, deductions, total_allowance, total_deduction, final_salary, status, note, locked_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16, $17, $18, $19, $20, NOW(), $21
        )
        ON CONFLICT (user_id, month) DO UPDATE
        SET 
          user_name = $3,
          user_role = $4,
          contract_type = $5,
          base_salary = $6,
          standard_days = $7,
          actual_days = $8,
          ot_hours = $9,
          salary_by_days = $10,
          ot_salary = $11,
          shared_commission = $12,
          personal_commission = $13,
          allowances = $14::jsonb,
          deductions = $15::jsonb,
          total_allowance = $16,
          total_deduction = $17,
          final_salary = $18,
          status = $19,
          note = $20,
          locked_at = NOW(),
          created_by = $21`,
        [
          month,
          item.user_id,
          item.user_name,
          item.user_role,
          item.contract_type || 'sales',
          parseFloat(item.base_salary || 0),
          parseInt(item.standard_days || 26, 10),
          parseFloat(item.actual_days || 0),
          parseFloat(item.ot_hours || 0),
          parseFloat(item.salary_by_days || 0),
          parseFloat(item.ot_salary || 0),
          parseFloat(item.shared_commission || 0),
          parseFloat(item.personal_commission || 0),
          allowancesJson,
          deductionsJson,
          parseFloat(item.total_allowance || 0),
          parseFloat(item.total_deduction || 0),
          parseFloat(item.final_salary || 0),
          item.status || 'pending',
          item.note || null,
          user.id,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã chốt và lưu cố định bảng lương tháng ${month} thành công!`,
    });
  } catch (err: any) {
    console.error('Payroll POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Update Base Salary, Contract Type or Status
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Admin hoặc Chủ cửa hàng mới có quyền chỉnh sửa' },
        { status: 403 }
      );
    }

    const { action, user_id, base_salary, contract_type, salary_id, status } = await request.json();

    if (action === 'update_base_salary') {
      if (!user_id || base_salary === undefined) {
        return NextResponse.json({ error: 'Thiếu user_id hoặc base_salary' }, { status: 400 });
      }

      await query('UPDATE users SET base_salary = $1 WHERE id = $2', [
        parseFloat(base_salary || 0),
        user_id,
      ]);

      return NextResponse.json({
        success: true,
        message: 'Đã cập nhật mức Lương Cơ Bản của nhân viên!',
      });
    }

    if (action === 'update_contract_type') {
      if (!user_id || !contract_type) {
        return NextResponse.json({ error: 'Thiếu user_id hoặc contract_type' }, { status: 400 });
      }

      await query('UPDATE users SET contract_type = $1 WHERE id = $2', [
        contract_type,
        user_id,
      ]);

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật Loại Hợp Đồng sang "${contract_type}"!`,
      });
    }

    if (action === 'toggle_status') {
      if (!salary_id || !status) {
        return NextResponse.json({ error: 'Thiếu salary_id hoặc status' }, { status: 400 });
      }

      await query('UPDATE salary_history SET status = $1 WHERE id = $2', [status, salary_id]);

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật trạng thái bảng lương sang "${status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}"`,
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    console.error('Payroll PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
