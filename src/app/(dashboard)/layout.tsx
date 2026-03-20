import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <section className="px-6 py-10">{children}</section>;
}
