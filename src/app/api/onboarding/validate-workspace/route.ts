import { NextResponse } from "next/server";
import { createValidationSession } from "@/lib/onboarding/service";
import { validateWorkspaceSchema } from "@/lib/validation/onboarding";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = validateWorkspaceSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { session, validation } = await createValidationSession({
    workspacePath: parsed.data.workspacePath,
    acknowledgedRisk: parsed.data.acknowledgeRisk,
    source: "api",
  });

  const status = validation.ok ? 200 : 422;

  return NextResponse.json(
    {
      sessionId: session.id,
      status: session.status,
      normalizedPath: session.normalizedPath,
      warnings: validation.warnings,
      errors: validation.errors,
    },
    { status }
  );
}
