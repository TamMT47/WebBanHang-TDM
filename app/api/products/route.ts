import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    let sql = `
      SELECT p.*,
        COUNT(CASE WHEN i.status = 'in_stock' THEN 1 END) as in_stock_count,
        COUNT(CASE WHEN i.status = 'sold' THEN 1 END) as sold_count,
        MIN(CASE WHEN i.status = 'in_stock' THEN i.selling_price END) as min_price,
        MAX(CASE WHEN i.status = 'in_stock' THEN i.selling_price END) as max_price
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (p.name ILIKE $${params.length} OR p.color ILIKE $${params.length} OR p.storage ILIKE $${params.length})`;
    }

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND p.category = $${params.length}`;
    }

    // Sort products alphabetically A-Z
    sql += ` GROUP BY p.id ORDER BY p.name ASC`;

    const result = await query(sql, params);
    return NextResponse.json({ products: result.rows });
  } catch (error: any) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { name, category, condition, color, storage } = await request.json();

    if (!name || !category) {
      return NextResponse.json({ error: 'Vui lòng điền tên và danh mục sản phẩm' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO products (name, category, condition, color, storage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), category, condition || '99%', color || '', storage || '']
    );

    return NextResponse.json({ product: result.rows[0] });
  } catch (error: any) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
