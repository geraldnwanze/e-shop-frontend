import type { Metadata } from "next";

import { AccountOrderView } from "@/components/store/AccountOrderView";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <AccountOrderView id={id} />;
}
