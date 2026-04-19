// POST /api/admin/auth — admin login
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { signAdminToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, email, password_hash, role FROM admin_users WHERE email = ${email} LIMIT 1
    `;
    const user = rows[0] as any;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last_login_at
    await sql`UPDATE admin_users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const token = await signAdminToken({ sub: user.id, email: user.email, role: user.role });
    return NextResponse.json({ token, role: user.role });
  } catch (err) {
    console.error('[POST /api/admin/auth]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
