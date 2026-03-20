import { ReactNode } from "react";
import { WizardShell } from "@/components/layouts/wizard-shell";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-transparent">
      <WizardShell
        title="Workspace onboarding"
        subtitle="Validate a local workspace, ingest metadata, and launch an automation run."
      >
        {children}
      </WizardShell>
    </div>
  );
}
