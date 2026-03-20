import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { runAutomation } from "@/lib/openclaw/client";

const DEFAULT_DRY_RUN = (env.DRY_RUN_AUTOMATION ?? "true").toString().toLowerCase() === "true";

export type RunFlowInput = {
  runId: string;
  agentSlug: string;
  sessionId?: string;
  workspacePath?: string;
  intent?: string;
  dryRun?: boolean;
};

export type AutomationFlowResult = {
  success: boolean;
  dryRun: boolean;
  summary: string;
  logPath: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

export async function triggerAgentFlow(input: RunFlowInput): Promise<AutomationFlowResult> {
  if (!input.agentSlug) {
    throw new Error("agentSlug is required");
  }

  if (!input.runId) {
    throw new Error("runId is required");
  }

  const workspacePath = input.workspacePath ?? env.OPENCLAW_HOME;
  const dryRun = input.dryRun ?? DEFAULT_DRY_RUN;
  const logPath = await ensureLogPath(input.runId);
  const sessionArgs = input.sessionId ? ["--session", input.sessionId] : [];
  const commandPreview = `${env.AUTOMATION_ENGINE_BIN} agent run ${input.agentSlug} --workspace ${workspacePath}${
    input.sessionId ? ` --session ${input.sessionId}` : ""
  }`;

  if (dryRun) {
    const summary = `Dry-run only. Command skipped: ${commandPreview}`;
    await writeLog(logPath, [
      headerLine(input.intent),
      `Mode: DRY_RUN`,
      `Workspace: ${workspacePath}`,
      `Session: ${input.sessionId ?? "n/a"}`,
      "",
      summary,
    ]);

    return {
      success: true,
      dryRun: true,
      summary,
      logPath,
      stdout: summary,
      stderr: "",
      exitCode: 0,
    };
  }

  const result = await runAutomation({
    agentSlug: input.agentSlug,
    workspacePath,
    args: sessionArgs,
  });

  const stdoutSection = result.stdout?.trim().length ? result.stdout : "(empty)";
  const stderrSection = result.stderr?.trim().length ? result.stderr : "(empty)";

  await writeLog(logPath, [
    headerLine(input.intent),
    `Mode: APPLY`,
    `Workspace: ${workspacePath}`,
    `Session: ${input.sessionId ?? "n/a"}`,
    `Command: ${commandPreview}`,
    "",
    "[stdout]",
    stdoutSection,
    "",
    "[stderr]",
    stderrSection,
  ]);

  return {
    success: result.success,
    dryRun: false,
    summary: summarizeOutput(stdoutSection, stderrSection),
    logPath,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

async function ensureLogPath(runId: string) {
  const absoluteDir = path.isAbsolute(env.AUTOMATION_LOG_DIR)
    ? env.AUTOMATION_LOG_DIR
    : path.join(process.cwd(), env.AUTOMATION_LOG_DIR);
  await fs.mkdir(absoluteDir, { recursive: true });
  return path.join(absoluteDir, `${runId}.log`);
}

async function writeLog(logPath: string, lines: string[]) {
  const timestamp = new Date().toISOString();
  const payload = [`[${timestamp}] Automation run`, ...lines].join("\n");
  await fs.writeFile(logPath, `${payload}\n`, "utf-8");
}

function headerLine(intent?: string) {
  return intent ? `Intent: ${intent}` : "Intent: (not provided)";
}

function summarizeOutput(stdout: string, stderr: string) {
  const trimmedStdout = stdout.trim();
  if (trimmedStdout) {
    return trimmedStdout.slice(0, 4000);
  }
  return stderr.trim().slice(0, 4000) || "Automation finished with no output.";
}
