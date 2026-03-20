import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { runAgentFlowSchema } from "@/lib/validation/agents";
import { triggerAgentFlow } from "@/lib/automation/engine";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const payload = await request.json().catch(() => null);
  const parsed = runAgentFlowSchema.safeParse({
    ...payload,
    agentId: params.id,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const agent = await prisma.agent.findUnique({ where: { id: params.id } });
  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  const run = await prisma.automationRun.create({
    data: {
      agentId: agent.id,
      sessionId: parsed.data.sessionId,
      status: "RUNNING",
    },
  });

  const result = await triggerAgentFlow({
    agentId: parsed.data.agentId,
    sessionId: parsed.data.sessionId,
    workspacePath: parsed.data.workspacePath ?? agent.workspacePath,
  }).catch((error) => ({
    success: false as const,
    error,
  }));

  await prisma.automationRun.update({
    where: { id: run.id },
    data: {
      status: result.success ? "SUCCEEDED" : "FAILED",
      logPath: result.success ? undefined : "",
    },
  });

  return NextResponse.json({
    status: result.success ? "triggered" : "failed",
    runId: run.id,
    output: result.success ? result.output : undefined,
    error: result.success ? undefined : String(result.error),
    todo: "Wire automation result to UI",
  });
}
