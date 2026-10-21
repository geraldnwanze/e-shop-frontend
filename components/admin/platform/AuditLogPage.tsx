"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { adminApi } from "@/lib/admin/client";
import { actionTone, ACTOR_TYPES, actorTypeLabel, changeRows, describeAction, filterQuery, type AuditEntry } from "@/lib/admin/audit";
import { errorMessage } from "@/lib/admin/hooks";
import { useDebounced } from "@/lib/use-debounced";

import { Modal } from "../Modal";
import { Pager } from "../Pager";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, TextInput, tableClasses } from "../ui";
import { TenantPicker } from "./TenantPicker";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function AuditLogPage({ initialTenant }: { initialTenant?: string }) {
  const [search, setSearch] = useState("");
  const [tenant, setTenant] = useState(initialTenant ?? "");
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const debounced = useDebounced(search);
  const filters = { search: debounced, tenant, actor_type: actorType, action, from, to };

  const actions = useQuery({ queryKey: ["platform", "audit-actions"], queryFn: () => adminApi.get<string[]>("admin/audit-logs/actions"), staleTime: 60_000 });
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "audit", filters, page], queryFn: () => adminApi.list<AuditEntry>("admin/audit-logs", { ...filters, page }) });
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const filtered = Object.values(filters).some(Boolean) || search !== "";

  return (
    <>
      <PageHeader title="Audit log" description="Who did what across the platform: store changes, team and settings edits, sign-ins and admin actions. Only platform administrators can see this." actions={
        <a href={`/api/admin/admin/audit-logs/export?${filterQuery(filters)}`} download className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">Export CSV</a>
      } />

      <Card>
        <div className="grid gap-3 border-b border-black/[0.06] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput label="Search" type="search" placeholder="Person, record or action" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
          <TenantPicker label="Store" value={tenant} onChange={reset(setTenant)} />
          <Select label="Who" value={actorType} onChange={(e) => reset(setActorType)(e.target.value)}><option value="">Anyone</option>{ACTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
          <Select label="Action" value={action} onChange={(e) => reset(setAction)(e.target.value)}><option value="">All actions</option>{(actions.data ?? []).map((a) => <option key={a} value={a}>{describeAction(a)}</option>)}</Select>
          <TextInput label="From" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
          <TextInput label="To" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
          {filtered ? <div className="flex items-end"><button type="button" className="rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-50" onClick={() => { setSearch(""); setTenant(""); setActorType(""); setAction(""); setFrom(""); setTo(""); setPage(1); }}>Clear filters</button></div> : null}
        </div>

        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? <EmptyState title="Nothing recorded" description={filtered ? "No entries match these filters." : "Entries appear here as people use the platform."} /> : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>When</th><th className={tableClasses.th}>Who</th><th className={tableClasses.th}>Action</th><th className={tableClasses.th}>Record</th><th className={tableClasses.th}>Store</th><th className={tableClasses.th}><span className="sr-only">Details</span></th></tr></thead>
                <tbody>
                  {data?.items.map((e) => (
                    <tr key={e.id}>
                      <td className={`${tableClasses.td} whitespace-nowrap text-neutral-600`}>{when(e.createdAt)}</td>
                      <td className={tableClasses.td}><span className="font-medium">{e.actor.label ?? actorTypeLabel(e.actor.type)}</span><span className="block text-xs text-neutral-500">{actorTypeLabel(e.actor.type)}</span></td>
                      <td className={tableClasses.td}><Badge tone={actionTone(e.action)}>{describeAction(e.action)}</Badge></td>
                      <td className={tableClasses.td}>{e.subject ? <><span className="font-medium">{e.subject.label ?? "—"}</span><span className="block text-xs text-neutral-500">{e.subject.type.replace(/_/g, " ")}</span></> : <span className="text-neutral-400">—</span>}</td>
                      <td className={tableClasses.td}>{e.tenant?.name ?? <span className="text-neutral-400">—</span>}</td>
                      <td className={`${tableClasses.td} text-right`}><button type="button" className="font-medium text-brand hover:underline" onClick={() => setOpen(e)}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>

      <Modal open={open !== null} onClose={() => setOpen(null)} title="Audit entry">
        {open ? (
          <div className="space-y-5 text-sm">
            <div>
              <Badge tone={actionTone(open.action)}>{describeAction(open.action)}</Badge>
              <p className="mt-2 text-neutral-500">{when(open.createdAt)}</p>
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Who</dt><dd className="font-medium">{open.actor.label ?? "—"} <span className="font-normal text-neutral-500">({actorTypeLabel(open.actor.type)})</span></dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Store</dt><dd className="font-medium">{open.tenant?.name ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-neutral-500">Record</dt><dd className="font-medium">{open.subject ? `${open.subject.label ?? "—"} (${open.subject.type.replace(/_/g, " ")})` : "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-neutral-500">From</dt><dd className="font-medium">{open.meta?.ip ?? open.meta?.source ?? "—"}</dd></div>
            </dl>
            {changeRows(open.changes).length > 0 ? (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">What changed</p>
                <ul className="divide-y divide-black/[0.06] rounded-lg border border-black/10">
                  {changeRows(open.changes).map((row) => (
                    <li key={row.field} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2">
                      <span className="font-mono text-xs text-neutral-600">{row.field}</span>
                      {row.value !== undefined ? <span className="break-all">{row.value}</span> : <span className="break-all"><span className="text-neutral-500 line-through">{row.before}</span> → <span className="font-medium">{row.after}</span></span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {open.meta?.request_id ? <p className="text-xs text-neutral-400">Request {open.meta.request_id}</p> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
