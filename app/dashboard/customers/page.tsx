import type { Metadata } from "next";

import { CustomersList } from "@/components/admin/pages/CustomersList";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return <CustomersList />;
}
