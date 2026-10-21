import type { Metadata } from "next";

import { PaymentStatus } from "@/components/store/PaymentStatus";

export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

export default async function PaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.reference) ? sp.reference[0] : sp.reference;
  // Our references are pay_<alnum>; anything else is ignored rather than forwarded.
  const reference = raw && /^pay_[a-z0-9]{8,64}$/.test(raw) ? raw : null;

  return <PaymentStatus reference={reference} />;
}
