# Personal Agent OS API Contract

Base URL: `http://127.0.0.1:8765/api/v1`.

PAOS is localhost-only. Intended dashboard production path:

```text
Browser → HTTPS dashboard server/BFF → localhost PAOS API
```

The PAOS bearer token is a **server secret**. Never embed it in browser JavaScript or frontend bundles.

OpenAPI source of truth:

```text
/home/ajhosts/personal-agent-os/openapi.json
```

## Authentication

Every `/api/v1/*` endpoint requires one of the OpenAPI security schemes:

- `BearerAuth`: HTTP bearer token in `Authorization: Bearer <token>`
- `CookieAuth`: API-key cookie named `paos_token`

Token file:

```text
~/.hermes/personal_agent_os/.api_token
```

## Common conventions

- Timestamps: UTC ISO strings, e.g. `2026-08-17T15:36:33Z`.
- JSON fields are returned as objects/arrays, not encoded JSON strings.
- Pagination v1: fixed newest-first limits only; no cursor params yet.
- Errors:
  - validation: FastAPI `422` response
  - app errors: `{"detail":{"error":"code"}}`
- `DELETE /agents/{id}` archives/disables only; no hard delete.
- `PATCH /agents/{id}` is partial. Omitted fields remain unchanged. Unknown fields are rejected. `enabled:false` sets status `DISABLED`; `enabled:true` changes a disabled agent to `IDLE`.

## Enums

### AgentStatus

```text
IDLE | WORKING | WAITING | BLOCKED | ERROR | DISABLED
```

### TaskStatus

```text
QUEUED | RUNNING | WAITING_FOR_USER | SUCCEEDED | FAILED | CANCELLED | OPEN | COMPLETED
```

