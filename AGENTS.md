# App Incubator — Agent Brief

## Mission
Bootstrap playground that validates OpenClaw workspaces, stores onboarding artifacts in SQLite via Prisma, and triggers automation runs through the OpenClaw CLI.

## Stack
- Next.js 14 (App Router, TypeScript, Tailwind)
- Prisma + SQLite (file:./db/app.db)
- next-safe-action for server/action stubs
- pnpm 9, Node 20 LTS

## Key Commands
```bash
pnpm install         # install deps (requires pnpm 9)
pnpm dev             # start Next dev server
pnpm lint            # run Next lint
pnpm db:generate     # prisma generate
pnpm db:migrate      # prisma migrate dev
pnpm db:seed         # seed SQLite with demo data
```

## Environment
Copy `.env.example` → `.env` and adjust if needed.
- `OPENCLAW_HOME` → path to OpenClaw install
- `APP_DB_PATH` → SQLite file (default `./db/app.db`)
- `AUTOMATION_ENGINE_BIN` → CLI executable (default `openclaw`)
- `CLAUDE_AGENT_ID` → default Claude agent slug

## Project Structure
```
app-incubator/
  src/app/(onboarding)      # onboarding wizard pages
  src/app/(dashboard)/agents# catalog view
  src/app/api               # API + action stubs with Zod validation
  src/components            # UI + layout primitives
  src/lib/db                # Prisma + SQLite helpers
  src/lib/openclaw          # CLI runner stubs
  prisma/                   # Prisma schema & migrations
  scripts/seed.ts           # seeds sample agent + session
```

## Current Status / Next Up
- ✅ Workspace validation + ingestion APIs are live and wired to Prisma/SQLite.
- ✅ Automation engine wrapper is in place (defaults to dry-run); logs land under `db/logs`.
- ✅ Onboarding + catalog UIs call the real actions via `next-safe-action`.
- ⏭️ Next iteration: flesh out automation diff viewer + add integration tests covering the ingestion + run-flow endpoints.
