"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import type { Plan, Tenant } from "@/lib/admin/platform-types";
import { formatMoney } from "@/lib/money";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { Badge, Card, CardBody, CardHeader, ErrorState, Notice, PageHeader, Select, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

const limit = (n: number | null | undefined) => (n === null || n === undefined ? "Unlimited" : String(n));

export function TenantDetail({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: tenant, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "tenant", tenantId], queryFn: () => adminApi.get<Tenant>(`admin/tenants/${tenantId}`) });
  const [confirm, setConfirm] = useState<"suspend" | "activate" | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["platform", "tenant", tenantId] }), queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] }), queryClient.invalidateQueries({ queryKey: ["platform", "overview"] })]);

  const setStatus = useMutation({
    mutationFn: (action: "suspend" | "activate") => adminApi.post<Tenant>(`admin/tenants/${tenantId}/${action}`),
    onSuccess: async (t) => { toast.success(t.status === "suspended" ? "Tenant suspended" : "Tenant activated"); setConfirm(null); await refresh(); },
    onError: (e) => { setConfirm(null); toast.error(errorMessage(e)); },
  });

  if (isLoading) return <Spinner />;
  if (error || !tenant) return <ErrorState message={errorMessage(error, "Could not load this tenant.")} onRetry={() => refetch()} />;

  const sub = tenant.subscription;

  return (
    <>
      <PageHeader
        title={tenant.name}
        description={`${tenant.slug} · joined ${new Date(tenant.createdAt).toLocaleDateString()}`}
        actions={<>
          <Link href="/admin/tenants" className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">Back</Link>
          {tenant.status === "active"
            ? <Button variant="secondary" className="!text-red-700" onClick={() => setConfirm("suspend")}>Suspend tenant</Button>
            : <Button onClick={() => setConfirm("activate")}>Activate tenant</Button>}
        </>}
      />

      {tenant.status === "suspended" ? <div className="mb-6"><Notice tone="red">This tenant is suspended: its storefront is offline and its users cannot sign in{tenant.suspendedAt ? ` (since ${new Date(tenant.suspendedAt).toLocaleString()})` : ""}.</Notice></div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Subscription" action={<Button variant="secondary" onClick={() => setAssignOpen(true)}>{sub ? "Change plan" : "Assign plan"}</Button>} />
          <CardBody>
            {!sub ? <p className="text-sm text-neutral-500">No subscription. Platform default limits apply.</p> : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-neutral-500">Plan</dt><dd className="font-medium">{sub.plan?.name} <StatusBadge status={sub.status} /></dd></div>
                {sub.plan ? <div className="flex justify-between"><dt className="text-neutral-500">Price</dt><dd>{formatMoney(sub.plan.price, sub.plan.currency)} / {sub.plan.interval === "yearly" ? "year" : "month"}</dd></div> : null}
                {sub.plan ? <div className="flex justify-between"><dt className="text-neutral-500">Limits</dt><dd>{limit(sub.plan.limits.products)} products · {limit(sub.plan.limits.custom_domains)} domains</dd></div> : null}
                {sub.trialEndsAt ? <div className="flex justify-between"><dt className="text-neutral-500">Trial ends</dt><dd>{new Date(sub.trialEndsAt).toLocaleDateString()}</dd></div> : null}
                {sub.currentPeriodEndsAt ? <div className="flex justify-between"><dt className="text-neutral-500">Renews / ends</dt><dd>{new Date(sub.currentPeriodEndsAt).toLocaleDateString()}</dd></div> : null}
              </dl>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Store" />
          <CardBody>
            {!tenant.store ? <p className="text-sm text-neutral-500">No store.</p> : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-neutral-500">Name</dt><dd className="font-medium">{tenant.store.name}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Status</dt><dd><StatusBadge status={tenant.store.status} /></dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">Currency</dt><dd>{tenant.store.currency}</dd></div>
                <div className="flex justify-between"><dt className="text-neutral-500">URL</dt><dd><a href={tenant.store.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">{tenant.store.url}</a></dd></div>
              </dl>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Domains" />
          {tenant.domains && tenant.domains.length > 0 ? (
            <ul className="divide-y divide-neutral-100">
              {tenant.domains.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span>{d.domain} {d.isPrimary ? <Badge tone="blue">Primary</Badge> : null}</span><StatusBadge status={d.status} /></li>)}
            </ul>
          ) : <CardBody><p className="text-sm text-neutral-500">No domains.</p></CardBody>}
        </Card>

        <Card>
          <CardHeader title="Users" action={<Link href={`/admin/users?tenant=${tenant.id}`} className="text-sm font-medium text-brand hover:underline">Manage</Link>} />
          {tenant.users && tenant.users.length > 0 ? (
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <tbody>
                  {tenant.users.map((u) => (
                    <tr key={u.id}>
                      <td className={tableClasses.td}><span className="font-medium">{u.name}</span><span className="block text-xs text-neutral-500">{u.email}</span></td>
                      <td className={tableClasses.td}>{u.role.replace("merchant_", "")}</td>
                      <td className={tableClasses.td}>{u.suspendedAt ? <Badge tone="red">Suspended</Badge> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <CardBody><p className="text-sm text-neutral-500">No users.</p></CardBody>}
        </Card>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        danger={confirm === "suspend"}
        title={confirm === "suspend" ? `Suspend ${tenant.name}?` : `Activate ${tenant.name}?`}
        message={confirm === "suspend" ? "The storefront goes offline immediately and every merchant session is signed out. Orders and data are kept." : "The storefront comes back online and merchants can sign in again."}
        confirmLabel={confirm === "suspend" ? "Suspend" : "Activate"}
        busy={setStatus.isPending}
        onConfirm={() => confirm && setStatus.mutate(confirm)}
        onClose={() => setConfirm(null)}
      />
      {assignOpen ? <AssignPlanModal tenantId={tenantId} onClose={() => setAssignOpen(false)} onDone={async () => { setAssignOpen(false); toast.success("Plan assigned"); await refresh(); }} /> : null}
    </>
  );
}

function AssignPlanModal({ tenantId, onClose, onDone }: { tenantId: string; onClose: () => void; onDone: () => void }) {
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: () => adminApi.get<Plan[]>("admin/plans") });
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<"active" | "trialing">("active");
  const [trialEnds, setTrialEnds] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tomorrow] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  const assign = useMutation({
    mutationFn: () => adminApi.post(`admin/tenants/${tenantId}/subscription`, { plan_id: planId, status, ...(status === "trialing" && trialEnds ? { trial_ends_at: new Date(trialEnds).toISOString() } : {}) }),
    onSuccess: onDone,
    onError: (e) => { const f = apiFieldErrors(e); setErrors(Object.keys(f).length ? f : { plan_id: errorMessage(e) }); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!planId) return setErrors({ plan_id: "Choose a plan" });
    if (status === "trialing" && !trialEnds) return setErrors({ trial_ends_at: "Choose when the trial ends" });
    setErrors({});
    assign.mutate();
  }

  return (
    <Modal open onClose={onClose} title="Assign plan" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" form="assign-form" disabled={assign.isPending}>{assign.isPending ? "Saving…" : "Assign"}</Button>
    </>}>
      <form id="assign-form" onSubmit={submit} noValidate className="space-y-4">
        <Notice tone="amber">The current subscription is cancelled and replaced. Limits of the new plan apply immediately.</Notice>
        <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)} error={errors.plan_id}>
          <option value="">Choose…</option>
          {plans.data?.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price, p.currency)}/{p.interval === "yearly" ? "yr" : "mo"}</option>)}
        </Select>
        <Select label="Start as" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} error={errors.status}><option value="active">Active</option><option value="trialing">Trial</option></Select>
        {status === "trialing" ? <TextInput label="Trial ends" type="date" min={tomorrow} value={trialEnds} onChange={(e) => setTrialEnds(e.target.value)} error={errors.trial_ends_at} /> : null}
      </form>
    </Modal>
  );
}
