/**
 * Auth helpers - JWT (jose) + bcrypt
 * File: src/server/auth.ts
 */
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getDb } from '@/db';
import type { User, Quyen } from '@/db/schema';

const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 8);

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET missing or too short (>= 32 chars)');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string;             // user id
  username: string;
  quyen: Quyen;
  ho_ten: string;
}

export interface Session extends SessionPayload {
  exp: number;
  iat: number;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .setIssuer('edurecruit')
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: 'edurecruit'
    });
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

// ============================================================================
// Password helpers
// ============================================================================

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ============================================================================
// User lookup
// ============================================================================

export function findUserByUsername(username: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE username = ? AND trang_thai = ?')
    .get(username, 'HoatDong') as User | undefined;
  return row ?? null;
}

export function findUserById(id: number): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  return row ?? null;
}

export async function login(username: string, password: string): Promise<{ user: User; token: string } | null> {
  const user = findUserByUsername(username);
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;

  const db = getDb();
  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

  const token = await signSession({
    sub: String(user.id),
    username: user.username,
    quyen: user.quyen,
    ho_ten: user.ho_ten
  });
  return { user, token };
}

// ============================================================================
// Cookie helpers (cho Next.js Server Actions / Route Handlers)
// ============================================================================

export const SESSION_COOKIE = 'edurecruit_session';

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600
  };
}
