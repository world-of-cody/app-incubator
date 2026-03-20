# App-Incubator POC — Architecture & Onboarding Specification

> Source: Percy (2026-03-20). Adapted into repo so every agent can read it offline.

## 1. Objective
Deliver a proof-of-concept that demonstrates how a local Next.js webapp can discover OpenClaw agents, let the user select which ones to incubate into reusable skills, and orchestrate the loop **User → Claude (automation engine) → workspace changes**. The POC targets an internal demo, so scope is intentionally narrow and optimised for the happy path on a single developer laptop.

### Complexity & Scope
- **Complexity:** Low — this iteration is primarily analytical (documentation, scaffolding, and mocked integrations) to de-risk the concept before deeper automation.
- **Scope guardrails:** Limit demos to a single local developer environment with dry-run automation to avoid unexpected filesystem changes.

---

## 2. High-Level Architecture

```
+------------------+        +-------------------+        +-----------------------+        +------------------+
|  Next.js UI      | <----> |  Local API (Next) | <----> | Automation Engine     | <----> | Workspace (FS)   |
|  (app router)    |        |  /api routes      |        | (Claude flow + hooks) |        | /root/.openclaw  |
+------------------+        +-------------------+        +-----------------------+        +------------------+
        |                            |                            |                              |
        |                            |                            |                              |
        |                            v                            v                              v
        |                     +-----------------+        +--------------------+         +------------------+
        |                     | SQLite (app.db) |        | Local Claude stack |         | Skill manifests  |
        |                     +-----------------+        +--------------------+         +------------------+
```

### Module Responsibilities
1. **Next.js UI**
   - Onboarding wizard: collect workspace path, scan status, risk confirmations.
   - Agent catalog view: list discovered OpenClaw agents + stored metadata.
   - Action panels: trigger “Generate onboarding plan”, “Apply sample skill”, etc.

2. **Local API (Next.js API routes / server actions)**
   - Wraps filesystem and shell calls (never from client).
   - Normalises responses for UI, enforces validation rules.
   - Exposes endpoints:
     - `POST /api/onboarding/validate-workspace`
     - `POST /api/onboarding/ingest` (discover agents)
     - `GET /api/agents`
     - `GET /api/agents/:id`
     - `PATCH /api/agents/:id`
     - `POST /api/agents/:id/run-flow`
     - `GET /api/status` (health checks)

3. **Automation Engine**
   - Thin orchestrator around Claude (local run via OpenClaw CLI or HTTP bridge).
   - Receives intent (e.g., “Generate skill manifest for Agent Percy”).
   - Prepares prompt with workspace context, executes via Claude, applies returned patch commands to workspace within sandbox (e.g., `openclaw exec --agent percy --cmd "..."`).
   - Reports status back to Local API for storage/logging.

4. **SQLite Storage (`app.db`)**
   - Single-file DB to persist agent metadata, onboarding sessions, Claude run logs.
   - Lives under project root; interactions via Prisma/Kysely.

5. **Workspace (Filesystem)**
   - Default path `/root/.openclaw`, configurable via onboarding.
   - Source of truth for installed agents + skills.
   - Only read/write through Local API to control permissions.

---

## 3. Data Model (SQLite)

### Tables & Key Fields
1. **agents**
   - `id` (PK, UUID)
   - `slug`
   - `name`
   - `description`
   - `workspace_path` (absolute path to agent dir)
   - `agent_roles` (JSON array)
   - `skill_paths` (JSON array)
   - `metadata` (JSON: version, runtime, tags)
   - `notes`
   - `created_at`, `updated_at`

2. **onboarding_sessions**
   - `id` (PK)
   - `workspace_root`
   - `status` (pending, validating, ready, failed)
   - `validation_errors` (JSON array)
   - `created_at`, `completed_at`

3. **automation_runs**
   - `id` (PK)
   - `agent_id` (FK → agents)
   - `intent`
   - `claude_prompt` (text)
   - `output_summary`
   - `changeset_path` (optional pointer to diff/log file)
   - `status` (pending, running, applied, failed)
   - `started_at`, `finished_at`

4. **notes** *(stretch for later phase)*
   - `id`
   - `agent_id`
   - `body`
   - `author`
   - `created_at`

Fields requested in acceptance criteria (name, path, roles, notes) live primarily in `agents` + `notes`.

Prioritisation: implement **agents** + **onboarding_sessions** first (required for MVP). `automation_runs` is needed for flow telemetry. `notes` optional for POC, can substitute with inline text area persisted on `agents.metadata` if schedule tight.

---

## 4. Workspace Path Input & Validation

