import os from "node:os";
import process from "node:process";
import { NextResponse } from "next/server";
import { databasePath } from "@/lib/db/client";

export async function GET() {
  return NextResponse.json({
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()}`,
    databasePath,
    todo: "Add checks for prisma migrations, CLI availability, and agent health",
  });
}
