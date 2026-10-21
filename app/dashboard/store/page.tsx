import type { Metadata } from "next";

import { StoreDetails } from "@/components/admin/pages/StoreDetails";

export const metadata: Metadata = { title: "Store" };

export default function Page() {
  return <StoreDetails />;
}
