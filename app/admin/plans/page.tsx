import type { Metadata } from "next";

import { PlansPage } from "@/components/admin/platform/PlansPage";

export const metadata: Metadata = { title: "Plans" };

export default function Page() {
  return <PlansPage />;
}
