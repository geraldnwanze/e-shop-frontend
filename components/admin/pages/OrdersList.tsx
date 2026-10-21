"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import type { AdminOrder } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounced";

import { Pager } from "../Pager";
import { Card, EmptyState, ErrorState, Badge, PageHeader, Select, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"];
const PAYMENTS = ["PENDING", "PAID", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"];

export function OrdersList({ initial }: { initial: { status?: string; payment_status?: string } }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initial.status ?? "");
  const [paymentStatus, setPaymentStatus] = useState(initial.payment_status ?? "");
  const [channel, setChannel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["orders", { debounced, status, paymentStatus, channel, from, to, page }],
    queryFn: () => adminApi.list<AdminOrder>("orders", { search: debounced, status, payment_status: paymentStatus, channel, from, to: to ? `${to} 23:59:59` : "", page }),
  });

  const filtered = Boolean(debounced || status || paymentStatus || channel || from || to);
  const set = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <>
      <PageHeader title="Orders" description="Track and fulfil customer orders." />
      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <TextInput label="Search" type="search" placeholder="Order #, name or email" value={search} onChange={(e) => set(setSearch)(e.target.value)} className="lg:col-span-1" />
          <Select label="Order status" value={status} onChange={(e) => set(setStatus)(e.target.value)}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}</Select>
          <Select label="Payment" value={paymentStatus} onChange={(e) => set(setPaymentStatus)(e.target.value)}><option value="">All</option>{PAYMENTS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}</Select>
          <Select label="Channel" value={channel} onChange={(e) => set(setChannel)(e.target.value)}><option value="">All</option><option value="online">Online</option><option value="pos">In store</option></Select>
          <TextInput label="From" type="date" value={from} onChange={(e) => set(setFrom)(e.target.value)} />
          <TextInput label="To" type="date" value={to} onChange={(e) => set(setTo)(e.target.value)} />
        </div>

        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? (
          <EmptyState title={filtered ? "No orders match your filters" : "No orders yet"} description={filtered ? undefined : "Orders appear here as soon as customers check out."} />
        ) : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Order</th><th className={tableClasses.th}>Date</th><th className={tableClasses.th}>Customer</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Payment</th><th className={`${tableClasses.th} text-right`}>Total</th></tr></thead>
                <tbody>
                  {data?.items.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50">
                      <td className={tableClasses.td}><Link href={`/dashboard/orders/${o.id}`} className="font-semibold text-brand hover:underline">{o.orderNumber}</Link>{o.channel === "pos" ? <span className="ml-2 align-middle"><Badge tone="blue">in store</Badge></span> : null}</td>
                      <td className={tableClasses.td}>{new Date(o.placedAt).toLocaleDateString()}</td>
                      <td className={tableClasses.td}>{o.customer.name}<span className="block text-xs text-neutral-500">{o.customer.email}</span></td>
                      <td className={tableClasses.td}><StatusBadge status={o.status} /></td>
                      <td className={tableClasses.td}><StatusBadge status={o.paymentStatus} /></td>
                      <td className={`${tableClasses.td} text-right`}>{formatMoney(o.total, o.currency)}</td>
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
