const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function resetProductionData() {
  console.log('🚀 Đang kết nối Supabase Cloud Database để xóa dữ liệu test...');
  
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

    console.log('🧹 1. Đang xóa toàn bộ giao dịch Sổ quỹ (cash_flow)...');
    const cfRes = await client.query('DELETE FROM cash_flow');
    console.log(`   -> Đã xóa ${cfRes.rowCount} bản ghi sổ quỹ`);

    console.log('🧹 2. Đang xóa toàn bộ chi tiết hóa đơn & hóa đơn (order_items & orders)...');
    const oiRes = await client.query('DELETE FROM order_items');
    const oRes = await client.query('DELETE FROM orders');
    console.log(`   -> Đã xóa ${oiRes.rowCount} chi tiết hóa đơn & ${oRes.rowCount} đơn hàng`);

    console.log('🧹 3. Đang xóa toàn bộ kho hàng tồn IMEI (inventory)...');
    const invRes = await client.query('DELETE FROM inventory');
    console.log(`   -> Đã xóa ${invRes.rowCount} máy tồn kho`);

    console.log('🧹 4. Đang xóa danh mục mẫu sản phẩm test (products)...');
    const prodRes = await client.query('DELETE FROM products');
    console.log(`   -> Đã xóa ${prodRes.rowCount} mẫu sản phẩm`);

    console.log('🧹 5. Đang đặt lại toàn bộ công nợ khách hàng & nhà cung cấp về 0 đ...');
    const partRes = await client.query('UPDATE partners SET debt = 0');
    console.log(`   -> Đã đặt lại công nợ ${partRes.rowCount} đối tác về 0 đ`);

    await client.query('COMMIT');

    console.log('\n======================================================');
    console.log('🎉 XÓA DỮ LIỆU THỬ NGHIỆM THÀNH CÔNG 100%!');
    console.log('✨ Toàn bộ Kho Hàng, Đơn Hàng, Sổ Quỹ và Công Nợ đã được làm sạch.');
    console.log('🔒 Các tài khoản người dùng Admin / Nhân viên được giữ nguyên vẹn.');
    console.log('🚀 Hệ thống TD Mobile Store đã sẵn sàng đưa vào hoạt động chính thức!');
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi xóa dữ liệu:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

resetProductionData();
