import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { WorkspaceForm } from "@/components/onboarding/workspace-form";
import { Card } from "@/components/ui/card";

async function getAgents() {
  try {
    return await prisma.agent.findMany({ take: 3, orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.warn("Failed to load agents", error);
    return [];
  }
}

export default async function OnboardingPage() {
  const agents = await getAgents();

  return (
    <>
      <div className="space-y-6">
        <WorkspaceForm />
        <Card
          title="Execution context"
          description="These values are read from the environment and copied into each onboarding session."
        >
          <dl className="grid grid-cols-1 gap-4 text-sm text-slate-200 md:grid-cols-2">
            <div>
              <dt className="text-slate-400">OPENCLAW_HOME</dt>
              <dd className="font-mono text-slate-100">{env.OPENCLAW_HOME}</dd>
            </div>
            <div>
              <dt className="text-slate-400">CLAUDE_AGENT_ID</dt>
              <dd className="font-mono text-slate-100">{env.CLAUDE_AGENT_ID}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="space-y-4">
        <Card
          title="Recently registered agents"
          description="Server stubs return these while the automation wiring is completed."
          className="bg-slate-900/60"
        >
          <ul className="space-y-3">
            {agents.length === 0 && (
              <li className="text-sm text-slate-400">
                Run `pnpm db:seed` after installing dependencies to see sample data.
              </li>
            )}
            {agents.map((agent) => (
              <li key={agent.id} className="rounded-lg border border-slate-800/50 p-3">
                <p className="text-sm font-semibold text-white">{agent.name}</p>
                <p className="text-xs text-slate-400">{agent.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
