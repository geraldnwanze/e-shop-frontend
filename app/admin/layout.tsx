import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminProviders } from "@/components/admin/AdminProviders";
import { PlatformShell } from "@/components/admin/PlatformShell";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-bff";

export const metadata: Metadata = { title: { default: "Platform console", template: "%s · Platform console" }, robots: { index: false, follow: false } };

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  if (!(await cookies()).has(ADMIN_SESSION_COOKIE)) redirect("/login");

  return (
    <AdminProviders>
      <PlatformShell>{children}</PlatformShell>
    </AdminProviders>
  );
}
