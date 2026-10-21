import type { Metadata } from "next";

import { SubscriptionsPage } from "@/components/admin/platform/SubscriptionsPage";

export const metadata: Metadata = { title: "Subscriptions" };

export default function Page() {
  return <SubscriptionsPage />;
}
