"use client";

import type { Meta } from "@/lib/admin/types";

export function Pager({ meta, onPage }: { meta: Meta; onPage: (page: number) => void }) {
  const current = meta.currentPage ?? 1;
  const last = meta.lastPage ?? 1;
  if (last <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between border-t border-black/[0.06] px-5 py-3.5 text-sm">
      <span className="text-neutral-500">Page {current} of {last}{typeof meta.total === "number" ? ` · ${meta.total} total` : ""}</span>
      <span className="flex gap-2">
        <button type="button" disabled={current <= 1} onClick={() => onPage(current - 1)} className="rounded-lg border border-black/10 bg-white px-3.5 py-1.5 font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40">Previous</button>
        <button type="button" disabled={current >= last} onClick={() => onPage(current + 1)} className="rounded-lg border border-black/10 bg-white px-3.5 py-1.5 font-medium transition-colors hover:bg-neutral-50 disabled:opacity-40">Next</button>
      </span>
    </nav>
  );
}