### User Flow
1. **Prompt**: “Enter the absolute path to your OpenClaw workspace (default `/root/.openclaw`).” Pre-fill if detected.
2. **Validation steps (server-side, sequential):**
   1. **Path format** — must be absolute, no traversal (`..`), limit length < 255 chars.
   2. **Exists & readable** — `fs.stat` + `fs.access(R_OK)`.
   3. **Directory structure** — ensure subfolders `custom/skills` + `workspaces` exist.
   4. **Permissions** — attempt `fs.access(W_OK)` for directories we plan to write (log dir). If fail, warn user and gate automation engine features.
   5. **Agent presence** — read `/AGENTS.md` or list `workspaces/*/AGENTS.md` to confirm at least one agent installed.
   6. **Safety confirmation** — user must acknowledge we will run automation locally and accept responsibility.

### UX Safeguards
- Show inline error per validation step.
- Offer “Use detected path” if environment variable `OPENCLAW_HOME` available.
- Cache validated path inside `onboarding_sessions.workspace_root`.

---

## 5. Discovery & Interaction Flow

1. **Initial Onboarding**
   - User enters workspace path → Local API validates → stores session.
   - Local API scans `workspaces/*/AGENTS.md` + `custom/skills/*/SKILL.md` to build agent list.
   - Populate `agents` table with `name`, `roles`, `notes` stub, `workspace_path` (folder per agent), `skill_paths` (if agent owns skills).

2. **Agent Selection**
   - UI displays cards with summary (name, roles, last updated). User selects agent(s) to incubate.

3. **Automation Trigger**
   - User clicks “Generate onboarding plan”. UI calls `POST /api/agents/:id/run-flow` with `intent`.
   - Local API seeds automation_run row (status `pending`), then invokes Automation Engine.

4. **Claude Execution**
   - Engine constructs prompt: includes agent metadata, acceptance criteria, sample tasks.
   - Claude responds with plan/diff. Engine applies via `openclaw` CLI sandbox or writes diff to temp file for user review (POC may simulate apply to avoid destructive edits).
   - Engine updates `automation_runs` + attaches log/diff.

5. **Result Surfacing**
   - UI polls `GET /api/agents/:id` or websockets to show status, diffs, next steps.
   - Success message summarises changes; option to open generated skill folder.

---

## 6. Assumptions & Risks

| Area | Assumption | Risk / Mitigation |
|------|------------|-------------------|
| Permissions | User runs app with access to `/root/.openclaw` | If read/write denied, automation cannot apply patches → gate features and show remediation (run as same user). |
| Local Claude execution | Claude available via OpenClaw CLI (`openclaw agent run ...`) with sufficient tokens | If Claude unavailable/offline, runs fail → provide mock mode or disable automation button with warning. |
| Environment | Single-user Linux/WSL dev machine | Multi-user or remote FS may have latency/permissions issues → not supported in POC. |
| Security | User trusts local app with workspace access | Need clear disclaimer; no telemetry leaves machine. |
| Scope limits | POC focuses on discovery + one automation flow | Stakeholders might expect full skill publishing — explicitly mark as future phase. |
| SQLite file locking | App + background automation may access DB concurrently | Use single Prisma client, ensure WAL mode to reduce locking errors. |

---

## 7. MVP Success Criteria (Internal Demo)
1. **Onboarding completes**: user can point at `/root/.openclaw`, validations pass, agent list populates.
2. **Agent metadata persisted**: for at least one agent, DB stores `name`, `workspace_path`, `roles`, `notes` (even if blank) and data survives reload.
3. **Automation flow executes**: triggering run produces visible status updates and stores run summary (even if underlying filesystem change is mocked/dry-run).
4. **End-to-end story**: demo presenter can narrate user entering path → seeing agents → running Claude plan → viewing stored result without manual DB edits.
5. **Risk disclaimers shown**: UI surfaces permission + “local Claude required” notices so stakeholders know limitations.

---

## 8. Outstanding Questions / Next Steps
- Confirm which Claude endpoint to use (OpenClaw local vs. remote API key) and how credentials are injected.
- Decide whether automation engine may apply real file changes or produce patch preview only for POC.
- Determine UX for editing agent notes — inline editable field vs. modal.
- Align on logging storage (append-only text file vs. DB blob) for automation run outputs.

---

## 9. Suggested Acceptance Criteria (Ready for Dev)
1. **Architecture doc** (this file) checked into repo and referenced from ticket.
2. **Onboarding API contract** documented with validation steps + error codes.
3. **Data schema** created (Prisma migrations) covering tables in section 3.
4. **Risk checklist** reviewed and owners assigned (permissions, Claude availability, scope).
5. **MVP criteria** confirmed with stakeholders; demo script drafted.
