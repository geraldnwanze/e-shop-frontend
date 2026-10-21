import type { Metadata } from "next";

import { TenantDetail } from "@/components/admin/platform/TenantDetail";

export const metadata: Metadata = { title: "Tenant" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TenantDetail tenantId={id} />;
}
