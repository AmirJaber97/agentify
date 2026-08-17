import { createHmac, timingSafeEqual } from 'node:crypto';

// Stateless HMAC-signed session token: v1.<expiresEpochSeconds>.<sig>
// Revocation = rotate SESSION_SECRET.

export const COOKIE_NAME = 'paos_session';

function hmac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function signSession(secret: string, ttlSeconds: number, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + ttlSeconds;
  const payload = `v1.${expires}`;
  return `${payload}.${hmac(secret, payload)}`;
}

export function verifySession(secret: string, value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires)) return false;
  const expected = hmac(secret, `v1.${parts[1]}`);
  const given = parts[2] ?? '';
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  return expires * 1000 > now;
}

export function sessionCookieHeader(value: string, maxAge: number, secure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookieHeader(secure: boolean): string {
  return sessionCookieHeader('', 0, secure);
}

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return undefined;
}
