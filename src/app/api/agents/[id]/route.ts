import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { toAgentDTO } from "@/lib/db/mappers";
import { serializeJson } from "@/lib/db/json";
import { updateAgentSchema } from "@/lib/validation/agents";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!params.id) {
    return NextResponse.json({ message: "Agent id is required" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    include: {
      automationRuns: { orderBy: { createdAt: "desc" }, take: 10 },
      journal: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    agent: toAgentDTO(agent),
    automationRuns: agent.automationRuns,
    notes: agent.journal,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!params.id) {
    return NextResponse.json({ message: "Agent id is required" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateAgentSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        notes: parsed.data.notes ?? undefined,
        tags:
          parsed.data.tags !== undefined
            ? serializeJson(parsed.data.tags, [])
            : undefined,
      },
    });

    return NextResponse.json({ agent: toAgentDTO(agent) });
  } catch {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }
}
