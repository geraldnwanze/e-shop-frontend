"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusCard } from "@/components/store/PageBanner";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { isSafeRedirect } from "@/lib/checkout";
import { formatMoney } from "@/lib/money";
import type { PaymentInit, PaymentVerification } from "@/lib/types";

const MAX_POLLS = 8;

interface Stored {
  id: string;
  orderNumber: string;
  email: string;
  total: number;
  currency: string;
}

function readLastOrder(): Stored | null {
  try {
    return JSON.parse(window.sessionStorage.getItem("sf:lastOrder") ?? "null");
  } catch {
    return null;
  }
}

/**
 * Landing page after the provider redirects back. The redirect is NOT proof of
 * payment: we ask our backend, which asks the provider, and only trust that.
 */
export function PaymentStatus({ reference }: { reference: string | null }) {
  const { reset } = useCart();
  const [last, setLast] = useState<Stored | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLast(readLastOrder());
  }, []);

  const query = useQuery({
    queryKey: ["payment", reference],
    enabled: reference !== null,
    queryFn: () => api.get<PaymentVerification>(`payments/${encodeURIComponent(reference as string)}/verify`),
    // The webhook may arrive slightly after the redirect: poll while still pending.
    refetchInterval: (q) => (q.state.data?.paymentStatus === "PENDING" && q.state.dataUpdateCount < MAX_POLLS ? 3000 : false),
  });

  const status = query.data?.paymentStatus;

  useEffect(() => {
    if (status === "PAID") reset();
  }, [status, reset]);

  async function retry() {
    if (!last) return;
    setRetryError(null);
    try {
      const init = await api.post<PaymentInit>("payments/initialize", { order_id: last.id, email: last.email }, { idempotencyKey: `pay-${last.id}-${Date.now()}` });
      if (init.requiresPayment && isSafeRedirect(init.payment?.authorizationUrl)) window.location.assign(init.payment.authorizationUrl);
    } catch (e) {
      setRetryError(e instanceof ApiError ? e.message : "Could not restart the payment.");
    }
  }

  const shell = (title: string, body: React.ReactNode, actions?: React.ReactNode, tone: "success" | "warn" | "error" | "neutral" = "neutral") => (
    <StatusCard tone={tone} title={title} actions={actions}>{body}</StatusCard>
  );

  if (reference === null) {
    return last
      ? shell(`Order ${last.orderNumber} awaiting payment`, <>Total {formatMoney(last.total, last.currency)}.</>, <Button onClick={retry}>Pay now</Button>)
      : shell("No payment to show", "We couldn't find a recent payment on this device.", <ButtonLink href="/orders/track">Track an order</ButtonLink>);
  }

  if (query.isLoading) return shell("Confirming your payment…", "Please don't close this page.");

  if (query.error) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return shell(notFound ? "Payment not found" : "We couldn't confirm your payment", notFound ? "This payment link is not valid for this store." : "Please try again in a moment.", <Button onClick={() => query.refetch()}>Check again</Button>);
  }

  if (status === "PAID") {
    return shell(`Thank you! Order ${query.data?.orderNumber} is confirmed`, "Payment received. We've emailed you the details.", <><ButtonLink href="/products">Continue shopping</ButtonLink><ButtonLink href="/orders/track" variant="secondary">Track order</ButtonLink></>, "success");
  }

  if (status === "FAILED") {
    return shell("Payment didn't go through", <>{retryError ?? "Your card was not charged. You can try again."}</>, <>{last ? <Button onClick={retry}>Try again</Button> : null}<ButtonLink href="/orders/track" variant="secondary">Track order</ButtonLink></>, "error");
  }

  return shell(
    `Order ${query.data?.orderNumber} is awaiting payment confirmation`,
    "We haven't received confirmation from the payment provider yet. This can take a minute. We'll email you as soon as it's confirmed.",
    <><Button onClick={() => query.refetch()}>Check again</Button><ButtonLink href="/orders/track" variant="secondary">Track order</ButtonLink></>,
    "warn",
  );
}
