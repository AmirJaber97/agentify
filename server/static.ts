import type { Hono } from 'hono';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import type { Config } from './config';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

/** Serve the built SPA with a fallback to index.html for client routes. */
export function registerStatic(app: Hono, config: Config): void {
  app.get('*', (c) => {
    const reqPath = normalize(c.req.path).replace(/^(\.\.[/\\])+/, '');
    if (reqPath.includes('..')) return c.text('Bad request', 400);

    const filePath = join(config.distDir, reqPath === '/' ? 'index.html' : reqPath);
    const indexPath = join(config.distDir, 'index.html');

    if (!existsSync(indexPath)) {
      return c.text('Frontend not built. Run `npm run build` (or use `npm run dev`).', 503);
    }

    const target = existsSync(filePath) && extname(filePath) ? filePath : indexPath;
    const ext = extname(target);
    const isIndex = target === indexPath;
    const body = readFileSync(target);
    return new Response(body, {
      headers: {
        'content-type': MIME[ext] ?? 'application/octet-stream',
        // Vite emits content-hashed asset names, safe to cache hard.
        'cache-control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
      },
    });
  });
}
