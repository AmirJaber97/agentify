import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
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

function deployTriggerPath(): string {
  return `${process.cwd()}/.git/webhook-deploy.trigger`;
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

    // Do not run the deploy as a child of agentify.service: that service is
    // sandboxed with NoNewPrivileges=true, so sudo/systemctl restart is blocked
    // and any child can be killed when the BFF restarts. Instead, write a tiny
    // trigger file watched by a root-owned systemd .path unit. The deploy then
    // runs out-of-band and can restart this service after rebuilding.
    writeFileSync(
      deployTriggerPath(),
      `${JSON.stringify({ delivery, after: payload.after ?? '', ref: payload.ref, requested_at: new Date().toISOString() })}\n`,
      'utf8',
    );

    console.log(`[agentify] GitHub push webhook accepted delivery=${delivery || 'unknown'} after=${payload.after ?? 'unknown'}; deploy trigger written`);
    return c.json({ ok: true, accepted: true, triggered: true, event, delivery, ref: payload.ref, after: payload.after });
  };
}
