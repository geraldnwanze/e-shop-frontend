import type { Metadata } from "next";

import { TenantsList } from "@/components/admin/platform/TenantsList";

export const metadata: Metadata = { title: "Tenants" };

export default function Page() {
  return <TenantsList />;
}
