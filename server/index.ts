import { serve } from '@hono/node-server';
import { loadConfig } from './config';
import { createApp } from './app';

const config = loadConfig();
const app = createApp(config);

// Deployment invariant: the BFF is only ever reachable via the reverse proxy
// (production) or the Vite dev proxy (development). Never bind non-loopback.
serve({ fetch: app.fetch, port: config.port, hostname: '127.0.0.1' }, (info) => {
  console.log(
    `[agentify] listening on http://127.0.0.1:${info.port}` +
      (config.mockMode ? ' — MOCK MODE (fixture data, no PAOS connection)' : ` → ${config.paosBaseUrl}`),
  );
});
