"use server";

import { actionClient } from "@/lib/actions/safe-action";
import { ingestWorkspaceAgents, createValidationSession } from "@/lib/onboarding/service";
import {
  ingestWorkspaceSchema,
  validateWorkspaceSchema,
} from "@/lib/validation/onboarding";

export const validateWorkspaceAction = actionClient
  .schema(validateWorkspaceSchema)
  .action(async ({ parsedInput }) => {
    const { workspacePath, acknowledgeRisk } = parsedInput;

    const { session, validation } = await createValidationSession({
      workspacePath,
      acknowledgedRisk: acknowledgeRisk,
      source: "action",
    });

    return {
      sessionId: session.id,
      status: session.status,
      normalizedPath: session.normalizedPath,
      warnings: validation.warnings,
      errors: validation.errors,
    };
  });

export const ingestWorkspaceAction = actionClient
  .schema(ingestWorkspaceSchema)
  .action(async ({ parsedInput }) => {
    const { sessionId, intent, dryRun } = parsedInput;
    const result = await ingestWorkspaceAgents({ sessionId, intent, dryRun });
    return result;
  });
