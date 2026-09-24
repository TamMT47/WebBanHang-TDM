import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateOrderReceiptEscpos, generateTestReceiptEscpos } from '@/lib/escpos';
import { DEFAULT_INVOICE_SETTINGS, InvoiceSettings } from '@/lib/invoiceSettings';

export const dynamic = 'force-dynamic';

/**
 * Ensure print_jobs table exists
 */
async function ensureTableExists() {
  try {
    await query(`
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
  } catch (e) {
    // ignore if already created
  }
}

/**
 * GET: Fetch print jobs in queue
 * Params: ?status=PENDING (or ALL, PRINTED, FAILED), ?limit=50
 */
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || 'ALL';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let sql = 'SELECT * FROM print_jobs';
    const params: any[] = [];

    if (statusParam && statusParam.toUpperCase() !== 'ALL') {
      sql += ' WHERE status = $1';
      params.push(statusParam.toUpperCase());
    }

    sql += ' ORDER BY created_at ASC LIMIT $' + (params.length + 1);
    params.push(limit);

    const res = await query(sql, params);

    return NextResponse.json({
      success: true,
      jobs: res.rows,
      count: res.rowCount,
    });
  } catch (err: any) {
    console.error('Error fetching print queue:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi tải hàng đợi in' },
      { status: 500 }
    );
  }
}

/**
 * POST: Enqueue a new print job from mobile device or web pos
 */
export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    const body = await request.json().catch(() => ({}));
    const {
      order,
      orderId,
      orderCode,
      docType = 'invoice',
      customSettings,
      rawBase64,
      payloadHtml,
      createdByName = 'Web POS Staff',
      createdById,
    } = body;

    const settings: InvoiceSettings = {
      ...DEFAULT_INVOICE_SETTINGS,
      ...(customSettings || {}),
      qzPrinterName: customSettings?.qzPrinterName || DEFAULT_INVOICE_SETTINGS.qzPrinterName,
    };

    const targetPrinter = settings.qzPrinterName || 'Xprinter USB Printer P';

    // 1. Generate ESC/POS base64 payload
    let base64Escpos = rawBase64 || '';
    if (!base64Escpos) {
      if (docType === 'test' || !order) {
        const buf = generateTestReceiptEscpos(settings);
        base64Escpos = buf.toString('base64');
      } else {
        const buf = generateOrderReceiptEscpos(order, settings, docType);
        base64Escpos = buf.toString('base64');
      }
    }

    const resolvedOrderCode = orderCode || order?.code || (docType === 'test' ? 'TEST-PRINT' : 'BILL');
    const resolvedOrderId = orderId || order?.id || null;

    // 2. Insert into print_jobs table with status 'PENDING'
    const insertRes = await query(
      `
      INSERT INTO print_jobs (
        order_id,
        order_code,
        doc_type,
        status,
        printer_name,
        payload_escpos,
        payload_html,
        payload_json,
        created_by,
        created_by_name
      ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        resolvedOrderId,
        resolvedOrderCode,
        docType,
        targetPrinter,
        base64Escpos,
        payloadHtml || null,
        order ? JSON.stringify(order) : null,
        createdById || null,
        createdByName,
      ]
    );

    const newJob = insertRes.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Đã gửi lệnh in tới máy chủ MacBook thành công!',
      job: newJob,
      jobId: newJob.id,
    });
  } catch (err: any) {
    console.error('Error enqueuing print job:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi thêm lệnh in vào hàng đợi' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update status of a print job (e.g. PRINTED, FAILED, PRINTING)
 */
export async function PATCH(request: NextRequest) {
  try {
    await ensureTableExists();
    const body = await request.json().catch(() => ({}));
    const { id, status, errorMessage } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Thiếu id hoặc status của lệnh in' },
        { status: 400 }
      );
    }

    const printedAt = status === 'PRINTED' ? new Date().toISOString() : null;

    const res = await query(
      `
      UPDATE print_jobs
      SET
        status = $1,
        error_message = $2,
        printed_at = CASE WHEN $1 = 'PRINTED' THEN NOW() ELSE printed_at END
      WHERE id = $3
      RETURNING *
      `,
      [status.toUpperCase(), errorMessage || null, id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy lệnh in để cập nhật' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật trạng thái lệnh in sang ${status}`,
      job: res.rows[0],
    });
  } catch (err: any) {
    console.error('Error updating print job:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Lỗi cập nhật lệnh in' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Clean up or delete jobs
 * ?action=clear_printed or ?id=<UUID>
 */
export async function DELETE(request: NextRequest) {
  try {
    await ensureTableExists();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (id) {
      await query('DELETE FROM print_jobs WHERE id = $1', [id]);
      return NextResponse.json({ success: true, message: 'Đã xóa lệnh in' });
    }

    if (action === 'clear_printed') {
      const res = await query("DELETE FROM print_jobs WHERE status IN ('PRINTED', 'FAILED')");
      return NextResponse.json({
        success: true,
        message: `Đã dọn dẹp ${res.rowCount} lệnh in đã hoàn thành / thất bại`,
      });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
