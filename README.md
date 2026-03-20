# App Incubator POC

Internal proof-of-concept that lets us point a local Next.js UI at an OpenClaw workspace, validate that workspace, ingest the installed agents, and trigger automation runs through the OpenClaw CLI.

- 📄 **Architecture & onboarding spec:** [`docs/app-incubator-poc-spec.md`](./docs/app-incubator-poc-spec.md)
- 🛠️ **DEV playbook / API contracts:** [`docs/app-incubator-poc-onboarding-playbook.md`](./docs/app-incubator-poc-onboarding-playbook.md)
- 🧭 **Agent instructions:** [`AGENTS.md`](./AGENTS.md) (single source of truth for AI helpers)
- 🤖 **Claude briefing:** [`claude.md`](./claude.md)

## Getting Started

```bash
pnpm install
cp .env.example .env            # adjust OPENCLAW_HOME if needed
pnpm db:migrate                 # applies prisma migrations (creates db/app.db)
pnpm db:seed                    # optional dev data
pnpm dev                        # runs Next.js at http://localhost:3000
```

### Environment Variables
| Name | Default | Purpose |
|------|---------|---------|
| `OPENCLAW_HOME` | `/root/.openclaw` | Root workspace to scan + run automations against |
| `APP_DB_PATH` | `./db/app.db` | Location of SQLite database (also used to build `DATABASE_URL`) |
| `AUTOMATION_ENGINE_BIN` | `openclaw` | CLI binary the automation engine calls (must support `agent run`) |
| `CLAUDE_AGENT_ID` | `percy` | Default Claude agent used when seeding automation runs |
| `AUTOMATION_LOG_DIR` | `./db/logs` | Where automation run logs/diffs are stored |
| `DRY_RUN_AUTOMATION` | `true` | When "true", the automation engine records prompts/output but skips applying filesystem changes |

## Project Layout
```
src/
  app/(onboarding)        # Workspace wizard UI (validate + ingest)
  app/(dashboard)/agents  # Catalog view of discovered agents
  app/api                 # Next.js route handlers (onboarding, agents, status)
  components/             # UI primitives + form components
  lib/                    # Prisma client, env helpers, workspace scanner, automation engine
prisma/                   # Prisma schema + migrations
scripts/                  # Seed + utility scripts
public/                   # Static assets
```

## Key Flows
1. User enters a workspace path → `POST /api/onboarding/validate-workspace` performs multi-step validation and creates an `OnboardingSession`.
2. User queues ingestion → `POST /api/onboarding/ingest` rescans the filesystem, upserts `Agent` rows, and seeds `AutomationRun` stubs.
3. Agents page uses `GET /api/agents` or `GET /api/agents/:id` to show metadata, notes, and recent automation runs.
4. Triggering an automation call uses `POST /api/agents/:id/run-flow`, which records the run, calls the OpenClaw CLI (mock/dry-run friendly), captures logs to `AUTOMATION_LOG_DIR`, and updates run status in SQLite.
5. Health widget calls `GET /api/status` to verify DB connectivity, CLI availability, and workspace access.

## Risks & Limitations (POC)
- **Filesystem permissions:** the app assumes read access to `/root/.openclaw` and write access for logs. If the workspace is read-only, automations stay in dry-run mode and the UI surfaces a warning banner.
- **Local Claude dependency:** automation flows expect a locally configured Claude/OpenClaw CLI. Set `DRY_RUN_AUTOMATION=true` to keep the demo safe if Claude is unavailable.
- **Dry-run scope:** automation logs the intended command but skips applying diffs in the default configuration to avoid unexpected workspace mutations during demos.
- **Single-user target:** this release optimises for a single developer laptop; multi-user / remote filesystems are out of scope and may exhibit locking or latency issues.
- **Partial logging UX:** log files are written under `db/logs` and surfaced via API responses, but there is no dedicated UI for browsing historical logs yet.

## Testing / Validation
- `pnpm lint` — ESLint (Next.js config)
- `pnpm typecheck` — TypeScript project references
- Manual testing: run `pnpm dev`, validate `/onboarding`, ingest agents from a local OpenClaw workspace, trigger automation dry-runs, and inspect `db/app.db` with `pnpm prisma studio` if needed.

## Roadmap / Open Questions
See the spec for risk tracking. Outstanding decisions: Claude endpoint wiring, whether to allow automation to apply diffs vs. dry-run preview, and UX for editing agent notes + reviewing run logs.
