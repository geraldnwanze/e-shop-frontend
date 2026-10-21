import type { Metadata } from "next";

import { SegmentsPage } from "@/components/admin/pages/SegmentsPage";

export const metadata: Metadata = { title: "Customer segments" };

export default function Page() {
  return <SegmentsPage />;
}
