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

const absoluteDbPath = ensureDatabase();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ?? `file:${absoluteDbPath.replace(/\\/g, "/")}`,
  });
}

export const prisma = globalForPrisma.prisma;
export const databasePath = absoluteDbPath;
