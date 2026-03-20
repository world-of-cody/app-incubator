import { NextResponse } from "next/server";
import { ingestWorkspaceAgents } from "@/lib/onboarding/service";
import { ingestWorkspaceSchema } from "@/lib/validation/onboarding";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = ingestWorkspaceSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await ingestWorkspaceAgents(parsed.data);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to ingest workspace",
      },
      { status: 422 }
    );
  }
}
