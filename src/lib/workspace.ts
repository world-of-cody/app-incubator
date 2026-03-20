import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

const OPENCLAW_HOME = path.resolve(env.OPENCLAW_HOME);
const MAX_SCAN_DEPTH = 3;
const IGNORED_DIRECTORIES = new Set([".git", ".next", "node_modules", "db", "dist", "tmp"]);
const REQUIRED_CHILD_DIRS = ["workspaces", path.join("custom", "skills")];
const MAX_PATH_LENGTH = 255;

export type WorkspaceValidationResult = {
  ok: boolean;
  normalizedPath: string;
  warnings: string[];
  errors: string[];
  stats: {
    workspaceExists: boolean;
    withinOpenClawHome: boolean;
    agentsFileExists: boolean;
    writable: boolean;
    hasWorkspacesDir: boolean;
    hasCustomSkillsDir: boolean;
    agentManifestCount: number;
  };
};

export type AgentManifest = {
  slug: string;
  name: string;
  description?: string;
  workspacePath: string;
  roles: string[];
  notes?: string;
  metadata: Record<string, unknown>;
  skillPaths: string[];
};

export function normalizeWorkspacePath(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return OPENCLAW_HOME;
  }

  const candidate = path.isAbsolute(trimmed)
    ? trimmed
    : path.join(OPENCLAW_HOME, trimmed);

  return path.resolve(candidate);
}

export async function validateWorkspacePath(rawPath: string): Promise<WorkspaceValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const normalizedPath = normalizeWorkspacePath(rawPath);

  if (!path.isAbsolute(rawPath.trim())) {
    errors.push("Workspace path must be absolute (e.g., /root/.openclaw).");
  }

  if (rawPath.includes('..')) {
    errors.push("Workspace path cannot include traversal segments ('..').");
  }

  if (normalizedPath.length >= MAX_PATH_LENGTH) {
    errors.push(`Workspace path exceeds the ${MAX_PATH_LENGTH}-character limit.`);
  }

  let workspaceExists = true;
  let agentsFileExists = false;
  let writable = true;
  let hasWorkspacesDir = false;
  let hasCustomSkillsDir = false;
  let agentManifestCount = 0;

  try {
    const stats = await fs.stat(normalizedPath);
    if (!stats.isDirectory()) {
      workspaceExists = false;
      errors.push("The provided path exists but is not a directory.");
    } else {
      await fs.access(normalizedPath, fsConstants.R_OK | fsConstants.X_OK);
      try {
        await fs.access(normalizedPath, fsConstants.W_OK);
      } catch {
        writable = false;
        warnings.push("Workspace is read-only; automation may fail to apply changes.");
      }
    }
  } catch {
    workspaceExists = false;
    errors.push("Workspace directory not found.");
  }

  const withinOpenClawHome = normalizedPath.startsWith(OPENCLAW_HOME);
  if (!withinOpenClawHome) {
    warnings.push(`Path is outside OPENCLAW_HOME (${OPENCLAW_HOME}).`);
  }

  if (workspaceExists) {
    const agentsFile = path.join(normalizedPath, "AGENTS.md");
    try {
      await fs.access(agentsFile, fsConstants.R_OK);
      agentsFileExists = true;
    } catch {
      warnings.push("Missing AGENTS.md in the workspace root. Discovery will fall back to nested manifests.");
    }

    const [workspacesDir, customSkillsDir] = REQUIRED_CHILD_DIRS.map((dir) => path.join(normalizedPath, dir));
    hasWorkspacesDir = await directoryExists(workspacesDir);
    hasCustomSkillsDir = await directoryExists(customSkillsDir);

    if (!hasWorkspacesDir) {
      errors.push("Expected workspaces directory was not found under the workspace root.");
    }

    if (!hasCustomSkillsDir) {
      warnings.push("custom/skills directory not found; skill discovery may be limited.");
    }

    agentManifestCount = await countAgentManifests(normalizedPath);
    if (agentManifestCount === 0) {
      errors.push("No AGENTS.md manifests were found within the workspace.");
    }
  }

  return {
    ok: errors.length === 0,
    normalizedPath,
    warnings,
    errors,
    stats: {
      workspaceExists,
      withinOpenClawHome,
      agentsFileExists,
      writable,
      hasWorkspacesDir,
      hasCustomSkillsDir,
      agentManifestCount,
    },
  };
}

