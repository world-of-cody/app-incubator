import { promisify } from "node:util";
import { execFile, type ExecFileException } from "node:child_process";
import { env } from "@/lib/env";

const exec = promisify(execFile);

export type AutomationInvocation = {
  agentSlug: string;
  workspacePath: string;
  args?: string[];
};

export type AutomationInvocationResult =
  | {
      success: true;
      stdout: string;
      stderr: string;
      exitCode: 0;
    }
  | {
      success: false;
      stdout: string;
      stderr: string;
      exitCode: number | null;
      error: string;
    };

export async function runAutomation({
  agentSlug,
  workspacePath,
  args = [],
}: AutomationInvocation): Promise<AutomationInvocationResult> {
  const cliArgs = [
    "agent",
    "run",
    agentSlug,
    "--workspace",
    workspacePath,
    ...args,
  ];

  try {
    const { stdout, stderr } = await exec(env.AUTOMATION_ENGINE_BIN, cliArgs, {
      env: process.env,
    });

    return {
      success: true,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      exitCode: 0,
    };
  } catch (rawError) {
    const error = rawError as ExecFileException & { stdout?: string; stderr?: string };
    return {
      success: false,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      exitCode: typeof error.code === "number" ? error.code : null,
      error: error.message ?? "Automation command failed",
    };
  }
}
