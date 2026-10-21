"use client";

import { useEffect } from "react";

import { Container } from "@/components/ui/Container";
import { normalizeCode, RECOVERY_CODE_KEY } from "@/lib/recovery-code";

import { CART_STORAGE_KEY } from "./CartProvider";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lands from a reminder email: remember that cart (and any discount code) in this browser and open the cart. */
export function RecoverCart({ cartId, code }: { cartId: string; code?: string }) {
  useEffect(() => {
    try {
      if (UUID.test(cartId)) window.localStorage.setItem(CART_STORAGE_KEY, cartId);

      const discount = normalizeCode(code);
      if (discount) window.localStorage.setItem(RECOVERY_CODE_KEY, discount);
    } catch {
      /* storage unavailable: the cart page will simply be empty */
    }

    window.location.replace("/cart");
  }, [cartId, code]);

  return <Container className="py-16"><p role="status">Opening your cart…</p></Container>;
}
