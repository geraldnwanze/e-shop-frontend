import type { Metadata } from "next";

import { DomainsAdminPage } from "@/components/admin/platform/DomainsAdminPage";

export const metadata: Metadata = { title: "Domains" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;

  return <DomainsAdminPage initialStatus={sp.status} />;
}
