import type { Metadata } from "next";

import { AuditLogPage } from "@/components/admin/platform/AuditLogPage";

export const metadata: Metadata = { title: "Audit log" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;

  return <AuditLogPage initialTenant={sp.tenant} />;
}
