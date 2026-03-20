import { PropsWithChildren } from "react";
import clsx from "clsx";

export function Card({
  title,
  description,
  className,
  children,
}: PropsWithChildren<{
  title?: string;
  description?: string;
  className?: string;
}>) {
  return (
    <section className={clsx("rounded-xl border border-slate-800/30 bg-slate-900/40 p-6", className)}>
      {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
      {description && (
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      )}
      {children && <div className="mt-4 space-y-4 text-slate-100">{children}</div>}
    </section>
  );
}
