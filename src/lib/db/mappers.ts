import type { Agent, AgentNote, AutomationRun } from "@prisma/client";
import { jsonArray, jsonObject } from "@/lib/db/json";

export type AgentRecord = Agent;
export type AutomationRunRecord = AutomationRun;
export type AgentNoteRecord = AgentNote;

export type AgentDTO = Omit<AgentRecord, "roles" | "tags" | "skillPaths" | "metadata"> & {
  roles: string[];
  tags: string[];
  skillPaths: string[];
  metadata: Record<string, unknown> | null;
};

export function toAgentDTO(agent: AgentRecord): AgentDTO {
  return {
    ...agent,
    roles: jsonArray<string>(agent.roles),
    tags: jsonArray<string>(agent.tags),
    skillPaths: jsonArray<string>(agent.skillPaths),
    metadata: jsonObject<Record<string, unknown>>(agent.metadata),
  };
}

export type AutomationRunDTO = AutomationRunRecord;
export type AgentNoteDTO = AgentNoteRecord;
