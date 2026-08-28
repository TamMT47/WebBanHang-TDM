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
    } else if (range === '7days') {
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

    // 1. Overall Sell Metrics & Profit
    const metricsSql = `
      SELECT 
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(o.final_payment), 0) AS total_revenue,
        COALESCE(SUM(o.paid_amount), 0) AS total_collected,
        COALESCE(SUM(o.debt_added), 0) AS total_debt_created,
        COALESCE(SUM(o.discount), 0) AS total_discount,
        COALESCE(SUM(o.trade_in_value), 0) AS total_trade_in_value,
        COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.paid_amount ELSE 0 END), 0) AS cash_revenue,
        COALESCE(SUM(CASE WHEN o.payment_method = 'transfer' THEN o.paid_amount ELSE 0 END), 0) AS transfer_revenue
      FROM orders o
      WHERE o.type = 'sell' AND ${dateCondition}
    `;
    const metricsRes = await query(metricsSql, params);
    const metrics = metricsRes.rows[0];

    // 2. Calculate Profit: Sum(OrderItem.price - Inventory.cost_price) - Order.discount
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
    const netProfit = grossItemsProfit - parseFloat(metrics.total_discount || 0);

    // 3. Top selling categories and products
    const topProductsSql = `
      SELECT 
        p.name,
        p.category,
        COUNT(oi.id) AS sold_count,
        SUM(oi.price) AS total_sales
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      JOIN products p ON i.product_id = p.id
      WHERE o.type = 'sell' AND ${dateCondition}
      GROUP BY p.name, p.category
      ORDER BY sold_count DESC
      LIMIT 6
    `;
    const topProductsRes = await query(topProductsSql, params);

    // 4. Daily revenue chart breakdown for last 7 days or this month
    const dailyChartSql = `
      SELECT 
        TO_CHAR(o.created_at, 'YYYY-MM-DD') AS day,
        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(SUM(o.final_payment), 0) AS revenue
      FROM orders o
      WHERE o.type = 'sell' AND ${dateCondition}
      GROUP BY TO_CHAR(o.created_at, 'YYYY-MM-DD')
      ORDER BY day ASC
    `;
    const dailyChartRes = await query(dailyChartSql, params);

    return NextResponse.json({
      metrics: {
        total_orders: parseInt(metrics.total_orders, 10),
        total_revenue: parseFloat(metrics.total_revenue),
        total_collected: parseFloat(metrics.total_collected),
        total_debt_created: parseFloat(metrics.total_debt_created),
        total_discount: parseFloat(metrics.total_discount),
        total_trade_in_value: parseFloat(metrics.total_trade_in_value),
        cash_revenue: parseFloat(metrics.cash_revenue),
        transfer_revenue: parseFloat(metrics.transfer_revenue),
        net_profit: netProfit,
      },
      top_products: topProductsRes.rows,
      daily_chart: dailyChartRes.rows,
    });
  } catch (error: any) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
