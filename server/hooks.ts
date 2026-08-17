import { spawn } from 'node:child_process';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { Handler } from 'hono';
import type { Config } from './config';

function verifyGitHubSignature(secret: string, body: string, signature: string | undefined): boolean {
  if (!signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function deployScriptPath(): string {
  return `${process.cwd()}/scripts/deploy-from-webhook.sh`;
}

export function githubWebhookHandler(config: Config): Handler {
  return async (c) => {
    if (!config.githubWebhookSecret) {
      return c.json({ detail: { error: 'webhook_not_configured' } }, 404);
    }

    const event = c.req.header('x-github-event') ?? '';
    const delivery = c.req.header('x-github-delivery') ?? '';
    const signature = c.req.header('x-hub-signature-256');
    const body = await c.req.text();

    if (!verifyGitHubSignature(config.githubWebhookSecret, body, signature)) {
      console.warn(`[agentify] GitHub webhook rejected: invalid signature delivery=${delivery || 'unknown'}`);
      return c.json({ detail: { error: 'invalid_signature' } }, 401);
    }

    if (event === 'ping') {
      return c.json({ ok: true, event, delivery });
    }

    if (event !== 'push') {
      return c.json({ ok: true, ignored: true, reason: 'unsupported_event', event, delivery });
    }

    let payload: { ref?: string; after?: string };
    try {
      payload = JSON.parse(body) as { ref?: string; after?: string };
    } catch {
      return c.json({ detail: { error: 'invalid_json' } }, 400);
    }

    if (payload.ref !== 'refs/heads/main') {
      return c.json({ ok: true, ignored: true, reason: 'non_main_ref', ref: payload.ref, delivery });
    }

    const script = deployScriptPath();
    if (!existsSync(script)) {
      console.error(`[agentify] webhook deploy script missing: ${script}`);
      return c.json({ detail: { error: 'deploy_script_missing' } }, 500);
    }

    const child = spawn(script, [], {
      cwd: process.cwd(),
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        GITHUB_DELIVERY_ID: delivery,
        GITHUB_AFTER_SHA: payload.after ?? '',
      },
    });
    child.unref();

    console.log(`[agentify] GitHub push webhook accepted delivery=${delivery || 'unknown'} after=${payload.after ?? 'unknown'}`);
    return c.json({ ok: true, accepted: true, event, delivery, ref: payload.ref, after: payload.after });
  };
}
