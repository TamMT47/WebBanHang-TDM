const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function updateImeiConstraint() {
  console.log('🚀 Đang kết nối CSDL Supabase để cập nhật ràng buộc IMEI...');

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
    console.log('✅ Đã kết nối thành công!');
    
    // 1. Drop existing global unique constraints/indexes on imei
    console.log('🔄 Đang gỡ bỏ ràng buộc UNIQUE toàn cục trên cột imei...');
    await client.query(`
      ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_imei_key;
      DROP INDEX IF EXISTS inventory_imei_key;
    `);

    // 2. Create Partial Unique Index: only enforce uniqueness for in_stock items
    console.log('✨ Đang tạo Partial Unique Index: UNIQUE(imei) WHERE status = \'in_stock\'...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_active_inventory_imei 
      ON inventory (imei) 
      WHERE status = 'in_stock';
    `);

    console.log('🎉 CẬP NHẬT RÀNG BUỘC IMEI THÀNH CÔNG! Giờ đây hệ thống cho phép nhập lại máy đã bán (Thu cũ đổi mới / Nhập lại từ khách).');
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật ràng buộc IMEI:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateImeiConstraint();
