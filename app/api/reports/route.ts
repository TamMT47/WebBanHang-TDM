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
    const category = searchParams.get('category') || 'all';
    const staffId = searchParams.get('staff_id') || searchParams.get('user_id') || 'all';
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

    // Staff Filter Condition
    let staffCondition = '1=1';
    if (staffId && staffId !== 'all') {
      params.push(staffId);
      staffCondition = `(o.seller_id = $${params.length} OR o.created_by = $${params.length})`;
    }

    // Auto-heal legacy order_items without product_name or category
    await query(`
      UPDATE order_items oi
      SET 
        product_name = COALESCE(oi.product_name, p.name),
        category = COALESCE(oi.category, p.category)
      FROM inventory inv
      JOIN products p ON inv.product_id = p.id
      WHERE oi.inventory_id = inv.id
        AND (oi.product_name IS NULL OR oi.category IS NULL);
    `).catch(() => {});

    // Service condition (repair, battery, screen replacement, services)
    const serviceCondition = `(
      COALESCE(oi.category, p.category, '') = 'DichVu' 
      OR COALESCE(oi.item_type, '') = 'service' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE '%thay pin%' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE '%thay màn%' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE '%ép kính%' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE '%sửa chữa%' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE '%sửa %' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE 'sửa%' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE '%dịch vụ%' 
      OR COALESCE(oi.product_name, p.name, '') ILIKE '%thay thế%'
    )`;

    // Build Item Category Condition strictly separating physical devices from repair services
    let itemCatCondition = '1=1';
    if (category === 'iPhone' || category === 'IPHONE') {
      itemCatCondition = `(NOT ${serviceCondition} AND (COALESCE(oi.category, p.category, '') ILIKE '%iPhone%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%iPhone%'))`;
    } else if (category === 'iPad' || category === 'IPAD') {
      itemCatCondition = `(NOT ${serviceCondition} AND (COALESCE(oi.category, p.category, '') ILIKE '%iPad%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%iPad%'))`;
    } else if (category === 'MacBook' || category === 'Macbook' || category === 'MACBOOK') {
      itemCatCondition = `(NOT ${serviceCondition} AND (COALESCE(oi.category, p.category, '') ILIKE '%Mac%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%Mac%'))`;
    } else if (category === 'AirPods_Watch' || category === 'Airpods' || category === 'AppleWatch' || category === 'ACCESSORY') {
      itemCatCondition = `(NOT ${serviceCondition} AND (COALESCE(oi.category, p.category, '') ILIKE '%Airpod%' OR COALESCE(oi.category, p.category, '') ILIKE '%Watch%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%Airpod%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%Watch%'))`;
    } else if (category === 'PhuKien' || category === 'LINHKIEN') {
      itemCatCondition = `(NOT ${serviceCondition} AND (COALESCE(oi.category, p.category, '') IN ('PhuKien', 'LinhKien') OR COALESCE(oi.item_type, '') = 'accessory' OR COALESCE(oi.product_name, p.name, '') ILIKE '%phụ kiện%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%linh kiện%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%sạc%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%cáp%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%ốp%'))`;
    } else if (category === 'DichVu' || category === 'SERVICE') {
      itemCatCondition = serviceCondition;
    } else if (category && category !== 'all') {
      const cleanCat = category.replace(/'/g, "''");
      itemCatCondition = `(COALESCE(oi.category, p.category, '') ILIKE '%${cleanCat}%' OR COALESCE(oi.product_name, p.name, '') ILIKE '%${cleanCat}%')`;
    }

    let metrics: any;
    let grossProfit = 0;
    let totalUnits = 0;

    if (category === 'all' && staffId === 'all') {
      // 1. Overall Sell Metrics (Store Level)
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
      metrics = metricsRes.rows[0];

      // Total units sold across all orders
      const unitsSql = `
        SELECT COALESCE(SUM(COALESCE(oi.quantity, 1)), 0) AS total_units
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.type = 'sell' AND ${dateCondition}
      `;
      const unitsRes = await query(unitsSql, params);
      totalUnits = parseInt(unitsRes.rows[0]?.total_units || 0, 10);

      // 2. Calculate Gross Profit
      const profitSql = `
        SELECT 
          COALESCE(SUM((oi.price - COALESCE(i.cost_price, 0)) * COALESCE(oi.quantity, 1)), 0) AS gross_items_profit
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN inventory i ON oi.inventory_id = i.id
        WHERE o.type = 'sell' AND ${dateCondition}
      `;
      const profitRes = await query(profitSql, params);
      const grossItemsProfit = parseFloat(profitRes.rows[0].gross_items_profit || 0);
      grossProfit = Math.max(0, grossItemsProfit - parseFloat(metrics.total_discount || 0));
    } else {
      // Category and/or Staff Specific Metrics
      const metricsSql = `
        SELECT 
          COUNT(DISTINCT o.id) AS total_orders,
          COALESCE(SUM(COALESCE(oi.quantity, 1)), 0) AS total_units,
          COALESCE(SUM(oi.price * COALESCE(oi.quantity, 1)), 0) AS total_revenue,
          COALESCE(SUM(oi.price * COALESCE(oi.quantity, 1)), 0) AS total_collected,
          0 AS total_debt_created,
          0 AS total_discount,
          0 AS total_trade_in,
          0 AS cash_revenue,
          0 AS transfer_revenue,
          COALESCE(SUM((oi.price - COALESCE(i.cost_price, 0)) * COALESCE(oi.quantity, 1)), 0) AS gross_profit
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN inventory i ON oi.inventory_id = i.id
        LEFT JOIN products p ON i.product_id = p.id
        WHERE o.type = 'sell' AND ${dateCondition} AND ${staffCondition} AND ${itemCatCondition}
      `;
      const metricsRes = await query(metricsSql, params);
      metrics = metricsRes.rows[0];
      grossProfit = parseFloat(metrics.gross_profit || 0);
      totalUnits = parseInt(metrics.total_units || 0, 10);
    }

    // 3. Breakdown by Device Series / Category Group
    const modelSeriesSql = `
      SELECT 
        CASE 
          WHEN ${serviceCondition} THEN 'Dịch Vụ Sửa Chữa'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%18%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 18 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%17%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 17 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%16%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 16 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%15%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 15 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%14%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 14 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%13%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 13 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%12%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 12 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%11%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 11 Series'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%xs%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%xr%' OR COALESCE(p.name, oi.product_name, '') ILIKE '% x%' OR COALESCE(p.name, oi.product_name, '') ILIKE 'iphone x%') THEN 'iPhone X / XS / XR'
          WHEN (COALESCE(p.name, oi.product_name, '') ILIKE '%8%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%7%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%se%') AND (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iPhone%') THEN 'iPhone 7 / 8 / SE'
          WHEN (COALESCE(p.category, oi.category) ILIKE '%iPhone%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%iphone%') THEN 'iPhone Khác'
          WHEN COALESCE(p.category, oi.category) ILIKE '%iPad%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%ipad%' THEN 'iPad Series'
          WHEN COALESCE(p.category, oi.category) ILIKE '%Mac%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%mac%' THEN 'Macbook Series'
          WHEN COALESCE(p.category, oi.category) ILIKE '%Airpod%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%airpod%' THEN 'Airpods Series'
          WHEN COALESCE(p.category, oi.category) ILIKE '%Watch%' OR COALESCE(p.name, oi.product_name, '') ILIKE '%watch%' THEN 'Apple Watch'
          WHEN COALESCE(oi.category, p.category) IN ('PhuKien', 'LinhKien') OR oi.item_type = 'accessory' THEN 'Phụ Kiện & Linh Kiện'
          ELSE 'Sản Phẩm Khác'
        END AS series_name,
        SUM(COALESCE(oi.quantity, 1)) AS quantity_sold,
        COALESCE(SUM(oi.price * COALESCE(oi.quantity, 1)), 0) AS total_revenue,
        COALESCE(SUM((oi.price - COALESCE(i.cost_price, 0)) * COALESCE(oi.quantity, 1)), 0) AS gross_profit
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE o.type = 'sell' AND ${dateCondition} AND ${staffCondition} AND ${itemCatCondition}
      GROUP BY 1
      ORDER BY quantity_sold DESC, total_revenue DESC
    `;
    const modelSeriesRes = await query(modelSeriesSql, params);

    // 4. Top selling products
    const topProductsSql = `
      SELECT 
        COALESCE(oi.product_name, p.name, 'Sản phẩm khác') AS product_name,
        COALESCE(oi.category, p.category, 'iPhone') AS category,
        COALESCE(p.storage, '') AS storage,
        COALESCE(p.condition, '') AS condition,
        SUM(COALESCE(oi.quantity, 1)) AS quantity_sold,
        COALESCE(SUM(oi.price * COALESCE(oi.quantity, 1)), 0) AS total_sales
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE o.type = 'sell' AND ${dateCondition} AND ${staffCondition} AND ${itemCatCondition}
      GROUP BY COALESCE(oi.product_name, p.name, 'Sản phẩm khác'), COALESCE(oi.category, p.category, 'iPhone'), p.storage, p.condition
      ORDER BY quantity_sold DESC, total_sales DESC
      LIMIT 12
    `;
    const topProductsRes = await query(topProductsSql, params);

    // 5. Daily revenue & profit breakdown
    const dailyChartSql = `
      SELECT 
        TO_CHAR(o.created_at, 'YYYY-MM-DD') AS sale_date,
        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(SUM(oi.price * COALESCE(oi.quantity, 1)), 0) AS revenue,
        COALESCE(SUM((oi.price - COALESCE(i.cost_price, 0)) * COALESCE(oi.quantity, 1)), 0) AS profit
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE o.type = 'sell' AND ${dateCondition} AND ${staffCondition} AND ${itemCatCondition}
      GROUP BY TO_CHAR(o.created_at, 'YYYY-MM-DD')
      ORDER BY sale_date DESC
    `;
    const dailyChartRes = await query(dailyChartSql, params);

    // 6. Staff List & Staff KPI Breakdown
    const staffListRes = await query(
      `SELECT id, username, full_name, role FROM users ORDER BY role = 'admin' DESC, role = 'owner' DESC, role = 'manager' DESC, full_name ASC`
    );

    const staffKpiSql = `
      SELECT 
        u.id AS staff_id,
        u.full_name AS staff_name,
        u.role,
        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(SUM(COALESCE(oi.quantity, 1)), 0) AS units_sold,
        COALESCE(SUM(oi.price * COALESCE(oi.quantity, 1)), 0) AS total_revenue,
        COALESCE(SUM((oi.price - COALESCE(i.cost_price, 0)) * COALESCE(oi.quantity, 1)), 0) AS gross_profit
      FROM users u
      LEFT JOIN orders o ON (o.seller_id = u.id OR (o.seller_id IS NULL AND o.created_by = u.id)) 
        AND o.type = 'sell' 
        AND ${dateCondition}
      LEFT JOIN order_items oi ON o.id = oi.order_id AND ${itemCatCondition}
      LEFT JOIN inventory i ON oi.inventory_id = i.id
      LEFT JOIN products p ON i.product_id = p.id
      GROUP BY u.id, u.full_name, u.role
      ORDER BY units_sold DESC, total_revenue DESC
    `;
    const staffKpiRes = await query(staffKpiSql, params.slice(0, (staffId && staffId !== 'all') ? params.length - 1 : params.length));

    return NextResponse.json({
      category,
      staff_id: staffId,
      staff_list: staffListRes.rows,
      kpis: {
        total_revenue: parseFloat(metrics.total_revenue || 0),
        gross_profit: grossProfit,
        total_units: totalUnits,
        total_orders: parseInt(metrics.total_orders || 0, 10),
        total_trade_in: parseFloat(metrics.total_trade_in || 0),
        total_discount: parseFloat(metrics.total_discount || 0),
        total_collected: parseFloat(metrics.total_collected || 0),
        cash_revenue: parseFloat(metrics.cash_revenue || 0),
        transfer_revenue: parseFloat(metrics.transfer_revenue || 0),
      },
      staff_kpis: staffKpiRes.rows.map((row) => ({
        staff_id: row.staff_id,
        staff_name: row.staff_name,
        role: row.role,
        order_count: parseInt(row.order_count || 0, 10),
        units_sold: parseInt(row.units_sold || 0, 10),
        total_revenue: parseFloat(row.total_revenue || 0),
        gross_profit: parseFloat(row.gross_profit || 0),
      })),
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
