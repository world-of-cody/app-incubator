import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { createAgentNoteSchema } from "@/lib/validation/agents";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!params.id) {
    return NextResponse.json({ message: "Agent id is required" }, { status: 400 });
  }

  const notes = await prisma.agentNote.findMany({
    where: { agentId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notes });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!params.id) {
    return NextResponse.json({ message: "Agent id is required" }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = createAgentNoteSchema.safeParse(payload ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const agent = await prisma.agent.findUnique({ where: { id: params.id } });
  if (!agent) {
    return NextResponse.json({ message: "Agent not found" }, { status: 404 });
  }

  const note = await prisma.agentNote.create({
    data: {
      agentId: params.id,
      body: parsed.data.body,
      author: parsed.data.author ?? "user",
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
