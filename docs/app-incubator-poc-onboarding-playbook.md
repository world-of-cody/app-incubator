# App-Incubator POC — Onboarding & Automation Playbook

> Companion to [`app-incubator-poc-spec.md`](./app-incubator-poc-spec.md). This file translates the architecture into concrete implementation notes for the DEV phase so the Next.js POC can be built without further planning cycles.

## 1. End-to-End Flow (Happy Path)

1. **Workspace Path Entry** (UI): user enters `/root/.openclaw` (pre-filled from `OPENCLAW_HOME`).
2. **Validation API (`POST /api/onboarding/validate-workspace`)**:
   - Runs the six validation steps (Table 2).
   - Creates/updates an `OnboardingSession` row (`status: "READY"`) with `normalizedPath`.
3. **Ingestion API (`POST /api/onboarding/ingest`)**:
   - Uses `workspace.ts` helpers to enumerate agents + skills.
   - Upserts `Agent` rows and seeds `AutomationRun` stubs (status `PENDING`).
4. **Agents Catalog (`GET /api/agents`)**: UI lists agents with `name`, `roles`, `workspacePath`, `notes`, and last run status.
5. **Automation Trigger (`POST /api/agents/:id/run-flow`)**: records run intent, invokes Automation Engine adapter (`CLAUDE_MODE` determines `local|mock`).
6. **Results Surfacing**: UI polls `GET /api/agents/:id` for updated `automationRuns`; displays `outputSummary` + log links.

```
User → Next.js UI → API Routes → Workspace Scanner → Prisma (SQLite)
                                        ↘ Automation Engine ↦ OpenClaw CLI ↦ Workspace FS
```

## 2. Data Model ↔ Prisma Schema Mapping

| Concept | Prisma Model | Fields | Notes |
|---------|--------------|--------|-------|
| Agent catalog | `Agent` | `id`, `slug`, `name`, `workspacePath`, `roles`, `skillPaths`, `notes`, `metadata`, timestamps | `roles`, `skillPaths`, `metadata` stored as JSON strings (Prisma `String` column) — helper functions in `lib/db/json.ts` coerce to/from arrays. Acceptance criteria fields (name, path, roles, notes) live here. |
| Onboarding session | `OnboardingSession` | `workspacePath`, `normalizedPath`, `status`, `validationWarnings`, `validationErrors`, `acknowledgedRisk` | `metadata` holds UI wizard context. One active session per workspace path; use `normalizedPath` as lookup key. |
| Automation telemetry | `AutomationRun` | `agentId`, `sessionId`, `intent`, `dryRun`, `claudePrompt`, `outputSummary`, `logPath`, `changesetPath`, status timestamps | `logPath` stores pointer under `AUTOMATION_LOG_DIR`. Dry-run defaults to `true` for POC to avoid destructive edits. |
| Agent notes | `AgentNote` | `agentId`, `body`, `author`, `createdAt` | Optional for POC; fallback to `Agent.notes` text area until UX finalizes edits. |

Prisma schema already checked in under `prisma/schema.prisma` with migration `20260320133610_init`. Running `pnpm db:migrate` produces `db/app.db` ready for integrations.

## 3. Workspace Discovery Pipeline

| Stage | Responsibility | Implementation Notes |
|-------|----------------|----------------------|
| Path normalization | `workspace.ts#normalizeWorkspacePath` | Resolves symlinks, trims trailing slashes, rejects traversal (`..`). Returns `{ normalizedPath, warnings }`. |
| Structural checks | `workspace.ts#assertWorkspaceShape` | Verifies required folders: `custom/skills`, `workspaces`, `custom/shared_workspace`. Optionally detect existing `OPENCLAW_HOME`. |
| Agent scanning | `workspace.ts#scanAgents` | Walks `workspaces/*/AGENTS.md`, parses metadata (name, roles, preferred commands). Each agent becomes `AgentUpsertInput`. |
| Skill discovery | `workspace.ts#scanSkills` | Reads `custom/skills/*/SKILL.md` to attach skill metadata to owning agent (`skillPaths`). |
| Persistence | `lib/ingest.ts#upsertAgents` | Wraps Prisma transaction: delete-orphan toggles (optional), upsert agent rows, seed matching `AutomationRun` with default `intent="generate_onboarding_plan"`. |

All filesystem actions run server-side via Next.js API routes to avoid exposing local paths to the browser.

## 4. Validation Matrix & Error Contract

`POST /api/onboarding/validate-workspace` returns:
```ts
{
  ok: boolean,
  normalizedPath?: string,
  sessionId?: string,
  warnings: ValidationMessage[],
  errors: ValidationMessage[]
}

type ValidationMessage = {
  code: 'PATH_FORMAT' | 'NOT_ABSOLUTE' | 'NOT_FOUND' | 'NOT_DIRECTORY' |
        'READ_ONLY' | 'MISSING_FOLDERS' | 'NO_AGENTS' | 'PERMISSION_DENIED' |
        'OUTSIDE_HOME' | 'AGENTS_ROOT_MISSING' | 'SAFETY_ACK_REQUIRED';
  message: string;
};
```

(Implemented in [`src/lib/types/validation.ts`](../src/lib/types/validation.ts))

