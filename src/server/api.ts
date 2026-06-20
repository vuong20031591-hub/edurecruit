/**
 * Common API helpers
 * File: src/server/api.ts
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession, type Session } from './auth';
import { hasPermission, type Permission, ForbiddenError } from './permissions';
import { audit, type AuditAction } from './audit';

export interface AuthedRequest {
  session: Session;
  request: NextRequest;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export async function requireAuth(req: NextRequest): Promise<Session> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new UnauthorizedError('Not logged in');
  const session = await verifySession(token);
  if (!session) throw new UnauthorizedError('Invalid session');
  return session;
}

export async function requirePerm(req: NextRequest, perm: Permission): Promise<Session> {
  const session = await requireAuth(req);
  if (!hasPermission(session.quyen, perm)) {
    throw new ForbiddenError(`Missing permission: ${perm}`);
  }
  return session;
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, error?: unknown): NextResponse {
  if (error) console.error(`[API ${status}] ${message}:`, error);
  return NextResponse.json({ error: message, status }, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) return fail(401, err.message);
  if (err instanceof ForbiddenError)    return fail(403, err.message);
  if (err instanceof ValidationError)   return fail(400, err.message);
  if (err instanceof NotFoundError)     return fail(404, err.message);
  if (err instanceof ConflictError)     return fail(409, err.message);
  return fail(500, 'Internal server error', err);
}

export class UnauthorizedError extends Error { status = 401; constructor(m = 'Unauthorized') { super(m); this.name = 'UnauthorizedError'; } }
export class ValidationError   extends Error { status = 400; constructor(m = 'Validation failed') { super(m); this.name = 'ValidationError'; } }
export class NotFoundError     extends Error { status = 404; constructor(m = 'Not found') { super(m); this.name = 'NotFoundError'; } }
export class ConflictError     extends Error { status = 409; constructor(m = 'Conflict') { super(m); this.name = 'ConflictError'; } }

export async function withAudit<T>(
  action: AuditAction,
  fn: () => Promise<T>,
  meta?: { resourceType?: string; resourceId?: number; userId?: number; username?: string; ip?: string }
): Promise<T> {
  try {
    const result = await fn();
    audit({ ...meta, action, result: 'SUCCESS' });
    return result;
  } catch (err) {
    audit({ ...meta, action, result: 'FAILURE', errorMessage: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
