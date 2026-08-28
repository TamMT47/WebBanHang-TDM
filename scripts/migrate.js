const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function migrate() {
  console.log('🚀 Đang kết nối Supabase Cloud Database...');
  
  // Use explicit parameters to avoid any URI parsing issues with special characters in password
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
    console.log('✅ Đã kết nối thành công tới Supabase PostgreSQL!');
    console.log('📦 Bắt đầu khởi tạo các bảng CSDL...');

    // Enable uuid-ossp or pgcrypto extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 1. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'owner', 'manager', 'staff')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã tạo bảng users');

    // 2. Partners table
    await client.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        cccd VARCHAR(50),
        type VARCHAR(50) NOT NULL CHECK (type IN ('customer', 'supplier', 'both')),
        debt NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã tạo bảng partners');

    // 3. Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        condition VARCHAR(50) NOT NULL DEFAULT '99%',
        color VARCHAR(100),
        storage VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã tạo bảng products');

    // 4. Inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        imei VARCHAR(100) UNIQUE NOT NULL,
        cost_price NUMERIC DEFAULT 0,
        selling_price NUMERIC DEFAULT 0,
        battery_health INT DEFAULT 100,
        status VARCHAR(50) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'trade_in_pending')),
        supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã tạo bảng inventory');

    // 5. Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('sell', 'import')),
        partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        total_amount NUMERIC DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        trade_in_value NUMERIC DEFAULT 0,
        final_payment NUMERIC DEFAULT 0,
        paid_amount NUMERIC DEFAULT 0,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'both')),
        debt_added NUMERIC DEFAULT 0,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã tạo bảng orders');

    // 6. Order items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
        price NUMERIC NOT NULL,
        warranty_months INT DEFAULT 12,
        warranty_until TIMESTAMPTZ
      );
    `);
    console.log('  -> Đã tạo bảng order_items');

    // 7. Cash flow table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_flow (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('thu', 'chi')),
        amount NUMERIC NOT NULL,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
        category VARCHAR(100) NOT NULL CHECK (category IN ('ban_hang', 'nhap_hang', 'thu_no', 'tra_no', 'chi_phi_khac')),
        partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        note TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  -> Đã tạo bảng cash_flow');

    // Seed default users if table is empty
    const userCountRes = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCountRes.rows[0].count, 10) === 0) {
      console.log('🌱 Đang khởi tạo tài khoản mặc định...');
      const adminHash = await bcrypt.hash('admin123', 10);
      const ownerHash = await bcrypt.hash('owner123', 10);
      const managerHash = await bcrypt.hash('manager123', 10);
      const staffHash = await bcrypt.hash('staff123', 10);

      await client.query(`
        INSERT INTO users (username, password_hash, full_name, role) VALUES
        ('admin', $1, 'Quản Trị Viên TD Store', 'admin'),
        ('owner', $2, 'Chủ Cửa Hàng', 'owner'),
        ('manager', $3, 'Quản Lý Cửa Hàng', 'manager'),
        ('staff', $4, 'Nhân Viên Bán Hàng', 'staff');
      `, [adminHash, ownerHash, managerHash, staffHash]);
      console.log('  -> Đã tạo 4 tài khoản mặc định: admin/admin123, owner/owner123, manager/manager123, staff/staff123');
    }

    // Seed initial partners if empty
    const partnerCountRes = await client.query('SELECT COUNT(*) FROM partners');
    if (parseInt(partnerCountRes.rows[0].count, 10) === 0) {
      console.log('🌱 Đang tạo đối tác mẫu (Khách hàng & NCC)...');
      await client.query(`
        INSERT INTO partners (name, phone, address, cccd, type, debt) VALUES
        ('Nguyễn Văn An', '0901234567', '123 Cầu Giấy, Hà Nội', '001201009988', 'customer', 0),
        ('Trần Thị Mai', '0912345678', '45 Hai Bà Trưng, Hà Nội', '001201007766', 'customer', 500000),
        ('Kho Sỉ Apple Sài Gòn (Anh Tuấn)', '0988776655', 'Q1, TP. Hồ Chí Minh', '', 'supplier', -12000000),
        ('Nhà Phân Phối Linh Kiện Apple TD', '0977889900', 'Ba Đình, Hà Nội', '', 'supplier', 0);
      `);
    }

    // Seed initial products and inventory if empty
    const prodCountRes = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCountRes.rows[0].count, 10) === 0) {
      console.log('🌱 Đang tạo sản phẩm mẫu Apple (iPhone, iPad, Macbook, Airpods)...');
      
      const p1 = await client.query(`
        INSERT INTO products (name, category, condition, color, storage)
        VALUES ('iPhone 15 Pro Max 256GB Titan Tự Nhiên', 'iPhone', '99%', 'Titan Tự Nhiên', '256GB')
        RETURNING id;
      `);
      const p2 = await client.query(`
        INSERT INTO products (name, category, condition, color, storage)
        VALUES ('iPhone 15 Pro 128GB Titan Xanh', 'iPhone', '99%', 'Titan Xanh', '128GB')
        RETURNING id;
      `);
      const p3 = await client.query(`
        INSERT INTO products (name, category, condition, color, storage)
        VALUES ('iPhone 14 Pro Max 128GB Tím Deep Purple', 'iPhone', '98%', 'Deep Purple', '128GB')
        RETURNING id;
      `);
      const p4 = await client.query(`
        INSERT INTO products (name, category, condition, color, storage)
        VALUES ('Macbook Air M2 13.6 inch 8GB/256GB Midnight', 'Macbook', '99%', 'Midnight', '256GB')
        RETURNING id;
      `);
      const p5 = await client.query(`
        INSERT INTO products (name, category, condition, color, storage)
        VALUES ('iPad Pro 11 inch M2 WiFi 128GB Space Gray', 'iPad', '99%', 'Space Gray', '128GB')
        RETURNING id;
      `);
      const p6 = await client.query(`
        INSERT INTO products (name, category, condition, color, storage)
        VALUES ('Airpods Pro 2 Type-C Chính Hãng VN/A', 'Airpods', 'new', 'White', 'N/A')
        RETURNING id;
      `);

      // Add inventory
      await client.query(`
        INSERT INTO inventory (product_id, imei, cost_price, selling_price, battery_health, status) VALUES
        ('${p1.rows[0].id}', '356891234567890', 21500000, 24900000, 96, 'in_stock'),
        ('${p1.rows[0].id}', '356891234567891', 21800000, 25200000, 100, 'in_stock'),
        ('${p2.rows[0].id}', '357901234567892', 17500000, 20500000, 93, 'in_stock'),
        ('${p3.rows[0].id}', '358912345678903', 15500000, 17900000, 88, 'in_stock'),
        ('${p4.rows[0].id}', 'C02G1234MD6R', 16500000, 19200000, 95, 'in_stock'),
        ('${p5.rows[0].id}', 'DMPG5678IPAD', 14000000, 16800000, 98, 'in_stock'),
        ('${p6.rows[0].id}', 'H2XG9876AIRP', 4100000, 4850000, 100, 'in_stock');
      `);
    }

    // Seed initial cash flow if empty
    const cfCountRes = await client.query('SELECT COUNT(*) FROM cash_flow');
    if (parseInt(cfCountRes.rows[0].count, 10) === 0) {
      console.log('🌱 Đang tạo số dư ban đầu cho Sổ Quỹ...');
      await client.query(`
        INSERT INTO cash_flow (code, type, amount, payment_method, category, note) VALUES
        ('PT-INIT-01', 'thu', 50000000, 'cash', 'chi_phi_khac', 'Số dư quỹ tiền mặt đầu kỳ'),
        ('PT-INIT-02', 'thu', 100000000, 'transfer', 'chi_phi_khac', 'Số dư tài khoản ngân hàng đầu kỳ');
      `);
    }

    console.log('🎉 TOÀN BỘ CƠ SỞ DỮ LIỆU ĐÃ ĐƯỢC MIGRATION & SEED THÀNH CÔNG LÊN SUPABASE!');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình migration:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
