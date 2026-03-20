import { z } from "zod";

const envSchema = z.object({
  OPENCLAW_HOME: z.string().default("/root/.openclaw"),
  APP_DB_PATH: z.string().default("./db/app.db"),
  AUTOMATION_ENGINE_BIN: z.string().default("openclaw"),
  CLAUDE_AGENT_ID: z.string().default("percy"),
  AUTOMATION_LOG_DIR: z.string().default("./db/logs"),
  DRY_RUN_AUTOMATION: z.string().default("true"),
  DATABASE_URL: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export const env = envSchema.parse({
  ...process.env,
});
