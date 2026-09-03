const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function migrateAttendanceAndPayroll() {
  console.log('🚀 Đang kết nối Supabase Cloud Database để tạo bảng Chấm Công & Bảng Lương...');

  const pool = new Pool({
    user: process.env.PGUSER || 'postgres.oowsibtlhvgtqzyenkaw',
    password: process.env.PGPASSWORD || 'Tam04072001@#$',
    host: process.env.PGHOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: parseInt(process.env.PGPORT || '6543', 10),
    database: process.env.PGDATABASE || 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    console.log('✅ Đã kết nối Supabase PostgreSQL!');
    await client.query('BEGIN');

    // 1. Store Settings table for Wifi IP & System configs
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã tạo / kiểm tra bảng store_settings');

    // Default Wifi IP if not exists
    await client.query(`
      INSERT INTO store_settings (key, value, description)
      VALUES ('store_wifi_ip', '', 'Địa chỉ IP Wifi cửa hàng dùng cho chấm công')
      ON CONFLICT (key) DO NOTHING;
    `);

    // 2. Add base_salary column to users if not exists
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0;
    `);
    console.log('  -> Đã thêm cột base_salary vào bảng users');

    // 3. Attendance Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        shift VARCHAR(50) NOT NULL, -- 'morning', 'afternoon', 'evening', 'full'
        check_in TIMESTAMPTZ NOT NULL,
        check_out TIMESTAMPTZ,
        ip_address VARCHAR(100),
        work_hours NUMERIC DEFAULT 0,
        ot_hours NUMERIC DEFAULT 0,
        note TEXT,
        status VARCHAR(50) DEFAULT 'present', -- 'present', 'late', 'left_early', 'completed'
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
    `);
    console.log('  -> Đã tạo bảng attendance');

    // 4. Salary History Table (Locked Monthly Payroll Archive)
    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        base_salary NUMERIC DEFAULT 0,
        standard_days INT DEFAULT 26,
        actual_days NUMERIC DEFAULT 0,
        ot_hours NUMERIC DEFAULT 0,
        salary_by_days NUMERIC DEFAULT 0,
        ot_salary NUMERIC DEFAULT 0,
        allowances JSONB DEFAULT '[]'::jsonb,
        deductions JSONB DEFAULT '[]'::jsonb,
        total_allowance NUMERIC DEFAULT 0,
        total_deduction NUMERIC DEFAULT 0,
        final_salary NUMERIC DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending' (Chờ thanh toán), 'paid' (Đã thanh toán)
        note TEXT,
        locked_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT unique_salary_user_month UNIQUE (user_id, month)
      );
      CREATE INDEX IF NOT EXISTS idx_salary_history_month ON salary_history(month);
    `);
    console.log('  -> Đã tạo bảng salary_history');

    await client.query('COMMIT');
    console.log('\n🎉 MIGRATION HOÀN TẤT THÀNH CÔNG 100%!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi Migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAttendanceAndPayroll();
