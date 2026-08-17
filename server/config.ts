import { readFileSync } from 'node:fs';

export interface Config {
  port: number;
  paosBaseUrl: string;
  paosToken: string;
  dashboardPassword: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  cookieSecure: boolean;
  mockMode: boolean;
  distDir: string;
}

function fail(msg: string): never {
  console.error(`[agentify] configuration error: ${msg}`);
  process.exit(1);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mockMode = env.MOCK_MODE === '1' || env.MOCK_MODE === 'true';
  const production = env.NODE_ENV === 'production';

  if (mockMode && production) {
    fail('MOCK_MODE=1 is not allowed with NODE_ENV=production. Mock data must never run in production.');
  }

  let paosToken = '';
  if (!mockMode) {
    if (env.PAOS_TOKEN && env.PAOS_TOKEN.trim()) {
      paosToken = env.PAOS_TOKEN.trim();
    } else if (env.PAOS_TOKEN_FILE) {
      try {
        // Token files typically end with a newline — trim is load-bearing.
        paosToken = readFileSync(env.PAOS_TOKEN_FILE, 'utf8').trim();
      } catch (e) {
        fail(`cannot read PAOS_TOKEN_FILE (${env.PAOS_TOKEN_FILE}): ${(e as Error).message}`);
      }
      if (!paosToken) fail(`PAOS_TOKEN_FILE (${env.PAOS_TOKEN_FILE}) is empty`);
    } else {
      fail('set PAOS_TOKEN or PAOS_TOKEN_FILE (or MOCK_MODE=1 for development)');
    }
  }

  let dashboardPassword = env.DASHBOARD_PASSWORD ?? '';
  if (!dashboardPassword) {
    if (mockMode) {
      dashboardPassword = 'dev';
      console.warn('[agentify] MOCK_MODE: DASHBOARD_PASSWORD defaults to "dev"');
    } else {
      fail('DASHBOARD_PASSWORD is required');
    }
  }

  let sessionSecret = env.SESSION_SECRET ?? '';
  if (!sessionSecret) {
    if (mockMode) {
      sessionSecret = 'mock-session-secret-not-for-production-use';
    } else {
      fail('SESSION_SECRET is required (generate with: openssl rand -hex 32)');
    }
  } else if (sessionSecret.length < 32 && !mockMode) {
    fail('SESSION_SECRET must be at least 32 characters');
  }

  const ttlHours = Number(env.SESSION_TTL_HOURS ?? 168);
  if (!Number.isFinite(ttlHours) || ttlHours <= 0) fail('SESSION_TTL_HOURS must be a positive number');

  return {
    port: Number(env.BFF_PORT ?? 8787),
    paosBaseUrl: (env.PAOS_BASE_URL ?? 'http://127.0.0.1:8765').replace(/\/+$/, ''),
    paosToken,
    dashboardPassword,
    sessionSecret,
    sessionTtlSeconds: Math.round(ttlHours * 3600),
    cookieSecure: env.COOKIE_SECURE === '1' || env.COOKIE_SECURE === 'true',
    mockMode,
    distDir: env.DIST_DIR ?? 'dist',
  };
}
