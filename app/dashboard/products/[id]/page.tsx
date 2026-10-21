import type { Metadata } from "next";

import { ProductEditor } from "@/components/admin/pages/ProductEditor";

export const metadata: Metadata = { title: "Edit product" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProductEditor productId={id} />;
}
