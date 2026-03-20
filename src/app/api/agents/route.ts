import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { toAgentDTO } from "@/lib/db/mappers";
import { agentsQuerySchema } from "@/lib/validation/agents";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = agentsQuerySchema.safeParse({
    tag: searchParams.get("tag") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rows = await prisma.agent.findMany({
    orderBy: { createdAt: "desc" },
  });

  const agents = rows
    .map(toAgentDTO)
    .filter((agent) =>
      parsed.data.tag ? agent.tags.includes(parsed.data.tag) : true,
    );

  return NextResponse.json({ agents });
}
