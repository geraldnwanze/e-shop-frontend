import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminProviders } from "@/components/admin/AdminProviders";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-bff";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Dashboard" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Cheap server-side gate (no cookie, no dashboard). The session itself is validated by the API on every call.
  if (!(await cookies()).has(ADMIN_SESSION_COOKIE)) redirect("/login");

  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}
