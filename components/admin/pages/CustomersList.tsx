"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage, useStore } from "@/lib/admin/hooks";
import type { CustomerSegment } from "@/lib/admin/segments";
import type { AdminCustomer } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounced";

import { Pager } from "../Pager";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, TextInput, tableClasses } from "../ui";

export function CustomersList() {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const { data: store } = useStore();
  const currency = store?.currency ?? "NGN";
  const segments = useQuery({ queryKey: ["customer-segments"], queryFn: () => adminApi.get<CustomerSegment[]>("customer-segments") });
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["customers", debounced, segment, page], queryFn: () => adminApi.list<AdminCustomer>("customers", { search: debounced, segment, page }) });

  return (
    <>
      <PageHeader title="Customers" description="People who have ordered from or registered with your store." actions={<ButtonLink href="/dashboard/customers/segments" variant="secondary">Segments</ButtonLink>} />
      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-[1fr_16rem]">
          <TextInput label="Search" type="search" placeholder="Name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {segments.data && segments.data.length > 0 ? <Select label="Segment" value={segment} onChange={(e) => { setSegment(e.target.value); setPage(1); }}><option value="">Everyone</option>{segments.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select> : null}
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? (
          <EmptyState title={debounced ? "No customers match your search" : "No customers yet"} description={debounced ? undefined : "Customers appear after their first order or sign-up."} />
        ) : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Customer</th><th className={tableClasses.th}>Account</th><th className={`${tableClasses.th} text-right`}>Orders</th><th className={`${tableClasses.th} text-right`}>Spent</th><th className={tableClasses.th}>Last order</th><th className={tableClasses.th}>Joined</th></tr></thead>
                <tbody>
                  {data?.items.map((c) => (
                    <tr key={c.id}>
                      <td className={tableClasses.td}><span className="font-medium">{c.firstName} {c.lastName}</span><span className="block text-xs text-neutral-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}</span></td>
                      <td className={tableClasses.td}><Badge tone={c.hasAccount ? "green" : "neutral"}>{c.hasAccount ? "Registered" : "Guest"}</Badge></td>
                      <td className={`${tableClasses.td} text-right`}>{c.ordersCount ?? 0}</td>
                      <td className={`${tableClasses.td} text-right`}>{formatMoney(c.totalSpent ?? 0, currency)}</td>
                      <td className={tableClasses.td}>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "—"}</td>
                      <td className={tableClasses.td}>{new Date(c.createdAt).toLocaleDateString()}</td>
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
