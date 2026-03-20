"use client";

import { FormEvent, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import {
  validateWorkspaceAction,
  ingestWorkspaceAction,
} from "@/lib/actions/onboarding";

type ValidationSummary = {
  sessionId: string;
  status: string;
  normalizedPath: string;
  warnings: string[];
  errors: string[];
};

type IngestSummary = {
  sessionId: string;
  agents: { id: string; slug: string; workspacePath: string }[];
  runs: { id: string; agentId: string }[];
};

export function WorkspaceForm() {
  const [workspacePath, setWorkspacePath] = useState("/root/.openclaw/workspaces/demo");
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);
  const [intent, setIntent] = useState("Scan workspace and register discovered agents");
  const [dryRun, setDryRun] = useState(true);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [ingestSummary, setIngestSummary] = useState<IngestSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateAction = useAction(validateWorkspaceAction);
  const ingestAction = useAction(ingestWorkspaceAction);

  const handleValidate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIngestSummary(null);

    const result = await validateAction.executeAsync({ workspacePath, acknowledgeRisk });
    if (result?.data) {
      setValidationSummary(result.data as ValidationSummary);
    } else if (result?.serverError) {
      setValidationSummary(null);
      setErrorMessage(result.serverError.message);
    }
  };

  const handleIngest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!validationSummary?.sessionId) {
      setErrorMessage("Validate a workspace before running ingestion.");
      return;
    }

    const result = await ingestAction.executeAsync({
      sessionId: validationSummary.sessionId,
      intent,
      dryRun,
    });

    if (result?.data) {
      setIngestSummary(result.data as IngestSummary);
    } else if (result?.serverError) {
      setIngestSummary(null);
      setErrorMessage(result.serverError.message);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
      <form className="space-y-4" onSubmit={handleValidate}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="workspacePath">
            Workspace path
          </label>
          <input
            id="workspacePath"
            name="workspacePath"
            value={workspacePath}
            onChange={(event) => setWorkspacePath(event.target.value)}
            className="w-full rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            placeholder="/root/.openclaw/workspaces/my-app"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-700 bg-slate-900"
            checked={acknowledgeRisk}
            onChange={(event) => setAcknowledgeRisk(event.target.checked)}
          />
          I acknowledge this path grants automation access to the filesystem
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-muted)]"
          disabled={validateAction.isPending}
        >
          {validateAction.isPending ? "Validating…" : "Validate workspace"}
        </button>
      </form>

      {validationSummary && (
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 text-sm">
          <p className="font-semibold text-white">Session {validationSummary.sessionId}</p>
          <p className="text-slate-300">Normalized path: {validationSummary.normalizedPath}</p>
          <p className="text-slate-400">Status: {validationSummary.status}</p>
          {validationSummary.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="font-medium text-rose-300">Blocking issues</p>
              <ul className="list-disc space-y-1 pl-5 text-rose-200">
                {validationSummary.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validationSummary.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="font-medium text-amber-300">Warnings</p>
              <ul className="list-disc space-y-1 pl-5 text-amber-200">
                {validationSummary.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form className="space-y-4 border-t border-slate-800/60 pt-4" onSubmit={handleIngest}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="intent">
            Automation intent
          </label>
          <textarea
            id="intent"
            name="intent"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            className="w-full rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            rows={3}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-700 bg-slate-900"
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
          />
          Dry-run (log plan without applying changes)
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-muted)]/30"
          disabled={
            ingestAction.isPending ||
            !validationSummary?.sessionId ||
            Boolean(validationSummary?.errors.length)
          }
        >
          {ingestAction.isPending ? "Queueing…" : "Queue ingestion"}
        </button>
      </form>

      {ingestSummary && (
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-4 text-sm text-emerald-100">
          <p className="font-semibold">Queued {ingestSummary.agents.length} agents</p>
          <ul className="mt-2 space-y-1 text-emerald-200">
            {ingestSummary.agents.map((agent) => (
              <li key={agent.id} className="font-mono text-xs">
                {agent.slug} → {agent.workspacePath}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorMessage && <p className="text-sm text-rose-300">{errorMessage}</p>}
    </div>
  );
}
