import { env } from "@/lib/env";
import { runAutomation } from "@/lib/openclaw/client";

export type RunFlowInput = {
  agentId: string;
  sessionId?: string;
  workspacePath?: string;
};

export async function triggerAgentFlow(input: RunFlowInput) {
  if (!input.agentId) {
    throw new Error("agentId is required");
  }

  const workspacePath = input.workspacePath ?? env.OPENCLAW_HOME;

  const result = await runAutomation({
    agentId: input.agentId,
    workspacePath,
    args: input.sessionId ? ["--session", input.sessionId] : [],
  });

  return result;
}
