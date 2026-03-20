import { PropsWithChildren } from "react";

export function WizardShell({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          App Incubator
        </p>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="text-base text-slate-300">{subtitle}</p>
      </header>

      <main className="grid grid-cols-1 gap-6 md:grid-cols-[2fr,1fr]">
        {children}
      </main>
    </div>
  );
}
