import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { sqlite } from './store.ts';

export const ADMIN_COOKIE_NAME = 'sakura_admin_session';
export const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes of inactivity

// Salted scrypt digest of the administrator password (never stored in plaintext).
const DEFAULT_ADMIN_SCRYPT_DIGEST =
  'cbfca3a7f5623b289558072a4259034a:f23ada2a081fe81dbbe995a6cc9d1950230a57c4ccd04be96050504cd936ade2be67f61340f2a6647c4d863ba81b866d7d2f1ad6dff518e2d39d15d5c4b073fe';

const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const failedAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAdminPassword(candidate: string): boolean {
  if (typeof candidate !== 'string' || !candidate) return false;

  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  if (envPassword) {
    const a = crypto.createHash('sha256').update(candidate).digest();
    const b = crypto.createHash('sha256').update(envPassword).digest();
    return crypto.timingSafeEqual(a, b);
  }

  const [salt, expectedHex] = DEFAULT_ADMIN_SCRYPT_DIGEST.split(':');
  if (!salt || !expectedHex) return false;

  const derived = crypto.scryptSync(candidate, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = failedAttemptsByIp.get(ip);
  if (!entry) return { allowed: true };

  if (now > entry.resetAt) {
    failedAttemptsByIp.delete(ip);
    return { allowed: true };
  }

  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const existing = failedAttemptsByIp.get(ip);
  if (!existing || now > existing.resetAt) {
    failedAttemptsByIp.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    existing.count += 1;
  }
}

export function clearFailedLogins(ip: string): void {
  failedAttemptsByIp.delete(ip);
}

export function createAdminSession(): { token: string; expiresAt: number } {
  const now = Date.now();
  sqlite.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(now);

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = now + INACTIVITY_TIMEOUT_MS;

  sqlite
    .prepare(
      'INSERT INTO admin_sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)'
    )
    .run(tokenHash, expiresAt, now);

  return { token, expiresAt };
}

export function validateAndTouchSession(
  token: string,
  touch = true
): { valid: boolean; expiresAt?: number } {
  if (!token) return { valid: false };

  const now = Date.now();
  const tokenHash = hashToken(token);
  const row = sqlite
    .prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ?')
    .get(tokenHash) as unknown as { expires_at: number } | undefined;

  if (!row) return { valid: false };

  if (row.expires_at <= now) {
    sqlite.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
    return { valid: false };
  }

  if (!touch) {
    return { valid: true, expiresAt: row.expires_at };
  }

  const nextExpiry = now + INACTIVITY_TIMEOUT_MS;
  sqlite
    .prepare('UPDATE admin_sessions SET expires_at = ? WHERE token_hash = ?')
    .run(nextExpiry, tokenHash);

  return { valid: true, expiresAt: nextExpiry };
}

export function revokeAdminSession(token: string): void {
  if (!token) return;
  const tokenHash = hashToken(token);
  sqlite.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
}

function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  return parseCookieHeader(req.headers.cookie, ADMIN_COOKIE_NAME);
}

export function setSessionCookie(res: Response, req: Request, token: string): void {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const flags = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${Math.floor(INACTIVITY_TIMEOUT_MS / 1000)}`,
    isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', flags.join('; '));
}

export function clearSessionCookie(res: Response, req: Request): void {
  const isHttps =
    req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const flags = [
    `${ADMIN_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', flags.join('; '));
}

export interface AdminRequest extends Request {
  adminToken?: string;
  adminExpiresAt?: number;
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({
      error: 'Требуется авторизация администратора',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const check = validateAndTouchSession(token, true);
  if (!check.valid) {
    clearSessionCookie(res, req);
    res.status(401).json({
      error: 'Сессия администратора истекла или недействительна',
      code: 'SESSION_EXPIRED',
    });
    return;
  }

  req.adminToken = token;
  req.adminExpiresAt = check.expiresAt;
  next();
}
