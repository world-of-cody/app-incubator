import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { env } from "@/lib/env";

const exec = promisify(execFile);

export type AutomationInvocation = {
  agentId: string;
  workspacePath: string;
  args?: string[];
};

export async function runAutomation({
  agentId,
  workspacePath,
  args = [],
}: AutomationInvocation) {
  try {
    const { stdout } = await exec(env.AUTOMATION_ENGINE_BIN, [
      "agent",
      "run",
      agentId,
      "--workspace",
      workspacePath,
      ...args,
    ]);

    return { success: true, output: stdout } as const;
  } catch (error) {
    return {
      success: false,
      error,
    } as const;
  }
}