`OPEN` and `COMPLETED` remain for older/manual task records. Runtime execution uses `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, or `WAITING_FOR_USER`.

### PrivacyClass

```text
PUBLIC_OR_GENERAL | PERSONAL | PRIVATE | WORK_RESTRICTED
```

### ModelPolicy

```text
LOCAL_ONLY | CHEAP_FAST | BALANCED | DEEP_REASONING | CODING | CUSTOM
```

### Project summary enums

```text
project_type: work | personal
status: active | blocked | paused | completed
progress_signal: moved_forward | neutral | blocked
```

## Schemas

The generated OpenAPI contains explicit schemas for all endpoint responses. Key schemas:

### SystemStatus

```json
{
  "status": "ok",
  "service": "personal-agent-os",
  "db": "/home/ajhosts/.hermes/personal_agent_os/agent_os.db",
  "agents_by_status": {"IDLE": 4},
  "time": "2026-08-17T15:36:33Z"
}
```

### Agent

```json
{
  "id": "media",
  "name": "Media",
  "description": "...",
  "icon": "🎬",
  "category": "life",
  "enabled": true,
  "status": "IDLE",
  "system_instructions": "...",
  "privacy_class": "PERSONAL",
  "model_policy": "CHEAP_FAST",
  "allowed_tools": [],
  "memory_namespace": "agent:media",
  "triggers": [],
  "schedules": [],
  "permissions": {},
  "ui_metadata": {},
  "state_schema": {},
  "created_at": "...Z",
  "updated_at": "...Z",
  "last_activity_at": null
}
```

Nullable: `last_activity_at`.

### AgentCard

```json
{
  "id": "media",
  "name": "Media",
  "icon": "🎬",
  "short_purpose": "...",
  "category": "life",
  "enabled": true,
  "status": "IDLE",
  "privacy_class": "PERSONAL",
  "model_policy": "CHEAP_FAST",
  "last_activity_at": null,
  "current_focus": "",
  "outstanding_tasks": 0,
  "warning": null,
  "metrics": {},
  "ui_metadata": {}
}
```

### AgentState

```json
{
  "agent_id": "media",
  "stable_facts": {},
  "current_state": {},
  "structured_data": {},
  "updated_at": "...Z"
}
```

### Task / Run

```json
{
  "id": "uuid",
  "agent_id": "media",
  "title": "short title",
  "description": "full task",
  "status": "SUCCEEDED",
  "priority": 3,
  "due_at": null,
  "created_at": "...Z",
  "updated_at": "...Z",
  "completed_at": "...Z"
}
```

Nullable: `due_at`, `completed_at`.

### Activity

```json
{
  "id": 1,
  "agent_id": "media",
  "message": "Media updated...",
  "level": "info",
  "metadata": {"event_type": "media.paused"},
  "created_at": "...Z"
}
```

Nullable: `agent_id`.

### Event

```json
{
  "id": 1,
  "agent_id": "media",
  "type": "media.paused",
  "summary": "Media updated...",
  "payload": {},
  "privacy_class": "PERSONAL",
  "created_at": "...Z"
}
```

Nullable: `agent_id`.

### ModelInfo

```json
{
  "id": "local-qwen",
  "provider": "custom",
  "model": "qwen3:8b",
  "base_url": "http://localhost:11434/v1",
  "capabilities": ["local", "classification", "summarization"],
  "privacy_allowed": ["PUBLIC_OR_GENERAL", "PERSONAL", "PRIVATE", "WORK_RESTRICTED"],
  "cost_class": "local",
  "latency_class": "fast",
  "enabled": true,
  "priority": 1,
  "metadata": {}
}
```

Nullable: `base_url`.

### AgentCreateRequest

Request body for `POST /agents` and base schema for `/agents/derive` response:

```json
{
  "id": "coffee",
  "name": "Coffee",
  "description": "Track cafés.",
  "icon": "☕",
  "category": "life",
  "enabled": true,
  "system_instructions": "...",
  "privacy_class": "PERSONAL",
  "model_policy": "BALANCED",
  "allowed_tools": [],
  "memory_namespace": "agent:coffee",
  "triggers": [],
  "schedules": [],
  "permissions": {},
  "ui_metadata": {},
  "state_schema": {}
}
```

Required: `name`. Other fields have defaults or may be null where OpenAPI marks nullable.

### AgentUpdateRequest

Partial body for `PATCH /agents/{id}`. Allowed fields:

```text
name, description, icon, category, enabled, status, system_instructions,
privacy_class, model_policy, allowed_tools, triggers, schedules,
permissions, ui_metadata, state_schema
```

All are optional. Unknown fields rejected.

### MessageRequest

```json
{
  "message": "Ask Media what episode I am on.",
  "dry_run": false,
  "require_model": false
}
```

### RunIn

```json
{
  "task": "Summarize current state.",
  "task_category": "general",
  "require_model": true,
  "async_run": false
}
```

`async_run` remains in the v1 schema for compatibility but `true` is explicitly rejected with `422`. Background async execution is not in v1.

### MessageResponse

Union of:

- `ListAgentsMessageResponse`
- `CreateAgentMessageResponse`
- `UnroutedMessageResponse`
- `MediaUpdateResponse`
- `AgentExecutionResponse`
- `DryRunExecutionResponse`

Deterministic media fast-path:

```json
{
  "intent": "media_update",
  "execution": "deterministic_fast_path",
  "response": "Updated Media: Severance is paused"
}
```

Runtime execution:

```json
{
  "intent": "agent_execution",
  "task_id": "uuid",
  "status": "SUCCEEDED",
  "reply": "...",
  "structured_result": {
    "reply": "...",
    "state_updates": [],
    "facts_to_add": [],
    "facts_to_remove": [],
    "tasks_to_create": [],
    "tasks_to_update": [],
    "events": [],
    "requires_confirmation": false
  },
  "model_selected": {"id": "local-qwen"},
  "policy": "CHEAP_FAST",
  "routing_reason": "cheap_fast",
  "duration_ms": 1234,
  "success": true,
  "error": null
}
```

### DerivedAgentManifest

Exact response schema for `POST /agents/derive`: `DerivedAgentManifest`, which extends `AgentCreateRequest` and returns a proposed agent manifest, including:

```text
id, name, description, icon, category, enabled, system_instructions,
privacy_class, model_policy, allowed_tools, memory_namespace, triggers,
schedules, permissions, ui_metadata, state_schema
```

Dashboard flow:

```text
natural-language description → POST /agents/derive → user accepts/edits → POST /agents
```

Powerful permissions must still require explicit user approval before creation.

### ProjectSummary / ProjectSummaryIn

Request body for `POST /project-summaries` and response rows from `GET /project-summaries`:

```json
{
  "project_alias": "Cortex",
  "generated_at": "2026-08-17T12:00:00Z",
  "project_type": "work",
  "status": "blocked",
  "progress_signal": "blocked",
  "session_summary": "Sanitized summary only.",
  "accomplishments": ["..."],
  "blockers": ["..."],
  "next_actions": ["..."],
  "decisions": ["..."],
  "attention_next_session": "...",
  "needs_followup": true,
  "tags": ["work"],
  "privacy_class": "WORK_RESTRICTED"
}
```

For `GET` rows, additional nullable fields may be present: `id`, `raw`, `created_at`.

Unknown fields are rejected. List item count and field sizes are bounded by OpenAPI/Pydantic constraints. `privacy_class` must be `WORK_RESTRICTED`.

### DashboardOverview

```json
{
  "system": {"status": "ok", "time": "...Z"},
  "agents": [],
  "running_tasks": [],
  "queued_tasks": [],
  "warnings": [],
  "projects_needing_attention": [],
  "recent_activity": [],
  "models": []
}
```

## Endpoints

All endpoints below require `BearerAuth` or `CookieAuth`.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/system/status` | — | `SystemStatus` |
| GET | `/agents` | — | `AgentCard[]` |
| POST | `/agents` | `AgentCreateRequest` | `Agent` |
| POST | `/agents/derive` | `MessageRequest` | `DerivedAgentManifest` |
| GET | `/agents/{id}` | — | `Agent` |
| PATCH | `/agents/{id}` | `AgentUpdateRequest` | `Agent` |
| DELETE | `/agents/{id}` | — | `ArchiveResponse` |
| POST | `/message` | `MessageRequest` | `MessageResponse` |
| POST | `/agents/{id}/message` | `MessageRequest` | `MessageResponse` |
| POST | `/agents/{id}/run` | `RunIn` | `AgentExecutionResponse` |
| GET | `/agents/{id}/state` | — | `AgentState` |
| GET | `/agents/{id}/tasks` | — | `Task[]` |
| GET | `/agents/{id}/activity` | — | `Activity[]` |
| GET | `/tasks` | — | `Task[]` |
| GET | `/activity` | — | `Activity[]` |
| GET | `/events` | — | `Event[]` |
| GET | `/models` | — | `ModelInfo[]` |
| GET | `/dashboard/overview` | — | `DashboardOverview` |
| POST | `/project-summaries` | `ProjectSummaryIn` | `ProjectSummaryIngestResponse` |
| GET | `/project-summaries?project_alias=Alias` | — | `ProjectSummary[]` |
| GET | `/stream` | — | `text/event-stream` |

