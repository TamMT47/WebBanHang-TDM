import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, canViewSensitiveFinancials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !canViewSensitiveFinancials(user.role)) {
      return NextResponse.json(
        { error: 'Nhân viên không có quyền truy cập Báo Cáo Doanh Thu & Lợi Nhuận' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';
    const customFrom = searchParams.get('dateFrom');
    const customTo = searchParams.get('dateTo');

    let dateCondition = '';
    let params: any[] = [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (range === 'today') {
      params.push(`${todayStr} 00:00:00`, `${todayStr} 23:59:59`);
      dateCondition = `o.created_at >= $1 AND o.created_at <= $2`;
    } else if (range === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yestStr = yest.toISOString().split('T')[0];
      params.push(`${yestStr} 00:00:00`, `${yestStr} 23:59:59`);
      dateCondition = `o.created_at >= $1 AND o.created_at <= $2`;
    } else if (range === 'this_week' || range === '7days') {
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const d7Str = d7.toISOString().split('T')[0];
      params.push(`${d7Str} 00:00:00`, `${todayStr} 23:59:59`);
      dateCondition = `o.created_at >= $1 AND o.created_at <= $2`;
    } else if (range === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      params.push(`${firstDay} 00:00:00`, `${todayStr} 23:59:59`);
      dateCondition = `o.created_at >= $1 AND o.created_at <= $2`;
    } else if (range === 'custom' && customFrom && customTo) {
      params.push(`${customFrom} 00:00:00`, `${customTo} 23:59:59`);
      dateCondition = `o.created_at >= $1 AND o.created_at <= $2`;
    } else {
      dateCondition = `1=1`;
    }

    // 1. Overall Sell Metrics
    const metricsSql = `
      SELECT 
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(o.total_amount - o.discount), 0) AS total_revenue,
        COALESCE(SUM(o.paid_amount), 0) AS total_collected,
        COALESCE(SUM(o.debt_added), 0) AS total_debt_created,
        COALESCE(SUM(o.discount), 0) AS total_discount,
        COALESCE(SUM(o.trade_in_value), 0) AS total_trade_in,
        COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.paid_amount ELSE 0 END), 0) AS cash_revenue,
        COALESCE(SUM(CASE WHEN o.payment_method = 'transfer' THEN o.paid_amount ELSE 0 END), 0) AS transfer_revenue
      FROM orders o
      WHERE o.type = 'sell' AND ${dateCondition}
    `;
    const metricsRes = await query(metricsSql, params);
    const metrics = metricsRes.rows[0];

    // 2. Calculate Gross Profit: Sum(OrderItem.price - Inventory.cost_price) - Order.discount
    const profitSql = `
      SELECT 
        COALESCE(SUM(oi.price - COALESCE(i.cost_price, 0)), 0) AS gross_items_profit
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      WHERE o.type = 'sell' AND ${dateCondition}
    `;
    const profitRes = await query(profitSql, params);
    const grossItemsProfit = parseFloat(profitRes.rows[0].gross_items_profit || 0);
    const grossProfit = Math.max(0, grossItemsProfit - parseFloat(metrics.total_discount || 0));

    // 3. Breakdown by Device Series (iPhone 11, 12, 13, 14, 15, 16, iPad, Macbook...)
    const modelSeriesSql = `
      SELECT 
        CASE 
          WHEN (p.name ILIKE '%16%' OR p.name ILIKE '%iphone 16%') AND (p.category = 'iPhone' OR p.category IS NULL) THEN 'iPhone 16 Series'
          WHEN (p.name ILIKE '%15%' OR p.name ILIKE '%iphone 15%') AND (p.category = 'iPhone' OR p.category IS NULL) THEN 'iPhone 15 Series'
          WHEN (p.name ILIKE '%14%' OR p.name ILIKE '%iphone 14%') AND (p.category = 'iPhone' OR p.category IS NULL) THEN 'iPhone 14 Series'
          WHEN (p.name ILIKE '%13%' OR p.name ILIKE '%iphone 13%') AND (p.category = 'iPhone' OR p.category IS NULL) THEN 'iPhone 13 Series'
          WHEN (p.name ILIKE '%12%' OR p.name ILIKE '%iphone 12%') AND (p.category = 'iPhone' OR p.category IS NULL) THEN 'iPhone 12 Series'
          WHEN (p.name ILIKE '%11%' OR p.name ILIKE '%iphone 11%') AND (p.category = 'iPhone' OR p.category IS NULL) THEN 'iPhone 11 Series'
          WHEN (p.name ILIKE '%xs%' OR p.name ILIKE '%xr%' OR p.name ILIKE '% x%' OR p.name ILIKE 'iphone x%') THEN 'iPhone X / XS / XR'
          WHEN (p.name ILIKE '%8%' OR p.name ILIKE '%7%' OR p.name ILIKE '%se%') AND p.category = 'iPhone' THEN 'iPhone 7 / 8 / SE'
          WHEN p.category = 'iPad' OR p.name ILIKE '%ipad%' THEN 'iPad Series'
          WHEN p.category = 'Macbook' OR p.name ILIKE '%macbook%' THEN 'Macbook Series'
          WHEN p.category = 'Airpods' OR p.name ILIKE '%airpod%' THEN 'Airpods Series'
          WHEN p.category = 'AppleWatch' OR p.name ILIKE '%watch%' THEN 'Apple Watch'
          ELSE 'Phụ Kiện & Khác'
        END AS series_name,
        COUNT(oi.id) AS quantity_sold,
        COALESCE(SUM(oi.price), 0) AS total_revenue,
        COALESCE(SUM(oi.price - COALESCE(i.cost_price, 0)), 0) AS gross_profit
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE o.type = 'sell' AND ${dateCondition}
      GROUP BY 1
      ORDER BY quantity_sold DESC, total_revenue DESC
    `;
    const modelSeriesRes = await query(modelSeriesSql, params);

    // 4. Top selling products
    const topProductsSql = `
      SELECT 
        COALESCE(p.name, 'Sản phẩm khác') AS product_name,
        COALESCE(p.category, 'iPhone') AS category,
        COALESCE(p.storage, '') AS storage,
        COALESCE(p.condition, '') AS condition,
        COUNT(oi.id) AS quantity_sold,
        COALESCE(SUM(oi.price), 0) AS total_sales
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE o.type = 'sell' AND ${dateCondition}
      GROUP BY p.name, p.category, p.storage, p.condition
      ORDER BY quantity_sold DESC, total_sales DESC
      LIMIT 12
    `;
    const topProductsRes = await query(topProductsSql, params);

    // 5. Daily revenue & profit breakdown
    const dailyChartSql = `
      SELECT 
        TO_CHAR(o.created_at, 'YYYY-MM-DD') AS sale_date,
        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(SUM(o.total_amount - o.discount), 0) AS revenue,
        COALESCE(SUM(oi.price - COALESCE(i.cost_price, 0)), 0) - COALESCE(SUM(DISTINCT o.discount), 0) AS profit
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      WHERE o.type = 'sell' AND ${dateCondition}
      GROUP BY TO_CHAR(o.created_at, 'YYYY-MM-DD')
      ORDER BY sale_date DESC
    `;
    const dailyChartRes = await query(dailyChartSql, params);

    return NextResponse.json({
      kpis: {
        total_revenue: parseFloat(metrics.total_revenue || 0),
        gross_profit: grossProfit,
        total_orders: parseInt(metrics.total_orders || 0, 10),
        total_trade_in: parseFloat(metrics.total_trade_in || 0),
        total_discount: parseFloat(metrics.total_discount || 0),
        total_collected: parseFloat(metrics.total_collected || 0),
        cash_revenue: parseFloat(metrics.cash_revenue || 0),
        transfer_revenue: parseFloat(metrics.transfer_revenue || 0),
      },
      model_series: modelSeriesRes.rows.map((row) => ({
        series_name: row.series_name,
        quantity_sold: parseInt(row.quantity_sold || 0, 10),
        total_revenue: parseFloat(row.total_revenue || 0),
        gross_profit: parseFloat(row.gross_profit || 0),
      })),
      top_products: topProductsRes.rows.map((row) => ({
        product_name: row.product_name,
        category: row.category,
        storage: row.storage,
        condition: row.condition,
        quantity_sold: parseInt(row.quantity_sold || 0, 10),
        total_sales: parseFloat(row.total_sales || 0),
      })),
      daily: dailyChartRes.rows.map((row) => ({
        sale_date: row.sale_date,
        order_count: parseInt(row.order_count || 0, 10),
        revenue: parseFloat(row.revenue || 0),
        profit: parseFloat(row.profit || 0),
      })),
    });
  } catch (error: any) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
