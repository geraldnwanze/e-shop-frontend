import type { Metadata } from "next";

import { CartView } from "@/components/store/CartView";
import { requireStore } from "@/lib/store-page";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

export default async function CartPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const { bundle } = await requireStore(host);

  return <CartView whatsapp={bundle.settings.whatsapp} />;
}
