import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Config } from './config';
import {
  COOKIE_NAME,
  clearCookieHeader,
  readCookie,
  sessionCookieHeader,
  signSession,
  verifySession,
} from './cookie';

function passwordsMatch(given: string, expected: string): boolean {
  // Hash both sides so timingSafeEqual gets equal-length buffers.
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function hasValidSession(config: Config, cookieHeader: string | undefined): boolean {
  const value = readCookie(cookieHeader, COOKIE_NAME);
  return verifySession(config.sessionSecret, value);
}

export function requireSession(config: Config): MiddlewareHandler {
  return async (c, next) => {
    if (!hasValidSession(config, c.req.header('cookie'))) {
      return c.json({ detail: { error: 'unauthorized' } }, 401);
    }
    await next();
  };
}

export function authRoutes(config: Config): Hono {
  const app = new Hono();

  app.post('/login', async (c) => {
    let password = '';
    try {
      const body = await c.req.json<{ password?: string }>();
      password = typeof body.password === 'string' ? body.password : '';
    } catch {
      return c.json({ detail: { error: 'invalid_body' } }, 400);
    }
    if (!password || !passwordsMatch(password, config.dashboardPassword)) {
      await sleep(300);
      return c.json({ detail: { error: 'invalid_password' } }, 401);
    }
    const token = signSession(config.sessionSecret, config.sessionTtlSeconds);
    c.header('Set-Cookie', sessionCookieHeader(token, config.sessionTtlSeconds, config.cookieSecure));
    return c.json({ authenticated: true, mock: config.mockMode });
  });

  app.post('/logout', (c) => {
    c.header('Set-Cookie', clearCookieHeader(config.cookieSecure));
    return c.json({ authenticated: false });
  });

  app.get('/session', (c) => {
    if (!hasValidSession(config, c.req.header('cookie'))) {
      return c.json({ detail: { error: 'unauthorized' } }, 401);
    }
    return c.json({ authenticated: true, mock: config.mockMode });
  });

  return app;
}
