const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigration() {
  console.log('🚀 Đang chạy migration v3 (Services, Accessories, Shift management)...');

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

    // 1. Add extra columns to order_items for Services & Accessories
    await client.query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS imei VARCHAR(100),
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'phone',
      ADD COLUMN IF NOT EXISTS note TEXT;
    `);
    console.log('  -> Đã cập nhật bảng order_items (hỗ trợ Dịch vụ & Phụ kiện)');

    // 2. Ensure settings table exists for system configs & shift assignments
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã đảm bảo bảng settings tồn tại');

    // 3. Create user_shift_assignments table for flexible staff shift rotation
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_shift_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_shift VARCHAR(50) NOT NULL DEFAULT 'shift1',
        rotation_type VARCHAR(50) NOT NULL DEFAULT 'auto_weekly',
        note TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_shift_assignment UNIQUE (user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_shift_assignments_user_id ON user_shift_assignments(user_id);
    `);
    console.log('  -> Đã tạo bảng user_shift_assignments');

    await client.query('COMMIT');
    console.log('✅ Migration v3 hoàn tất thành công!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
