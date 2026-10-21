"use client";

import Link from "next/link";

import { useCustomer } from "@/lib/hooks/use-customer";

export function AccountLink({ className = "" }: { className?: string }) {
  const { data: customer } = useCustomer();

  return customer ? (
    <Link href="/account" className={`whitespace-nowrap text-sm font-medium ${className}`}>
      Hi, {customer.firstName}
    </Link>
  ) : (
    <Link href="/account/login" className={`whitespace-nowrap text-sm font-medium ${className}`}>
      Sign in
    </Link>
  );
}
