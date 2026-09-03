import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    // Get all users
    let userSql = 'SELECT id, username, full_name, role, COALESCE(base_salary, 0) AS base_salary FROM users';
    const userParams: any[] = [];
    if (!isFinancialAdmin) {
      userParams.push(user.id);
      userSql += ` WHERE id = $1`;
    }
    userSql += ` ORDER BY role = 'admin' DESC, role = 'owner' DESC, full_name ASC`;
    const usersRes = await query(userSql, userParams);

    // Get locked salary history for this month
    const historyRes = await query(
      `SELECT * FROM salary_history WHERE month = $1`,
      [month]
    );
    const lockedMap = new Map<string, any>();
    for (const row of historyRes.rows) {
      lockedMap.set(row.user_id, row);
    }

    // Get attendance metrics for each user in this month
    const attendanceRes = await query(
      `SELECT 
        user_id,
        COUNT(DISTINCT date) AS active_days_count,
        COALESCE(SUM(work_hours), 0) AS total_work_hours,
        COALESCE(SUM(ot_hours), 0) AS total_ot_hours
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
      });
    }

    // Compile payroll list
    const payrollItems = usersRes.rows.map((u) => {
      const lockedRecord = lockedMap.get(u.id);

      if (lockedRecord) {
        return {
          id: lockedRecord.id,
          user_id: u.id,
          user_name: lockedRecord.user_name || u.full_name,
          user_role: lockedRecord.user_role || u.role,
          base_salary: parseFloat(lockedRecord.base_salary || '0'),
          standard_days: parseInt(lockedRecord.standard_days || '26', 10),
          actual_days: parseFloat(lockedRecord.actual_days || '0'),
          ot_hours: parseFloat(lockedRecord.ot_hours || '0'),
          salary_by_days: parseFloat(lockedRecord.salary_by_days || '0'),
          ot_salary: parseFloat(lockedRecord.ot_salary || '0'),
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
      const att = attMap.get(u.id) || { active_days_count: 0, total_work_hours: 0, total_ot_hours: 0 };
      const baseSalary = parseFloat(u.base_salary || '0');
      const standardDays = 26;
      
      // Calculate actual days: work_hours / 8
      const actualDays = Math.round(((att.total_work_hours / 8) + Number.EPSILON) * 100) / 100;
      const otHours = att.total_ot_hours;

      // Formula:
      // Lương ngày công = (base_salary / 26) * actual_days
      // Lương OT = (base_salary / 26 / 8) * ot_hours * 150%
      const salaryByDays = Math.round(((baseSalary / standardDays) * actualDays) + Number.EPSILON);
      const otSalary = Math.round((((baseSalary / standardDays / 8) * otHours * 1.5) + Number.EPSILON));
      const finalSalary = Math.max(0, salaryByDays + otSalary);

      return {
        user_id: u.id,
        user_name: u.full_name,
        user_role: u.role,
        base_salary: baseSalary,
        standard_days: standardDays,
        actual_days: actualDays,
        ot_hours: otHours,
        salary_by_days: salaryByDays,
        ot_salary: otSalary,
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
          month, user_id, user_name, user_role, base_salary, standard_days,
          actual_days, ot_hours, salary_by_days, ot_salary, allowances, deductions,
          total_allowance, total_deduction, final_salary, status, note, locked_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17, NOW(), $18
        )
        ON CONFLICT (user_id, month) DO UPDATE
        SET 
          user_name = $3,
          user_role = $4,
          base_salary = $5,
          standard_days = $6,
          actual_days = $7,
          ot_hours = $8,
          salary_by_days = $9,
          ot_salary = $10,
          allowances = $11::jsonb,
          deductions = $12::jsonb,
          total_allowance = $13,
          total_deduction = $14,
          final_salary = $15,
          status = $16,
          note = $17,
          locked_at = NOW(),
          created_by = $18`,
        [
          month,
          item.user_id,
          item.user_name,
          item.user_role,
          parseFloat(item.base_salary || 0),
          parseInt(item.standard_days || 26, 10),
          parseFloat(item.actual_days || 0),
          parseFloat(item.ot_hours || 0),
          parseFloat(item.salary_by_days || 0),
          parseFloat(item.ot_salary || 0),
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

// Update Base Salary or Status
export async function PATCH(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Chỉ Admin hoặc Chủ cửa hàng mới có quyền chỉnh sửa' },
        { status: 403 }
      );
    }

    const { action, user_id, base_salary, salary_id, status } = await request.json();

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
