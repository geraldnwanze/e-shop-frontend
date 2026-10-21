import type { Metadata } from "next";

import { OrdersList } from "@/components/admin/pages/OrdersList";

export const metadata: Metadata = { title: "Orders" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;

  return <OrdersList initial={{ status: sp.status, payment_status: sp.payment_status }} />;
}
