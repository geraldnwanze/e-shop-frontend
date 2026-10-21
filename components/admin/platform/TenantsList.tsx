"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import type { Tenant } from "@/lib/admin/platform-types";
import { useDebounced } from "@/lib/use-debounced";

import { Pager } from "../Pager";
import { Card, EmptyState, ErrorState, PageHeader, Select, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

export function TenantsList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "tenants", debounced, status, page], queryFn: () => adminApi.list<Tenant>("admin/tenants", { search: debounced, status, page }) });

  return (
    <>
      <PageHeader title="Tenants" description="Every merchant on the platform." />
      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-[1fr_12rem]">
          <TextInput label="Search" type="search" placeholder="Name or slug" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="active">Active</option><option value="suspended">Suspended</option></Select>
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? <EmptyState title="No tenants match" /> : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Tenant</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Plan</th><th className={`${tableClasses.th} text-right`}>Users</th><th className={tableClasses.th}>Joined</th></tr></thead>
                <tbody>
                  {data?.items.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50">
                      <td className={tableClasses.td}><Link href={`/admin/tenants/${t.id}`} className="font-semibold text-brand hover:underline">{t.name}</Link><span className="block text-xs text-neutral-500">{t.slug}</span></td>
                      <td className={tableClasses.td}><StatusBadge status={t.status} /></td>
                      <td className={tableClasses.td}>{t.subscription?.plan?.name ? <>{t.subscription.plan.name} <StatusBadge status={t.subscription.status} /></> : <span className="text-neutral-400">None</span>}</td>
                      <td className={`${tableClasses.td} text-right`}>{t.usersCount ?? 0}</td>
                      <td className={tableClasses.td}>{new Date(t.createdAt).toLocaleDateString()}</td>
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
