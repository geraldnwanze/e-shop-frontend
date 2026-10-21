"use client";

import Link from "next/link";

import { useCart } from "./CartProvider";

export function CartLink({ className = "" }: { className?: string }) {
  const { itemCount } = useCart();

  return (
    <Link href="/cart" className={`relative inline-flex items-center gap-1.5 text-sm font-medium ${className}`} aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
        <path d="M6 6h15l-1.5 9h-12L5 3H2M9 20a1 1 0 100 .01M18 20a1 1 0 100 .01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Cart</span>
      {itemCount > 0 ? <span className="rounded-full bg-accent px-1.5 text-xs font-bold text-accent-fg">{itemCount}</span> : null}
    </Link>
  );
}
