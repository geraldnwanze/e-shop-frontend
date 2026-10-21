import type { Metadata } from "next";

import { TrackOrderForm } from "@/components/store/TrackOrderForm";

export const metadata: Metadata = { title: "Track your order", robots: { index: false, follow: false } };

export default function TrackPage() {
  return <TrackOrderForm />;
}
