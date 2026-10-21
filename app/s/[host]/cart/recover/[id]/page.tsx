import type { Metadata } from "next";

import { RecoverCart } from "@/components/cart/RecoverCart";

export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

export default async function RecoverCartPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ code?: string | string[] }> }) {
  const { id } = await params;
  const { code } = await searchParams;

  return <RecoverCart cartId={id} code={Array.isArray(code) ? code[0] : code} />;
}
