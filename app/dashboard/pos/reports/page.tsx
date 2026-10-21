import type { Metadata } from "next";

import { PosReportsPage } from "@/components/admin/pages/PosReportsPage";

export const metadata: Metadata = { title: "POS reports" };

export default function Page() {
  return <PosReportsPage />;
}
