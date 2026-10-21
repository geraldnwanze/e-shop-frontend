"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import type { PlatformDomain } from "@/lib/admin/platform-types";
import { useDebounced } from "@/lib/use-debounced";

import { ConfirmDialog } from "../ConfirmDialog";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

export function DomainsAdminPage({ initialStatus = "" }: { initialStatus?: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [toRemove, setToRemove] = useState<PlatformDomain | null>(null);
  const debounced = useDebounced(search);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform"] });

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "domains", debounced, status, type, page], queryFn: () => adminApi.list<PlatformDomain>("admin/domains", { search: debounced, status, type, page }) });

  const verify = useMutation({
    mutationFn: (id: string) => adminApi.post<PlatformDomain>(`admin/domains/${id}/verify`),
    onSuccess: async (d) => { if (d.isVerified) toast.success(d.status === "active" ? "Domain is live" : "Ownership verified"); else toast.error(d.failureReason ?? "DNS check did not pass yet"); await refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`admin/domains/${id}`),
    onSuccess: async () => { toast.success("Domain removed"); setToRemove(null); await refresh(); },
    onError: (e) => { setToRemove(null); toast.error(errorMessage(e)); },
  });

  return (
    <>
      <PageHeader title="Domains" description="Every hostname connected to a store. Verification always runs a real DNS check." />
      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-3">
          <TextInput label="Search" type="search" placeholder="example.com" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="active">Active</option><option value="failed">Failed</option></Select>
          <Select label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All</option><option value="SUBDOMAIN">Platform subdomain</option><option value="CUSTOM">Custom</option></Select>
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? <EmptyState title="No domains match" /> : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Domain</th><th className={tableClasses.th}>Tenant</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Last checked</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {data?.items.map((d) => (
                    <tr key={d.id}>
                      <td className={tableClasses.td}><span className="font-medium">{d.domain}</span> {d.isPrimary ? <Badge tone="blue">Primary</Badge> : null}{d.failureReason && d.status !== "active" ? <span className="block text-xs text-amber-700">{d.failureReason}</span> : null}</td>
                      <td className={tableClasses.td}>{d.tenant ? <Link href={`/admin/tenants/${d.tenant.id}`} className="font-medium text-brand hover:underline">{d.tenant.name}</Link> : null}</td>
                      <td className={tableClasses.td}><StatusBadge status={d.status} /></td>
                      <td className={tableClasses.td}>{d.lastCheckedAt ? new Date(d.lastCheckedAt).toLocaleString() : "—"}</td>
                      <td className={`${tableClasses.td} space-x-2 text-right`}>
                        {d.type === "CUSTOM" ? <>
                          {d.status !== "active" ? <button type="button" className="font-medium text-brand hover:underline" disabled={verify.isPending} onClick={() => verify.mutate(d.id)}>Re-check DNS</button> : null}
                          <button type="button" className="text-red-700 underline" onClick={() => setToRemove(d)}>Remove</button>
                        </> : <span className="text-xs text-neutral-400">Managed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>
      <ConfirmDialog open={toRemove !== null} title="Remove this domain?" message={`${toRemove?.domain} stops serving ${toRemove?.tenant?.name ?? "the store"} immediately. The merchant can add it again.`} confirmLabel="Remove" busy={remove.isPending} onConfirm={() => toRemove && remove.mutate(toRemove.id)} onClose={() => setToRemove(null)} />
    </>
  );
}
