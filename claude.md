# Claude Briefing

You are working inside the `app-incubator` Next.js repo. Start by reading `AGENTS.md` for project context, environment requirements, and commands. That file is the single source of truth for onboarding instructions.

Key reminders:
- Use Node 20 + pnpm 9 (`.nvmrc` / `.npmrc`).
- Prisma uses the SQLite file at `APP_DB_PATH` (default `./db/app.db`).
- Keep database artifacts (`db/app.db`) out of git.
- Server/API routes must validate input with Zod before touching Prisma or the OpenClaw CLI stubs.
