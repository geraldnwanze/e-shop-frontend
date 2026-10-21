"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { adminApi } from "@/lib/admin/client";
import type { Tenant } from "@/lib/admin/platform-types";
import { useDebounced } from "@/lib/use-debounced";

/**
 * Pick one tenant by typing part of its name or slug. Stays usable with thousands of tenants:
 * only the best few matches are ever fetched.
 */
export function TenantPicker({ label, value, onChange }: { label: string; value: string; onChange: (tenantId: string) => void }) {
  const id = useId();
  const listId = `${id}-list`;
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebounced(term.trim());

  const selected = useQuery({ queryKey: ["platform", "tenant", value], enabled: value !== "", queryFn: () => adminApi.get<Tenant>(`admin/tenants/${value}`) });
  const matches = useQuery({
    queryKey: ["platform", "tenant-picker", debounced],
    enabled: open && value === "",
    queryFn: () => adminApi.list<Tenant>("admin/tenants", { search: debounced, per_page: 8 }),
  });
  const options = matches.data?.items ?? [];

  function choose(tenant: Tenant) {
    onChange(tenant.id);
    setTerm("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-800">{label}</label>

      {value !== "" ? (
        <div className="flex min-h-[2.75rem] items-center justify-between gap-2 rounded-lg border border-black/15 bg-white px-3.5 py-2 text-sm">
          <span className="truncate font-medium">{selected.data?.name ?? "Loading…"}<span className="ml-2 font-normal text-neutral-500">{selected.data?.slug}</span></span>
          <button type="button" aria-label={`Clear ${label.toLowerCase()} filter`} className="rounded-md px-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" onClick={() => onChange("")}>✕</button>
        </div>
      ) : (
        <>
          <input
            id={id}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${id}-${options[active].id}` : undefined}
            autoComplete="off"
            placeholder="Search by name or slug"
            value={term}
            onChange={(e) => { setTerm(e.target.value); setActive(0); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter" && open && options[active]) { e.preventDefault(); choose(options[active]); }
              else if (e.key === "Escape") setOpen(false);
            }}
            className="w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 hover:border-black/25 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand/30"
          />
          {open ? (
            <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-black/10 bg-white p-1 shadow-[0_18px_40px_-14px_rgb(20_10_90/0.35)]">
              {matches.isLoading ? <li className="px-3 py-2 text-sm text-neutral-500">Searching…</li> : options.length === 0 ? <li className="px-3 py-2 text-sm text-neutral-500">No tenants found</li> : options.map((tenant, i) => (
                <li key={tenant.id} id={`${id}-${tenant.id}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); choose(tenant); }} onMouseEnter={() => setActive(i)} className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? "bg-brand-soft" : ""}`}>
                  <span className="font-medium">{tenant.name}</span><span className="ml-2 text-neutral-500">{tenant.slug}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
