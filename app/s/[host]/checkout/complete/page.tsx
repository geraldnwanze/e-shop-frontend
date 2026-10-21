import type { Metadata } from "next";

import { OrderComplete } from "@/components/store/OrderComplete";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false, follow: false } };

export default function CompletePage() {
  return <OrderComplete />;
}
