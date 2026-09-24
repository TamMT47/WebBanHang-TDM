const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function migratePrintJobs() {
  console.log('🚀 Đang kết nối Supabase Cloud Database để khởi tạo bảng print_jobs...');
  
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

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID,
        order_code VARCHAR(50),
        doc_type VARCHAR(20) DEFAULT 'invoice',
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PRINTING', 'PRINTED', 'FAILED')),
        printer_name VARCHAR(100) DEFAULT 'Xprinter USB Printer P',
        payload_escpos TEXT,
        payload_html TEXT,
        payload_json JSONB,
        error_message TEXT,
        created_by UUID,
        created_by_name VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        printed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs (status);
      CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON print_jobs (created_at DESC);
    `);

    console.log('✅ Đã tạo bảng print_jobs và các index thành công!');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình tạo bảng print_jobs:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migratePrintJobs();
