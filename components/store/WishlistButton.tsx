"use client";

import Link from "next/link";

import { useCustomer } from "@/lib/hooks/use-customer";
import { useToggleWishlist, useWishlist } from "@/lib/hooks/use-wishlist";

/** Save-for-later toggle. Signed-out shoppers are sent to sign in. */
export function WishlistButton({ productId }: { productId: string }) {
  const { data: customer } = useCustomer();
  const wishlist = useWishlist();
  const toggle = useToggleWishlist();

  if (!customer) return <Link href="/account/login" className="text-sm underline underline-offset-4">Sign in to save for later</Link>;

  const saved = wishlist.data?.some((p) => p.id === productId) ?? false;

  return (
    <button type="button" aria-pressed={saved} disabled={toggle.isPending || wishlist.isLoading} onClick={() => toggle.mutate({ productId, saved })} className="text-sm underline underline-offset-4 disabled:opacity-50">
      {saved ? "♥ Saved to wishlist" : "♡ Save for later"}
    </button>
  );
}
