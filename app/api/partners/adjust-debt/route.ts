import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const client = await getClient();
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { partner_id, action, amount, payment_method, note } = await request.json();
    // action: 'thu_no' (customer pays us) or 'tra_no' (we pay supplier)
    const payAmount = parseFloat(amount);

    if (!partner_id || !payAmount || payAmount <= 0) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đối tác và số tiền hợp lệ' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Lock and get partner
    const partnerRes = await client.query(
      'SELECT id, name, phone, type, debt FROM partners WHERE id = $1 FOR UPDATE',
      [partner_id]
    );

    if (partnerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Không tìm thấy đối tác' }, { status: 404 });
    }

    const partner = partnerRes.rows[0];
    let newDebt = parseFloat(partner.debt);
    let cashFlowType: 'thu' | 'chi' = 'thu';
    let category: 'thu_no' | 'tra_no' = 'thu_no';
    let codePrefix = 'PT-TN';

    if (action === 'thu_no') {
      // Customer pays their debt: debt decreases
      newDebt -= payAmount;
      cashFlowType = 'thu';
      category = 'thu_no';
      codePrefix = 'PT-TN';
    } else if (action === 'tra_no') {
      // We pay supplier debt: supplier debt (negative) becomes closer to 0 (increases)
      newDebt += payAmount;
      cashFlowType = 'chi';
      category = 'tra_no';
      codePrefix = 'PC-TN';
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
    }

    // Update partner debt
    await client.query('UPDATE partners SET debt = $1 WHERE id = $2', [newDebt, partner_id]);

    // Generate unique cash flow code
    const code = `${codePrefix}-${Date.now().toString().slice(-6)}`;

    // Create cash flow entry
    const cfRes = await client.query(
      `INSERT INTO cash_flow (code, type, amount, payment_method, category, partner_id, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code,
        cashFlowType,
        payAmount,
        payment_method || 'cash',
        category,
        partner_id,
        note || `${action === 'thu_no' ? 'Thu nợ' : 'Trả nợ'} ${partner.name}`,
        user.id,
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      new_debt: newDebt,
      cash_flow: cfRes.rows[0],
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Adjust debt error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
