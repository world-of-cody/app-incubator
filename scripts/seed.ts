import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const toJson = (value: unknown, fallback: unknown = null) =>
  JSON.stringify(value === undefined ? fallback : value);

async function ensureSqlite() {
  const dbPath = process.env.APP_DB_PATH ?? "./db/app.db";
  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(process.cwd(), dbPath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const sqlite = new Database(absolutePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.close();

  return { dbPath, absolutePath } as const;
}

async function main() {
  const { absolutePath } = await ensureSqlite();
  const openclawHome = process.env.OPENCLAW_HOME ?? "/root/.openclaw";
  const workspacePath = path.join(openclawHome, "workspaces", "seed");

  const agent = await prisma.agent.upsert({
    where: { slug: "workspace-orchestrator" },
    update: {
      description:
        "Bootstraps a workspace by calling the OpenClaw CLI located at " +
        openclawHome,
      workspacePath,
      roles: toJson(["DEV", "OPS"], []),
      tags: toJson(["seed"], []),
      skillPaths: toJson([], []),
      notes: "Seeded agent for local development",
      metadata: toJson(
        {
          openclawHome,
          defaultClaudeAgent: process.env.CLAUDE_AGENT_ID ?? "percy",
        },
        {},
      ),
    },
    create: {
      slug: "workspace-orchestrator",
      name: "Workspace Orchestrator",
      description:
        "Discovers local agents, validates workspaces, and runs onboarding automations",
      workspacePath,
      roles: toJson(["DEV", "OPS"], []),
      tags: toJson(["seed"], []),
      skillPaths: toJson([], []),
      notes: "Seeded agent for local development",
      metadata: toJson(
        {
          openclawHome,
          defaultClaudeAgent: process.env.CLAUDE_AGENT_ID ?? "percy",
        },
        {},
      ),
    },
  });

  await prisma.agentNote.deleteMany({ where: { agentId: agent.id } });
  await prisma.automationRun.deleteMany({ where: { agentId: agent.id } });

  await prisma.agentNote.create({
    data: {
      agentId: agent.id,
      author: "seed",
      body: "Workspace validated during seeding routine.",
    },
  });

  await prisma.onboardingSession.upsert({
    where: { id: "seed-session" },
    update: {
      status: "VALIDATED",
      normalizedPath: workspacePath,
      validationWarnings: toJson([], []),
      validationErrors: toJson([], []),
      notes: `Seeded database located at ${absolutePath}`,
    },
    create: {
      id: "seed-session",
      workspacePath,
      normalizedPath: workspacePath,
      status: "VALIDATED",
      claudeAgentId: process.env.CLAUDE_AGENT_ID ?? "percy",
      validationWarnings: toJson([], []),
      validationErrors: toJson([], []),
      acknowledgedRisk: true,
      notes: "Seed session created for local development",
    },
  });

  await prisma.automationRun.create({
    data: {
      agentId: agent.id,
      sessionId: "seed-session",
      status: "SUCCEEDED",
      intent: "Seed verification",
      dryRun: true,
      outputSummary: "Dry-run plan stored during seeding.",
    },
  });

  console.log("✅ Seed data written to", absolutePath);
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed database", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
