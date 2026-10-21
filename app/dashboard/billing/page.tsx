import type { Metadata } from "next";

import { BillingPage } from "@/components/admin/pages/BillingPage";

export const metadata: Metadata = { title: "Billing" };

export default function Page() {
  return <BillingPage />;
}
