-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workspacePath" TEXT NOT NULL,
    "roles" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "skillPaths" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspacePath" TEXT NOT NULL,
    "normalizedPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claudeAgentId" TEXT,
    "notes" TEXT,
    "metadata" TEXT,
    "validationWarnings" TEXT,
    "validationErrors" TEXT,
    "acknowledgedRisk" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "intent" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "claudePrompt" TEXT,
    "outputSummary" TEXT,
    "externalRunId" TEXT,
    "logPath" TEXT,
    "changesetPath" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AutomationRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_slug_key" ON "Agent"("slug");

-- CreateIndex
CREATE INDEX "AutomationRun_agentId_idx" ON "AutomationRun"("agentId");

-- CreateIndex
CREATE INDEX "AutomationRun_sessionId_idx" ON "AutomationRun"("sessionId");
