# Agentify

Command-center dashboard for **Personal Agent OS** (PAOS, the Hermes control plane).
A dark, live, structured-state-first UI for your life/work agents: roster, attention rail,
agent detail with conversational input, natural-language agent creation, projects,
tasks, activity and model routing — all in real time over SSE.

```
Browser ──(relative /api/*, /auth/*, session cookie)──▶ Agentify BFF (127.0.0.1:8787)
                                                          │  serves built SPA
                                                          │  injects PAOS bearer token
                                                          ▼
                                              PAOS API (127.0.0.1:8765/api/v1)
```

## Architecture

- **SPA**: React 18 + TypeScript + Vite (`src/`). No component libraries, no animation
  libraries — design tokens + CSS. TanStack Query is the data layer; the SSE stream
  drives cache invalidation via the `refresh` hints PAOS puts in every event frame.
- **BFF**: a small Hono server (`server/`) that is the only thing the browser talks to.
  It serves the built SPA, proxies `/api/*` → `http://127.0.0.1:8765/api/v1/*` with the
  PAOS bearer token injected server-side, and bridges `/api/stream` (SSE) with
  frame-aware piping and heartbeats.
- **Shared** (`shared/`): API types generated from `openapi.json`
  (`npm run gen:types` → `shared/api-types.ts`), hand-written union guards for
  `MessageResponse`, and the mock fixtures used by both the mock BFF and the tests.

### Security model

- The PAOS bearer token exists **only** in the BFF process (`PAOS_TOKEN_FILE` /
  `PAOS_TOKEN`). It never appears in the bundle, browser storage, or client code.
  No `VITE_`-prefixed secret exists anywhere.
- The browser authenticates to the BFF with a password login that sets an
  **HMAC-signed, HttpOnly, SameSite=Lax session cookie** (`node:crypto`, stateless,
  revoke by rotating `SESSION_SECRET`).
- The proxy strips the dashboard cookie from upstream requests and strips upstream
  `Set-Cookie` from responses.
- The BFF binds to `127.0.0.1` only (hardcoded). PAOS port 8765 is never exposed.

## Install

```bash
npm ci
npm run gen:types   # regenerate shared/api-types.ts from openapi.json (checked in)
```

Requires Node 20+.

## Development

Two modes:

```bash
# 1) Mock mode — no PAOS needed. Realistic fixtures + scripted SSE events.
npm run dev:mock
# → http://localhost:5173, password "dev". Amber MOCK badge is always visible.

# 2) Real backend over SSH port-forward (PAOS stays localhost-only on the server):
ssh -N -L 8765:127.0.0.1:8765 your-server &
scp your-server:~/.hermes/personal_agent_os/.api_token /tmp/paos.token
PAOS_TOKEN_FILE=/tmp/paos.token DASHBOARD_PASSWORD=dev \
  SESSION_SECRET=$(openssl rand -hex 32) npm run dev
```

The Vite dev server proxies `/api` and `/auth` to the BFF on `127.0.0.1:8787`.
Mock mode **refuses to start** when `NODE_ENV=production`.

## Production build & run

```bash
npm run build    # vite build → dist/, esbuild bundle → server-dist/index.js
npm start        # node server-dist/index.js (binds 127.0.0.1:$BFF_PORT)
```

## Configuration (environment)

| Variable | Meaning |
|---|---|
| `BFF_PORT` | BFF listen port (default `8787`; host is always `127.0.0.1`) |
| `PAOS_BASE_URL` | PAOS origin, default `http://127.0.0.1:8765` |
| `PAOS_TOKEN_FILE` | Path to the PAOS token file (preferred; trimmed on read) |
| `PAOS_TOKEN` | Token literal (alternative to the file) |
| `DASHBOARD_PASSWORD` | Login password (required; defaults to `dev` only in mock mode) |
| `SESSION_SECRET` | ≥32 chars, `openssl rand -hex 32` |
| `SESSION_TTL_HOURS` | Session lifetime, default 168 |
| `COOKIE_SECURE` | Set `1` in production behind HTTPS |
| `MOCK_MODE` | `1` = serve fixtures instead of proxying (dev only) |

See `.env.example`. `server/config.ts` fails fast with a readable error on any
missing/short secret.

## Deploying on the PAOS host

systemd unit (`/etc/systemd/system/agentify.service`):