## Runtime execution semantics

- `POST /message`: generic router; create/list handled directly; simple Media updates use deterministic fast-path; non-trivial routed messages invoke Hermes on demand.
- `POST /agents/{id}/message`: direct agent message; same fast-path/runtime behavior.
- `POST /agents/{id}/run`: creates lifecycle records and invokes Hermes synchronously in v1.

Execution path:

```text
request → identify agent → compact context packet → select model by privacy/policy → hermes chat -q on demand → structured JSON result → validate allowed mutations → write state/facts/tasks/events → log model_run → emit SSE events → return response
```

PAOS does not persist provider conversation IDs. Continuity comes from SQLite state.

## SSE contract

Endpoint: `GET /api/v1/stream`.

OpenAPI response content type: `text/event-stream`.

Frame format:

```text
id: 123
event: agent.state_updated
data: {"event_id":123,"type":"agent.state_updated","agent_id":"media","created_at":"...Z","summary":"Media state updated.","payload":{},"refresh":["activity","agent:media","agents","dashboard"]}
```

Stable event types:

```text
agent.created
agent.updated
agent.disabled
agent.status_changed
agent.state_updated
task.created
task.started
task.completed
task.failed
activity.created
project.summary_ingested
model.run_completed
system.warning
media.started
media.paused
media.completed
media.dropped
```

Reconnection: v1 emits `id:` but does not yet read `Last-Event-ID`; dashboard should refresh REST resources after reconnect.
