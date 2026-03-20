"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type RunFlowButtonProps = {
  agentId: string;
  agentName: string;
  agentSlug: string;
  defaultIntent: string;
  workspacePath?: string;
  dryRunDefault?: boolean;
};

export function RunFlowButton(props: RunFlowButtonProps) {
  const {
    agentId,
    agentName,
    agentSlug,
    defaultIntent,
    workspacePath,
    dryRunDefault = true,
  } = props;

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState(defaultIntent);
  const [dryRun, setDryRun] = useState(dryRunDefault);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/run-flow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            dryRun,
            workspacePath,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message ?? payload?.error ?? "Automation run failed");
        }

        setMessage(
          `Run ${payload.runId ?? "(unknown)"} ${payload.dryRun ? "(dry-run)" : ""} queued for ${agentSlug}`,
        );
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-800/70 bg-slate-900/30 p-3 text-sm text-slate-200">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Automation</p>
        <p className="font-semibold text-white">{agentName}</p>
      </div>
      <label className="flex flex-col space-y-1 text-xs">
        <span className="text-slate-400">Intent</span>
        <textarea
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          rows={2}
          className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-2 py-1 text-white"
        />
      </label>
      <label className="inline-flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={dryRun}
          onChange={(event) => setDryRun(event.target.checked)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-900"
        />
        Dry-run (record plan only)
      </label>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !intent.trim()}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-muted)] disabled:opacity-60"
      >
        {isPending ? "Running…" : "Run flow"}
      </button>
      {(message || error) && (
        <p className={`text-xs ${error ? "text-rose-300" : "text-emerald-300"}`}>
          {error ?? message}
        </p>
      )}
    </div>
  );
}
