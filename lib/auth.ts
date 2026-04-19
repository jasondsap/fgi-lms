// =============================================================================
// Admin JWT auth — sign / verify tokens for the admin CMS
// =============================================================================
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const ALG = 'HS256';

export interface AdminTokenPayload {
  sub: string;   // admin_users.id
  email: string;
  role: 'admin' | 'editor';
}

export async function signAdminToken(payload: AdminTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyAdminToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as AdminTokenPayload;
}

/**
 * Extract and verify admin token from a request's Authorization header.
 * Throws if missing or invalid — catch in route handlers.
 */
export async function requireAdmin(request: Request): Promise<AdminTokenPayload> {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) throw new Error('Unauthorized');
  return verifyAdminToken(token);
}
