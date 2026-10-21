import type { Metadata } from "next";

import { StoresPage } from "@/components/admin/platform/StoresPage";

export const metadata: Metadata = { title: "Stores" };

export default function Page() {
  return <StoresPage />;
}
