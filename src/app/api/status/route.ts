import os from "node:os";
import process from "node:process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { prisma, databasePath } from "@/lib/db/client";
import { env } from "@/lib/env";
import { validateWorkspacePath } from "@/lib/workspace";

const exec = promisify(execFile);

export async function GET() {
  const [database, automationCli, workspace] = await Promise.all([
    checkDatabase(),
    checkAutomationCli(),
    checkWorkspace(),
  ]);

  const ok = database.ok && automationCli.ok && workspace.ok;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      runtime: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: `${os.type()} ${os.release()}`,
      },
      database: {
        ...database,
        path: databasePath,
      },
      automationCli,
      workspace,
      env: {
        openclawHome: env.OPENCLAW_HOME,
        automationLogDir: env.AUTOMATION_LOG_DIR,
        dryRunAutomation: env.DRY_RUN_AUTOMATION,
      },
    },
    { status: ok ? 200 : 503 }
  );
}

async function checkDatabase() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to reach SQLite database",
    } as const;
  }
}

async function checkAutomationCli() {
  try {
    await exec("/bin/sh", ["-c", `command -v ${env.AUTOMATION_ENGINE_BIN}`]);
    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Automation CLI not found: ${error.message}`
          : "Automation CLI not found",
    } as const;
  }
}

async function checkWorkspace() {
  const validation = await validateWorkspacePath(env.OPENCLAW_HOME);
  return {
    ok: validation.ok,
    warnings: validation.warnings,
    errors: validation.errors,
    stats: validation.stats,
  } as const;
}
