import { Hono } from 'hono';
import type { Config } from './config';
import { authRoutes, requireSession } from './auth';
import { proxyHandler } from './proxy';
import { sseBridge } from './sse';
import { registerStatic } from './static';
import { mockAdapter } from './mock/adapter';
import { MockStore } from './mock/store';
import { MockStream } from './mock/stream';

export function createApp(config: Config): Hono {
  const app = new Hono();

  app.route('/auth', authRoutes(config));
  app.use('/api/*', requireSession(config));

  if (config.mockMode) {
    const store = new MockStore();
    const stream = new MockStream();
    stream.startAmbient(store);
    app.route('/api', mockAdapter(store, stream));
  } else {
    app.get('/api/stream', sseBridge(config));
    app.all('/api/*', proxyHandler(config));
  }

  registerStatic(app, config);
  return app;
}