| Step | Description | Failure Code | UX copy |
|------|-------------|--------------|---------|
| 1 | Absolute path w/out `..`, < 255 chars | `PATH_FORMAT` / `NOT_ABSOLUTE` | "Enter an absolute path like `/root/.openclaw`. Relative paths are not allowed." |
| 2 | `fs.stat` exists + directory | `NOT_FOUND` / `NOT_DIRECTORY` | "We couldn’t find that folder. Double-check the path." |
| 3 | Read permissions (`fs.access R_OK`) | `READ_ONLY` | "App needs read access to inspect agents. Update permissions or run as the same user that owns the workspace." |
| 4 | Required folders exist (`custom/skills`, `workspaces`) | `MISSING_FOLDERS` | "The folder doesn’t look like an OpenClaw workspace (missing `custom/skills`)." |
| 5 | Write permissions for logs (`fs.access W_OK`) | `PERMISSION_DENIED` | Show warning but allow read-only mode; automation buttons stay disabled until resolved. |
| 6 | Path resides under `OPENCLAW_HOME` | `OUTSIDE_HOME` *(warning)* | "This path lives outside `/root/.openclaw`. Proceed only if you trust the folder." |
| 7 | Workspace root includes `AGENTS.md` | `AGENTS_ROOT_MISSING` *(warning)* | "Root AGENTS.md missing; discovery falls back to nested manifests." |
| 8 | At least one agent present (`workspaces/*/AGENTS.md`) | `NO_AGENTS` | "We couldn’t find any agents. Install one via `openclaw agent install ...` first." |
| 9 | Safety acknowledgement checkbox | `SAFETY_ACK_REQUIRED` | "Please confirm you understand the automation will run locally." |

Successful validation acknowledges risks by setting `OnboardingSession.acknowledgedRisk = true` and unlocking ingestion.

## 5. API Surface (Ready for Implementation)

| Method & Path | Purpose | Auth | Status Codes | Notes |
|---------------|---------|------|--------------|-------|
| `POST /api/onboarding/validate-workspace` | Run validation matrix, create/update session | none (local app) | `200` success with payload above; `422` invalid body | Idempotent by `normalizedPath`. |
| `POST /api/onboarding/ingest` | Scan workspace + persist agents | requires `sessionId` referencing `READY` session | `202` accepted, returns `{ agents: AgentDTO[] }` | Long-running steps can stream progress via logs. |
| `GET /api/agents` | List agents with last automation run summary | none | `200` with `agents: AgentDTO[]` | Server component fetch by default. |
| `GET /api/agents/:id` | Detail view inc. automation history | none | `200` / `404` | Includes `automationRuns` (last 10). |
| `PATCH /api/agents/:id` | Update `notes`, `metadata` toggles | none | `200` / `409` conflict if outdated | Use `updatedAt` for optimistic concurrency. |
| `POST /api/agents/:id/run-flow` | Trigger automation engine | none | `202` accepted, `409` if existing run active | Returns `{ runId, status }`; worker updates DB asynchronously. |
| `GET /api/status` | Health check | none | `200` with `{ db: 'ok', workspace: 'ok|warn', automation: 'mock|local' }` | Use for UI indicator + QA smoke tests. |

`AgentDTO` (shared between UI + API) includes: `id`, `name`, `slug`, `roles: string[]`, `workspacePath`, `skillPaths`, `notes`, `metadata`, `automationRuns: AutomationRunDTO[]` (subset), `latestRunStatus`.

## 6. Risk Checklist & Owners

| Risk | Impact | Mitigation / Owner |
|------|--------|--------------------|
| Permission mismatch on workspace folder | UI can’t read agents or write logs | Add detection in validation matrix; show remediation text (Owner: **DEV**). |
| Claude endpoint unavailable | Automation runs fail silently | Env toggle `CLAUDE_MODE=mock` with banner; UI disables button when in mock mode (Owner: **DEV/PM**). |
| Long-running CLI hangs Next.js route | API request times out, run left `PENDING` | Execute automation in background worker (`lib/automation/worker.ts`) and poll DB. (Owner: **DEV**). |
| SQLite locking under concurrent writes | Ingestion + automation run update fail | Enable WAL on startup (`lib/db/client.ts`). Keep writes small + queued. (Owner: **DEV**). |
| Users expect real filesystem apply during demo | Could mutate workspace unexpectedly | Keep `DRY_RUN_AUTOMATION=true` for POC; show banner that outputs are preview-only. (Owner: **PM/DEV**). |
| Sensitive data exposure in UI | `AGENTS.md` may contain secrets | Redact known tokens (simple regex) before persisting `metadata`. (Owner: **DEV + QA**). |

## 7. MVP Success Criteria (Demo Checklist)

1. **Validation Demo**: Screen recording (or live) showing path entry → per-step validation results → green "Workspace ready" banner.
2. **Discovery Demo**: `pnpm db:reset && pnpm dev`, run ingestion, watch agents populate list with `name/path/roles/notes` persisted in SQLite.
3. **Automation Demo**: Click "Generate onboarding plan" (mock run), observe status pill and inspect stored summary/log link.
4. **Risk Comms**: Banner/checkbox surfaces permission + Claude availability disclaimers before automation can run.
5. **Docs Linkage**: README references both the spec and this playbook so future contributors onboard quickly.

## 8. Next Actions for Implementation Crew

- [ ] Wire `lib/workspace.ts` helpers per pipeline above.
- [ ] Build validation & ingestion API routes using shared Zod schemas.
- [ ] Implement automation adapter with mock + local modes.
- [ ] Add UI skeleton for onboarding wizard + agents dashboard referencing API contracts.
- [ ] Document QA smoke checklist (can live under `docs/qa-smoke-checklist.md`).

This playbook, combined with the original architecture spec, fulfills the ticket’s requirement to make the POC architecture, data model, validations, and risk plan explicit within the repository.
