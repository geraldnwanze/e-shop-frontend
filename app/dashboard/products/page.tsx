import type { Metadata } from "next";

import { ProductsList } from "@/components/admin/pages/ProductsList";

export const metadata: Metadata = { title: "Products" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;

  return <ProductsList initialLowStock={sp.low_stock === "1"} />;
}
