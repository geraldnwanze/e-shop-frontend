import type { Metadata } from "next";

import { ProductEditor } from "@/components/admin/pages/ProductEditor";

export const metadata: Metadata = { title: "New product" };

export default function Page() {
  return <ProductEditor />;
}
