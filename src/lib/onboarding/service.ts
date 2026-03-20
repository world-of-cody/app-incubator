import { prisma } from "@/lib/db/client";
import { jsonObject, serializeJson } from "@/lib/db/json";
import { env } from "@/lib/env";
import { discoverAgents, validateWorkspacePath } from "@/lib/workspace";

type ValidationInput = {
  workspacePath: string;
  acknowledgedRisk: boolean;
  source?: string;
};

type IngestInput = {
  sessionId: string;
  intent: string;
  dryRun?: boolean;
};

export async function createValidationSession(input: ValidationInput) {
  if (!input.acknowledgedRisk) {
    throw new Error("You must acknowledge the automation risk before continuing.");
  }

  const validation = await validateWorkspacePath(input.workspacePath);

  const session = await prisma.onboardingSession.create({
    data: {
      workspacePath: input.workspacePath,
      normalizedPath: validation.normalizedPath,
      status: validation.ok ? "VALIDATED" : "FAILED",
      claudeAgentId: env.CLAUDE_AGENT_ID,
      acknowledgedRisk: true,
      validationWarnings: serializeJson(validation.warnings, []),
      validationErrors: serializeJson(validation.errors, []),
      metadata: serializeJson(
        {
          source: input.source ?? "unknown",
          stats: validation.stats,
        },
        {},
      ),
    },
  });

  return { session, validation };
}

export async function ingestWorkspaceAgents(input: IngestInput) {
  const session = await prisma.onboardingSession.findUnique({
    where: { id: input.sessionId },
  });

  if (!session) {
    throw new Error("Onboarding session not found");
  }

  const validation = await validateWorkspacePath(session.normalizedPath ?? session.workspacePath);
  if (!validation.ok) {
    await prisma.onboardingSession.update({
      where: { id: session.id },
      data: {
        status: "FAILED",
        validationWarnings: serializeJson(validation.warnings, []),
        validationErrors: serializeJson(validation.errors, []),
      },
    });

    throw new Error("Workspace validation failed during ingestion");
  }

  const manifests = await discoverAgents(validation.normalizedPath);
  if (manifests.length === 0) {
    throw new Error("No AGENTS.md manifests were found in the workspace");
  }

  const agents: { id: string; slug: string; workspacePath: string }[] = [];
  const runs: { id: string; agentId: string }[] = [];

  for (const manifest of manifests) {
    const agentRecord = await prisma.agent.upsert({
      where: { slug: manifest.slug },
      update: {
        name: manifest.name,
        description: manifest.description,
        workspacePath: manifest.workspacePath,
        roles: serializeJson(manifest.roles, []),
        tags: serializeJson([], []),
        notes: manifest.notes,
        skillPaths: serializeJson(manifest.skillPaths, []),
        metadata: serializeJson(manifest.metadata, {}),
      },
      create: {
        slug: manifest.slug,
        name: manifest.name,
        description: manifest.description,
        workspacePath: manifest.workspacePath,
        roles: serializeJson(manifest.roles, []),
        tags: serializeJson([], []),
        notes: manifest.notes,
        skillPaths: serializeJson(manifest.skillPaths, []),
        metadata: serializeJson(manifest.metadata, {}),
      },
    });

    agents.push({
      id: agentRecord.id,
      slug: agentRecord.slug,
      workspacePath: agentRecord.workspacePath,
    });

    const automationRun = await prisma.automationRun.create({
      data: {
        agentId: agentRecord.id,
        sessionId: session.id,
        status: "PENDING",
        intent: input.intent,
        dryRun: input.dryRun ?? true,
        outputSummary: null,
      },
    });

    runs.push({ id: automationRun.id, agentId: automationRun.agentId });
  }

  const existingMetadata = jsonObject<Record<string, unknown>>(session.metadata) ?? {};
  await prisma.onboardingSession.update({
    where: { id: session.id },
    data: {
      status: "INGESTED",
      metadata: serializeJson(
        {
          ...existingMetadata,
          manifestCount: manifests.length,
          lastIngestedAt: new Date().toISOString(),
        },
        {},
      ),
      validationWarnings: serializeJson(validation.warnings, []),
      validationErrors: serializeJson(validation.errors, []),
    },
  });

  return { sessionId: session.id, agents, runs };
}
