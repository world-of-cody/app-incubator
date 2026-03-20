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

  const startedAt = new Date();
  const run = await prisma.automationRun.create({
    data: {
      agentId: agent.id,
      sessionId: parsed.data.sessionId,
      status: "RUNNING",
      intent: parsed.data.intent,
      dryRun: parsed.data.dryRun ?? undefined,
      startedAt,
    },
  });

  try {
    const result = await triggerAgentFlow({
      runId: run.id,
      agentSlug: agent.slug,
      sessionId: parsed.data.sessionId,
      workspacePath: parsed.data.workspacePath ?? agent.workspacePath,
      intent: parsed.data.intent,
      dryRun: parsed.data.dryRun,
    });

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: result.success ? "SUCCEEDED" : "FAILED",
        dryRun: result.dryRun,
        outputSummary: result.summary,
        logPath: result.logPath,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        runId: run.id,
        status: result.success ? "SUCCEEDED" : "FAILED",
        dryRun: result.dryRun,
        summary: result.summary,
        logPath: result.logPath,
      },
      { status: result.success ? 202 : 500 }
    );
  } catch (error) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        outputSummary: error instanceof Error ? error.message : "Unknown automation failure",
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        runId: run.id,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
