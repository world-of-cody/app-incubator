import { z } from "zod";

export const agentsQuerySchema = z.object({
  tag: z.string().optional(),
});

export const runAgentFlowSchema = z.object({
  agentId: z.string().min(1, "agentId is required"),
  sessionId: z.string().optional(),
  workspacePath: z.string().optional(),
});

export const updateAgentSchema = z.object({
  notes: z.string().max(4000).optional(),
  tags: z
    .array(z.string().min(1).max(32))
    .max(12)
    .optional(),
});

export const createAgentNoteSchema = z.object({
  body: z.string().min(1, "body is required").max(4000),
  author: z.string().min(1).max(100).optional(),
});
