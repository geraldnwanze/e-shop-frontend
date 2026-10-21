import type { Metadata } from "next";

import { CampaignsPage } from "@/components/admin/pages/CampaignsPage";

export const metadata: Metadata = { title: "Email campaigns" };

export default function Page() {
  return <CampaignsPage />;
}
