import type { Metadata } from "next";

import { DomainsPage } from "@/components/admin/pages/DomainsPage";

export const metadata: Metadata = { title: "Domains" };

export default function Page() {
  return <DomainsPage />;
}
