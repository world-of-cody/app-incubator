import { RunFlowButton } from "@/components/agents/run-flow-button";
import { prisma } from "@/lib/db/client";
import { jsonArray } from "@/lib/db/json";
import { env } from "@/lib/env";

const DEFAULT_INTENT = "Generate onboarding plan for incubation";

async function getAgents() {
  try {
    return await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        automationRuns: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  } catch (error) {
    console.warn("Failed to load agents", error);
    return [];
  }
}

export default async function AgentsPage() {
  const agents = await getAgents();
  const dryRunDefault = (env.DRY_RUN_AUTOMATION ?? "true").toLowerCase() !== "false";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Catalog</p>
        <h1 className="text-3xl font-semibold text-white">Agents</h1>
        <p className="text-sm text-slate-300">
          Inspect discovered agents, review their last automation run, and trigger a fresh dry-run
          directly from the dashboard.
        </p>
      </header>

      {agents.length === 0 && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 text-center text-slate-400">
          <p>No agents have been ingested yet.</p>
          <p className="text-xs">Run `pnpm db:seed` or complete the onboarding flow to import real agents.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => {
          const roles = jsonArray<string>(agent.roles);
          const tags = jsonArray<string>(agent.tags);
          const latestRun = agent.automationRuns?.[0];
          const status = latestRun?.status ?? "IDLE";

          return (
            <div
              key={agent.id}
              className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Agent</p>
                  <h2 className="text-xl font-semibold text-white">{agent.name}</h2>
                  <p className="text-xs text-slate-400">{agent.description ?? "No description provided"}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    status === "SUCCEEDED"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : status === "FAILED"
                      ? "bg-rose-500/10 text-rose-300"
                      : status === "RUNNING"
                      ? "bg-amber-500/10 text-amber-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {status}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div>
                  <dt className="font-semibold text-slate-400">Slug</dt>
                  <dd className="font-mono text-[11px] text-slate-300">{agent.slug}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Workspace</dt>
                  <dd className="font-mono text-[11px] text-slate-300 truncate" title={agent.workspacePath}>
                    {agent.workspacePath}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Roles</dt>
                  <dd>{roles.length ? roles.join(", ") : "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Tags</dt>
                  <dd>{tags.length ? tags.join(", ") : "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Last run</dt>
                  <dd>
                    {latestRun
                      ? `${latestRun.status} · ${latestRun.finishedAt ? new Date(latestRun.finishedAt).toLocaleString() : "in progress"}`
                      : "Never"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-400">Run summary</dt>
                  <dd className="block overflow-hidden text-ellipsis text-slate-200" title={latestRun?.outputSummary ?? undefined}>
                    {latestRun?.outputSummary ?? "No automation output yet."}
                  </dd>
                </div>
              </dl>

              <RunFlowButton
                agentId={agent.id}
                agentName={agent.name}
                agentSlug={agent.slug}
                defaultIntent={latestRun?.intent ?? DEFAULT_INTENT}
                workspacePath={agent.workspacePath}
                dryRunDefault={dryRunDefault}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
