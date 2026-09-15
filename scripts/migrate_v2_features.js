const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigration() {
  console.log('🚀 Đang chạy migration các tính năng mới...');

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
    await client.query('BEGIN');

    // 1. Add seller_id to orders
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log('  -> Đã thêm cột seller_id vào bảng orders');

    // 2. Add contract_type to users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'sales';
    `);
    console.log('  -> Đã thêm cột contract_type vào bảng users');

    // 3. Add late_minutes, early_minutes, is_off_day to attendance
    await client.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS late_minutes INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS early_minutes INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_off_day BOOLEAN DEFAULT FALSE;
    `);
    console.log('  -> Đã cập nhật bảng attendance');

    // 4. Create employee_off_days table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_off_days (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        week_str VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_week_off UNIQUE (user_id, week_str)
      );
      CREATE INDEX IF NOT EXISTS idx_employee_off_days_user_date ON employee_off_days(user_id, date);
    `);
    console.log('  -> Đã tạo bảng employee_off_days');

    // 5. Add contract_type, commissions to salary_history
    await client.query(`
      ALTER TABLE salary_history 
      ADD COLUMN IF NOT EXISTS contract_type VARCHAR(50) DEFAULT 'sales',
      ADD COLUMN IF NOT EXISTS shared_commission NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS personal_commission NUMERIC DEFAULT 0;
    `);
    console.log('  -> Đã cập nhật bảng salary_history');

    await client.query('COMMIT');
    console.log('✅ Migration v2 hoàn tất thành công!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
