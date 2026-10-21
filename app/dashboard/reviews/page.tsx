import type { Metadata } from "next";

import { ReviewsPage } from "@/components/admin/pages/ReviewsPage";

export const metadata: Metadata = { title: "Reviews" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;

  return <ReviewsPage initialStatus={sp.status} />;
}
