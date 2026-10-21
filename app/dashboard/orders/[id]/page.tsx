import type { Metadata } from "next";

import { OrderDetail } from "@/components/admin/pages/OrderDetail";

export const metadata: Metadata = { title: "Order" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <OrderDetail orderId={id} />;
}
