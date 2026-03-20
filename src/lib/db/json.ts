import { Prisma } from "@prisma/client";

type Jsonish = Prisma.JsonValue | string | null | undefined;

function parseJson(value: Jsonish): unknown {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    if (value.trim() === "") {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

export function jsonArray<T>(value: Jsonish): T[] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((item): item is T => item !== undefined && item !== null);
}

export function jsonObject<T extends Record<string, unknown>>(value: Jsonish): T | null {
  const parsed = parseJson(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as T;
  }
  return null;
}

export function serializeJson(value: unknown, fallback: unknown = null): string {
  const target = value === undefined ? fallback : value;
  try {
    return JSON.stringify(target);
  } catch {
    return JSON.stringify(fallback);
  }
}
