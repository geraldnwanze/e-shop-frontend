import type { Metadata } from "next";

import { PagesPage } from "@/components/admin/pages/PagesPage";

export const metadata: Metadata = { title: "Pages" };

export default function Page() {
  return <PagesPage />;
}
