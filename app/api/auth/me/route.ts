import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = getUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Fetch fresh user data
    const result = await query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [authUser.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
