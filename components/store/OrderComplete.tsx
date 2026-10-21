"use client";

import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { ButtonLink } from "@/components/ui/Button";
import { StatusCard } from "@/components/store/PageBanner";

/** Confirmation for orders that needed no online payment (e.g. fully discounted). */
export function OrderComplete() {
  const { reset } = useCart();
  const [order, setOrder] = useState<{ orderNumber: string } | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder(JSON.parse(window.sessionStorage.getItem("sf:lastOrder") ?? "null"));
    } catch {
      /* ignore */
    }
    reset();
  }, [reset]);

  return (
    <StatusCard
      tone="success"
      title={order ? `Order ${order.orderNumber} confirmed` : "Order confirmed"}
      actions={<><ButtonLink href="/products">Continue shopping</ButtonLink><ButtonLink href="/orders/track" variant="secondary">Track order</ButtonLink></>}
    >
      Thank you! We&apos;ve emailed you the details.
    </StatusCard>
  );
}
