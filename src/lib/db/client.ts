import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const resolveDbPath = () => {
  const configured = process.env.APP_DB_PATH ?? "./db/app.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
};

const ensureDatabase = () => {
  const absolutePath = resolveDbPath();
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const sqlite = new Database(absolutePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.close();

  return absolutePath;
};

const normalizeDatasourceUrl = (url?: string) => {
  if (!url || !url.startsWith("file:")) {
    return url;
  }

  const withoutScheme = url.replace(/^file:/, "");
  const [pathPart, ...queryParts] = withoutScheme.split("?");
  if (!pathPart) {
    return url;
  }

  const absolutePath = path.isAbsolute(pathPart)
    ? pathPart
    : path.join(process.cwd(), pathPart);

  const normalized = absolutePath.replace(/\\/g, "/");
  const querySuffix = queryParts.length ? `?${queryParts.join("?")}` : "";
  return `file:${normalized}${querySuffix}`;
};

const absoluteDbPath = ensureDatabase();
const defaultDatasourceUrl = `file:${absoluteDbPath.replace(/\\/g, "/")}`;
const datasourceUrl = normalizeDatasourceUrl(process.env.DATABASE_URL) ?? defaultDatasourceUrl;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    datasourceUrl,
  });
}

export const prisma = globalForPrisma.prisma;
export const databasePath = absoluteDbPath;
