import type { Metadata } from "next";

import { ShippingPage } from "@/components/admin/pages/ShippingPage";

export const metadata: Metadata = { title: "Shipping" };

export default function Page() {
  return <ShippingPage />;
}
