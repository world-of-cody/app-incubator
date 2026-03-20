import { z } from "zod";

export const validateWorkspaceSchema = z.object({
  workspacePath: z.string().min(1, "workspacePath is required"),
  acknowledgeRisk: z.boolean().optional(),
});

export const ingestWorkspaceSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  intent: z.string().min(1, "intent is required"),
  dryRun: z.boolean().optional(),
});
