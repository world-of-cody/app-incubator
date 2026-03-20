-- CreateTable
CREATE TABLE "AgentNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentNote_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OnboardingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspacePath" TEXT NOT NULL,
    "normalizedPath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "claudeAgentId" TEXT,
    "notes" TEXT,
    "metadata" TEXT,
    "validationWarnings" TEXT DEFAULT '[]',
    "validationErrors" TEXT DEFAULT '[]',
    "acknowledgedRisk" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OnboardingSession" ("acknowledgedRisk", "claudeAgentId", "completedAt", "createdAt", "id", "metadata", "normalizedPath", "notes", "status", "updatedAt", "validationErrors", "validationWarnings", "workspacePath") SELECT "acknowledgedRisk", "claudeAgentId", "completedAt", "createdAt", "id", "metadata", "normalizedPath", "notes", "status", "updatedAt", "validationErrors", "validationWarnings", "workspacePath" FROM "OnboardingSession";
DROP TABLE "OnboardingSession";
ALTER TABLE "new_OnboardingSession" RENAME TO "OnboardingSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AgentNote_agentId_idx" ON "AgentNote"("agentId");
