"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage, useStore } from "@/lib/admin/hooks";
import type { AdminProduct } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounced";

import { Pager } from "../Pager";
import { Card, EmptyState, ErrorState, PageHeader, Select, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

export function ProductsList({ initialLowStock = false }: { initialLowStock?: boolean }) {
  const { data: store } = useStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [lowStock, setLowStock] = useState(initialLowStock);
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products", { search: debounced, status, lowStock, page }],
    queryFn: () => adminApi.list<AdminProduct>("products", { search: debounced, status, low_stock: lowStock, page }),
  });

  const currency = store?.currency ?? "NGN";
  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <>
      <PageHeader title="Products" description="Everything you sell." actions={<ButtonLink href="/dashboard/products/create">Add product</ButtonLink>} />

      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <TextInput label="Search" type="search" placeholder="Name or SKU" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
          <Select label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
            <option value="">All</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </Select>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={lowStock} onChange={(e) => reset(setLowStock)(e.target.checked)} /> Low stock only</label>
        </div>

        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? (
          <EmptyState title={debounced || status || lowStock ? "No products match your filters" : "No products yet"} description={debounced || status || lowStock ? undefined : "Add your first product to start selling."} action={!debounced && !status && !lowStock ? <ButtonLink href="/dashboard/products/create">Add product</ButtonLink> : undefined} />
        ) : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr>
                  <th className={tableClasses.th}>Product</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Category</th>
                  <th className={`${tableClasses.th} text-right`}>Price</th><th className={`${tableClasses.th} text-right`}>Stock</th>
                </tr></thead>
                <tbody>
                  {data?.items.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className={tableClasses.td}>
                        <Link href={`/dashboard/products/${p.id}`} className="flex items-center gap-3">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100">
                            {p.images[0]?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </span>
                          <span><span className="block font-medium">{p.name}</span>{p.variants.length > 0 ? <span className="text-xs text-neutral-500">{p.variants.length} variants</span> : p.sku ? <span className="text-xs text-neutral-500">{p.sku}</span> : null}</span>
                        </Link>
                      </td>
                      <td className={tableClasses.td}><StatusBadge status={p.status} /></td>
                      <td className={tableClasses.td}>{p.category?.name ?? <span className="text-neutral-400">—</span>}</td>
                      <td className={`${tableClasses.td} text-right`}>{formatMoney(p.price, currency)}</td>
                      <td className={`${tableClasses.td} text-right`}>{!p.trackInventory ? <span className="text-neutral-400">Not tracked</span> : <span className={p.stock <= 5 ? "font-semibold text-amber-700" : ""}>{p.stock}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>
    </>
  );
}
