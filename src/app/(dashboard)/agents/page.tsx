import { prisma } from "@/lib/db/client";
import { jsonArray } from "@/lib/db/json";

async function getAgents() {
  try {
    return await prisma.agent.findMany({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    console.warn("Failed to load agents", error);
    return [];
  }
}

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Catalog</p>
        <h1 className="text-3xl font-semibold text-white">Agents</h1>
        <p className="text-sm text-slate-300">
          API stubs return this catalog while the orchestration is wired up.
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/50">
        <table className="min-w-full divide-y divide-slate-800/80 text-sm">
          <thead className="bg-slate-900/70 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-100">
            {agents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Run `pnpm db:seed` to add sample agents.
                </td>
              </tr>
            )}
            {agents.map((agent) => {
              const tags = jsonArray<string>(agent.tags);
              return (
                <tr key={agent.id}>
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{agent.slug}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {tags.length ? tags.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(agent.updatedAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