async function directoryExists(dirPath: string) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function countAgentManifests(workspaceRoot: string) {
  try {
    const manifests = await collectAgentDirectories(workspaceRoot, 0);
    return manifests.length;
  } catch {
    return 0;
  }
}

export async function discoverAgents(workspaceRoot: string) {
  const normalizedRoot = normalizeWorkspacePath(workspaceRoot);
  const agentDirectories = await collectAgentDirectories(normalizedRoot, 0);
  const manifests: AgentManifest[] = [];
  const slugCounts = new Map<string, number>();

  for (const directory of agentDirectories) {
    const manifest = await parseAgentManifest(normalizedRoot, directory);
    const existing = slugCounts.get(manifest.slug) ?? 0;
    slugCounts.set(manifest.slug, existing + 1);

    if (existing > 0) {
      manifest.slug = `${manifest.slug}-${existing + 1}`;
    }

    manifests.push(manifest);
  }

  return manifests;
}

async function collectAgentDirectories(currentDir: string, depth: number): Promise<string[]> {
  const results: string[] = [];
  const entries = await safeReadDir(currentDir);
  const hasAgentsFile = entries.some((entry) => !entry.isDirectory() && entry.name === "AGENTS.md");

  if (hasAgentsFile) {
    results.push(currentDir);
  }

  if (depth >= MAX_SCAN_DEPTH) {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }

    const nextDir = path.join(currentDir, entry.name);
    const nested = await collectAgentDirectories(nextDir, depth + 1);
    results.push(...nested);
  }

  return results;
}

async function safeReadDir(dir: string) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function parseAgentManifest(workspaceRoot: string, agentDir: string): Promise<AgentManifest> {
  const agentsFilePath = path.join(agentDir, "AGENTS.md");
  const content = await fs.readFile(agentsFilePath, "utf-8").catch(() => "");
  const relativeDir = path.relative(workspaceRoot, agentDir) || ".";
  const defaultName = relativeDir === "." ? path.basename(agentDir) : relativeDir;

  const name = extractHeading(content) ?? defaultName;
  const description = extractFirstParagraph(content);
  const roles = extractList(content, /##\s+Roles?/i) ?? ["DEV"];
  const notes = extractSection(content, /##\s+Notes?/i)?.trim();
  const skillPaths = await collectSkillPaths(agentDir);

  return {
    slug: toSlug(relativeDir === "." ? name : relativeDir.split(path.sep).join("-")),
    name,
    description,
    workspacePath: agentDir,
    roles,
    notes,
    metadata: {
      relativeDir,
      agentsFilePath,
    },
    skillPaths,
  };
}

function extractHeading(content: string) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractFirstParagraph(content: string) {
  const sanitized = content.replace(/\r/g, "");
  const sections = sanitized.split(/\n\s*##\s+/);
  if (!sections.length) {
    return undefined;
  }
  const [intro] = sections;
  const paragraphs = intro
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length ? paragraphs[0] : undefined;
}

function extractSection(content: string, headingRegex: RegExp) {
  const sanitized = content.replace(/\r/g, "");
  const match = sanitized.match(headingRegex);
  if (!match || match.index === undefined) {
    return null;
  }
  const start = match.index + match[0].length;
  const rest = sanitized.slice(start);
  const nextHeadingIndex = rest.search(/\n##\s+/);
  return nextHeadingIndex === -1 ? rest : rest.slice(0, nextHeadingIndex);
}

function extractList(content: string, headingRegex: RegExp) {
  const section = extractSection(content, headingRegex);
  if (!section) {
    return null;
  }
  const items = section
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^[-*]\s*/, ""))
    .filter(Boolean);
  return items.length ? items : null;
}

async function collectSkillPaths(agentDir: string) {
  const candidates = ["skills", path.join("custom", "skills")];
  const results: string[] = [];

  for (const candidate of candidates) {
    const absolute = path.join(agentDir, candidate);
    const entries = await safeReadDir(absolute);
    for (const entry of entries) {
      if (entry.isDirectory()) {
        continue;
      }
      results.push(path.relative(agentDir, path.join(absolute, entry.name)));
    }
  }

  return results;
}

function toSlug(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || "workspace";
}
