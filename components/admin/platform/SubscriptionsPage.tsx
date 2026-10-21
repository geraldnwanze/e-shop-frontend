"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import type { Plan, Subscription } from "@/lib/admin/platform-types";
import { formatMoney } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounced";

import { Modal } from "../Modal";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Card, EmptyState, ErrorState, PageHeader, Select, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState({ status: "active", trial: "", period: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debounced = useDebounced(search);

  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: () => adminApi.get<Plan[]>("admin/plans") });
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "subscriptions", debounced, status, plan, page], queryFn: () => adminApi.list<Subscription>("admin/subscriptions", { search: debounced, status, plan, page }) });

  const save = useMutation({
    mutationFn: () => adminApi.patch(`admin/subscriptions/${editing?.id}`, { status: form.status, trial_ends_at: form.trial ? `${form.trial}T00:00:00Z` : null, current_period_ends_at: form.period ? `${form.period}T00:00:00Z` : null }),
    onSuccess: async () => { toast.success("Subscription updated"); setEditing(null); await queryClient.invalidateQueries({ queryKey: ["platform"] }); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (Object.keys(f).length === 0) toast.error(errorMessage(e)); },
  });

  return (
    <>
      <PageHeader title="Subscriptions" description="Which tenant is on which plan. Assign plans from a tenant's page." />
      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-3">
          <TextInput label="Search tenant" type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="trialing">Trialing</option><option value="active">Active</option><option value="past_due">Past due</option><option value="cancelled">Cancelled</option></Select>
          <Select label="Plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}><option value="">All</option>{plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? <EmptyState title="No subscriptions match" /> : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Tenant</th><th className={tableClasses.th}>Plan</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Period ends</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {data?.items.map((s) => (
                    <tr key={s.id}>
                      <td className={tableClasses.td}>{s.tenant ? <Link href={`/admin/tenants/${s.tenant.id}`} className="font-semibold text-brand hover:underline">{s.tenant.name}</Link> : null}</td>
                      <td className={tableClasses.td}>{s.plan?.name}{s.plan ? <span className="block text-xs text-neutral-500">{formatMoney(s.plan.price, s.plan.currency)} / {s.plan.interval === "yearly" ? "yr" : "mo"}</span> : null}</td>
                      <td className={tableClasses.td}><StatusBadge status={s.status} /></td>
                      <td className={tableClasses.td}>{s.currentPeriodEndsAt ? new Date(s.currentPeriodEndsAt).toLocaleDateString() : "—"}</td>
                      <td className={`${tableClasses.td} text-right`}>{s.status === "cancelled" ? null : <button type="button" className="font-medium text-brand hover:underline" onClick={() => { setErrors({}); setForm({ status: s.status, trial: toDate(s.trialEndsAt), period: toDate(s.currentPeriodEndsAt) }); setEditing(s); }}>Edit</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit subscription" footer={<>
        <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">{editing?.tenant?.name} · {editing?.plan?.name}</p>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} error={errors.status}><option value="trialing">Trialing</option><option value="active">Active</option><option value="past_due">Past due</option><option value="cancelled">Cancelled</option></Select>
          <TextInput label="Trial ends" type="date" value={form.trial} onChange={(e) => setForm({ ...form, trial: e.target.value })} error={errors.trial_ends_at} />
          <TextInput label="Current period ends" type="date" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} error={errors.current_period_ends_at} />
          <p className="text-xs text-neutral-500">Cancelled subscriptions fall back to the platform default limits.</p>
        </div>
      </Modal>
    </>
  );
}