```ini
[Unit]
Description=Agentify PAOS dashboard (BFF + SPA)
After=network.target personal-agent-os.service
Wants=personal-agent-os.service

[Service]
User=ajhosts
WorkingDirectory=/home/ajhosts/agentify
EnvironmentFile=/etc/agentify/agentify.env
ExecStart=/usr/bin/node server-dist/index.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Put the env vars in `/etc/agentify/agentify.env` (mode `0640`), with
`PAOS_TOKEN_FILE=/home/ajhosts/.hermes/personal_agent_os/.api_token`,
`COOKIE_SECURE=1` and `NODE_ENV=production`.

nginx location block on your existing HTTPS vhost:

```nginx
location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_read_timeout 600s;          # synchronous agent runs take minutes
}
location /api/stream {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_buffering off;              # SSE
    proxy_read_timeout 3600s;
}
```

Deploy: `git pull && npm ci && npm run gen:types && npm run build && sudo systemctl restart agentify`.

## Realtime behavior

- The browser opens `EventSource('/api/stream')`; the session cookie rides along
  (that is why cookie auth was chosen — EventSource cannot set headers).
- Every PAOS frame carries `refresh: [...]` hints (`agents`, `agent:<id>`, `tasks`,
  `activity`, `dashboard`, …) which map to TanStack Query invalidations
  (`src/api/queryKeys.ts`).
- The BFF pipes upstream frames **whole** (LF and CRLF delimiters) and injects an
  `event: hb` heartbeat every 25s between frames.
- The client has a staleness watchdog: no event/heartbeat for 65s → tear down and
  reconnect (catches proxies that hold sockets open after the upstream dies).
- Reconnects use exponential backoff (1s → 30s, jittered). PAOS v1 ignores
  `Last-Event-ID`, so every reconnect blanket-refetches all queries.
- Connection state is always visible in the top bar: green `live`, amber
  `reconnecting`, red `stream down — data may be stale`. Browser offline events show
  the same red state.

## Project structure

```
openapi.json, API_CONTRACT.md   authoritative PAOS contract (source of generated types)
shared/    api-types.ts (generated), types.ts, message-response.ts (union guards), fixtures/
server/    config, cookie (HMAC session), auth, proxy, sse (bridge), static, mock/
src/
  app/       App, router, AppShell (topbar/nav/command bar mount), queryClient
  api/       client (error normalization), queries, mutations, queryKeys, sse (StreamClient)
  auth/      session store, LoginPage
  components/ ui primitives, status badges, Dialog, Timeline, JsonTree, Toast, RelativeTime
  features/  overview, agent-detail, create-agent, command-bar, projects, tasks,
             activity, models, settings, agent-layouts/{media,health,apartment}
  lib/       format, guards (defensive accessors for schemaless state)
src/test/  msw handlers (built from shared/fixtures), FakeEventSource, render helper
```

## Major design decisions

- **BFF over Next.js**: one small Hono process, no framework runtime, trivial SSE
  piping, single deploy artifact (`server-dist/index.js`, bundled with esbuild).
- **Generated types + thin guards instead of zod**: `openapi.json` is the source of
  truth; the only genuinely dynamic surfaces (`structured_data`, the
  `MessageResponse` union) get hand-written guards. Note `intent` is *not* a
  sufficient discriminator: `DryRunExecutionResponse` also uses
  `intent: "agent_execution"` — narrowing is structural (`'task_id' in r`).
- **Chat is an input method**: every page renders structured state first;
  conversation (agent composer, ⌘K command bar) is for updating/querying/delegating.
- **Long synchronous runs**: `/message`, `/run`, `/derive` use a 300s browser timeout,
  600s undici timeouts in the BFF, and prominent in-flight UI. Mutations never
  auto-retry — a client timeout does not mean the server-side run failed.
- **Agent-specific layouts degrade**: media/health/apartment layouts parse
  `structured_data` defensively and fall back to a generic JSON view on any shape
  miss. New agents get the generic view automatically.
- **DELETE is "Archive"** everywhere in the UI (the API never hard-deletes), and
  `requires_confirmation` responses render as a banner — the dashboard never
  fabricates a confirm endpoint that v1 does not have.

## Mock mode

`MOCK_MODE=1` swaps the proxy for an in-memory adapter seeded from
`shared/fixtures/` (health, media, apartment, projects + coffee, finance;
tasks, activity, 3 project aliases with history, 4 models). Mutations really mutate
the store and emit SSE frames with correct `refresh` hints; `/run` takes 3–8s so
in-flight UI is honest; ambient events fire every ~20s. The UI shows a permanent
amber **MOCK** badge, `GET /auth/session` reports `mock: true`, and startup aborts
if `NODE_ENV=production`.

## Tests

`npm test` — 46 tests across 10 files (Vitest; node env for `server/**`, jsdom +
Testing Library + MSW for `src/**`; MSW handlers share the mock fixtures):

- session cookie sign/verify/tamper/expiry; proxy bearer injection, cookie
  stripping, query-string preservation, 502 mapping; SSE frame splitting (LF/CRLF)
- client error normalization (both FastAPI 422 shapes, app-error codes, network,
  timeout, 401 → session store)
- StreamClient: refresh-hint → exact invalidation, malformed frames, backoff +
  blanket refetch on reopen, heartbeat watchdog (dead vs quiet), 401 probe stop
- Overview rendering, error + retry, status-change refetch; MessageResponse union
  rendering incl. dry-run disambiguation and confirmation banner; create-agent
  derive/edit/create + permissions approval gate; projects grouping/ordering; auth
  flows

Manually verified in the browser (mock mode): login, overview live-updating from
ambient SSE, ⌘K command → media fast-path → SSE-driven state refresh, agent detail
(message/run/edit/archive), create-agent end-to-end, projects/tasks/activity/models,
BFF kill → red stale indicator → restart → recovery, mobile layout (bottom nav),
production server (`npm start`) serving SPA + deep links + SSE.

## Known limitations

- PAOS v1 has no pagination/filter params — task/activity filters are client-side
  over the newest-first window the API returns (the UI says "latest N" honestly).
- Runs are synchronous in v1 (`async_run: true` is rejected); very long runs hold an
  HTTP request open. The UI keeps working (SSE task events update independently).
- No `Last-Event-ID` resume in v1 — reconnects refetch everything (cheap at this scale).
- `requires_confirmation` has no confirm endpoint in v1; the UI surfaces the banner
  and directs you to reply to the agent.
- Single-user by design: one password, one session audience, matching PAOS's
  single-tenant model.
