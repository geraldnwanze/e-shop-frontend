import type { Metadata } from "next";

import { UsersPage } from "@/components/admin/platform/UsersPage";

export const metadata: Metadata = { title: "Users" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;

  return <UsersPage initialTenant={sp.tenant} />;
}
