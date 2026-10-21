import type { Metadata } from "next";

import { DiscountsPage } from "@/components/admin/pages/DiscountsPage";

export const metadata: Metadata = { title: "Discounts" };

export default function Page() {
  return <DiscountsPage />;
}
