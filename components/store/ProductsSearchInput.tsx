"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useDebounced } from "@/lib/use-debounced";

/**
 * The product list's search box. The list refreshes as you type (after a short pause) instead of waiting
 * for Enter; the other filters in `keep` are carried along and paging starts again from page one.
 */
export function ProductsSearchInput({ initial, keep, className = "", placeholder = "Search products", id = "q" }: { initial: string; keep: Record<string, string | undefined>; className?: string; placeholder?: string; id?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const term = useDebounced(value.trim(), 350);
  const last = useRef(initial.trim());

  useEffect(() => {
    if (term === last.current) return;
    last.current = term;

    const query = new URLSearchParams();
    for (const [key, v] of Object.entries(keep)) if (v) query.set(key, v);
    if (term) query.set("search", term);
    const qs = query.toString();

    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }, [term, keep, pathname, router]);

  return (
    <div className="relative">
      <input id={id} name="search" type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} autoComplete="off" className={className} />
      <span role="status" aria-live="polite" className="sr-only">{pending ? "Updating results" : ""}</span>
      {pending ? <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" /> : null}
    </div>
  );
}
