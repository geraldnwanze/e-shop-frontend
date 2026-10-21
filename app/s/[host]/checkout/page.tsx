import type { Metadata } from "next";

import { CheckoutForm } from "@/components/store/CheckoutForm";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { requireStore } from "@/lib/store-page";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const { bundle } = await requireStore(host);
  const { checkout } = bundle.settings;

  if (bundle.acceptingOrders === false) {
    return (
      <Container className="max-w-xl py-16 text-center">
        <h1 className="font-heading text-3xl">Checkout isn&apos;t open yet</h1>
        <p className="mt-3 opacity-70">This store is still getting set up and isn&apos;t taking orders right now. Please check back soon.</p>
        <ButtonLink href="/products" className="mt-8">Keep browsing</ButtonLink>
      </Container>
    );
  }

  return <CheckoutForm requirePhone={checkout.require_phone} allowGuest={checkout.allow_guest_checkout} shippingFlatRate={checkout.shipping_flat_rate ?? 0} />;
}
