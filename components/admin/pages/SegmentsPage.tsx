"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import type { AdminCustomer } from "@/lib/admin/types";
import { blankDraft, describeRules, fromApiRules, hasAnyRule, PRESETS, toApiRules, type CustomerSegment, type SegmentDraft } from "@/lib/admin/segments";
import { formatMoney } from "@/lib/money";
import { useDebounced } from "@/lib/use-debounced";

import { CampaignComposer } from "../CampaignComposer";
import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { MoneyField } from "../MoneyField";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Badge, Card, CardBody, EmptyState, ErrorState, PageHeader, Select, Spinner, TextInput, tableClasses } from "../ui";

export function SegmentsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: store } = useStore();
  const currency = store?.currency ?? "NGN";
  const money = (minor: number) => formatMoney(minor, currency);

  const [draft, setDraft] = useState<SegmentDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<CustomerSegment | null>(null);
  const [emailing, setEmailing] = useState<CustomerSegment | null>(null);
  const [toDelete, setToDelete] = useState<CustomerSegment | null>(null);

  const segments = useQuery({ queryKey: ["customer-segments"], queryFn: () => adminApi.get<CustomerSegment[]>("customer-segments") });

  const save = useMutation({
    mutationFn: (d: SegmentDraft) => {
      const body = { name: d.name.trim(), description: d.description.trim() || null, rules: toApiRules(d) };

      return d.id ? adminApi.put(`customer-segments/${d.id}`, body) : adminApi.post("customer-segments", body);
    },
    onSuccess: async () => { toast.success("Segment saved"); setDraft(null); await queryClient.invalidateQueries({ queryKey: ["customer-segments"] }); },
    onError: (e) => {
      const fields = apiFieldErrors(e);
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(errorMessage(e));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`customer-segments/${id}`),
    onSuccess: async () => { toast.success("Segment deleted"); setToDelete(null); await queryClient.invalidateQueries({ queryKey: ["customer-segments"] }); },
    onError: (e) => { setToDelete(null); toast.error(errorMessage(e)); },
  });

  const rules = draft ? toApiRules(draft) : {};
  const debouncedRules = useDebounced(JSON.stringify(rules));
  const preview = useQuery({
    queryKey: ["segment-preview", debouncedRules],
    enabled: draft !== null && hasAnyRule(rules),
    queryFn: () => adminApi.post<{ customersCount: number }>("customer-segments/preview", { rules: JSON.parse(debouncedRules) }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const problems: Record<string, string> = {};
    if (draft.name.trim().length < 2) problems.name = "Give the segment a name";
    if (!hasAnyRule(rules)) problems.rules = "Choose at least one rule";
    setErrors(problems);
    if (Object.keys(problems).length === 0) save.mutate(draft);
  }

  const open = (d: SegmentDraft) => { setErrors({}); setDraft(d); };
  const set = (patch: Partial<SegmentDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <>
      <PageHeader title="Customer segments" description="Group customers by what they buy and when, so you know who to reward and who to win back." actions={<Button onClick={() => open(blankDraft)}>New segment</Button>} />

      {segments.isLoading ? <Spinner /> : segments.error ? <ErrorState message={errorMessage(segments.error)} onRetry={() => segments.refetch()} /> : segments.data && segments.data.length === 0 ? (
        <Card>
          <EmptyState title="No segments yet" description="Start from a ready-made group, or build your own." />
          <div className="flex flex-wrap justify-center gap-2 px-4 pb-6">
            {PRESETS.map((p) => <Button key={p.name} variant="secondary" onClick={() => open({ ...fromApiRules({ id: "", name: p.name, description: p.description, rules: p.rules }), id: undefined })}>{p.name}</Button>)}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {segments.data?.map((s) => (
            <Card key={s.id}>
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display font-semibold">{s.name}</h2>
                    {s.description ? <p className="truncate text-sm text-neutral-500">{s.description}</p> : null}
                  </div>
                  <Badge tone="blue">{s.customersCount ?? 0} customer{s.customersCount === 1 ? "" : "s"}</Badge>
                </div>
                <ul className="space-y-1 text-sm text-neutral-700">
                  {describeRules(s.rules, currency).map((line) => <li key={line} className="flex gap-2"><span aria-hidden="true" className="text-neutral-400">•</span>{line}</li>)}
                </ul>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm">
                  <button type="button" className="font-medium text-brand hover:underline" onClick={() => setViewing(s)}>View customers</button>
                  <button type="button" className="font-medium text-brand hover:underline" onClick={() => setEmailing(s)}>Email this segment</button>
                  <a className="font-medium text-brand hover:underline" href={`/api/admin/customer-segments/${s.id}/export`} download>Export CSV</a>
                  <button type="button" className="font-medium text-brand hover:underline" onClick={() => open(fromApiRules(s))}>Edit</button>
                  <button type="button" className="text-red-700 underline" onClick={() => setToDelete(s)}>Delete</button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {segments.data && segments.data.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Quick start</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => <Button key={p.name} variant="secondary" className="!px-3 !py-1.5" onClick={() => open({ ...fromApiRules({ id: "", name: p.name, description: p.description, rules: p.rules }), id: undefined })}>{p.name}</Button>)}
          </div>
        </div>
      ) : null}

      <Modal open={draft !== null} wide onClose={() => setDraft(null)} title={draft?.id ? "Edit segment" : "New segment"} footer={<>
        <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
        <Button type="submit" form="segment-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save segment"}</Button>
      </>}>
        {draft ? (
          <form id="segment-form" onSubmit={submit} noValidate className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Name" value={draft.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
              <TextInput label="Description (optional)" value={draft.description} onChange={(e) => set({ description: e.target.value })} error={errors.description} />
            </div>

            <fieldset className="space-y-4 rounded-xl border border-black/10 p-4">
              <legend className="px-1 text-sm font-medium">Who belongs? <span className="font-normal text-neutral-500">Customers must match every rule you set.</span></legend>
              <p className="text-xs text-neutral-500">Orders and spending count paid orders only.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label="At least this many orders" type="number" min={1} inputMode="numeric" value={draft.minOrders} onChange={(e) => set({ minOrders: e.target.value })} error={errors["rules.min_orders"]} />
                <TextInput label="At most this many orders" type="number" min={0} inputMode="numeric" value={draft.maxOrders} onChange={(e) => set({ maxOrders: e.target.value })} error={errors["rules.max_orders"]} hint="0 means they have never bought." />
                <MoneyField label="Spent at least" currency={currency} value={draft.minSpent} onChange={(v) => set({ minSpent: v })} optional error={errors["rules.min_spent"]} />
                <MoneyField label="Spent at most" currency={currency} value={draft.maxSpent} onChange={(v) => set({ maxSpent: v })} optional error={errors["rules.max_spent"]} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Last order" value={draft.recency} onChange={(e) => set({ recency: e.target.value as SegmentDraft["recency"] })}>
                  <option value="any">Any time</option>
                  <option value="within">Ordered recently</option>
                  <option value="inactive">Has not ordered for a while</option>
                </Select>
                <TextInput label={draft.recency === "inactive" ? "Not ordered for (days)" : "Ordered within (days)"} type="number" min={1} inputMode="numeric" disabled={draft.recency === "any"} value={draft.recencyDays} onChange={(e) => set({ recencyDays: e.target.value })} error={errors["rules.ordered_within_days"] ?? errors["rules.inactive_for_days"]} />
                <TextInput label="Joined in the last (days)" type="number" min={1} inputMode="numeric" value={draft.joinedDays} onChange={(e) => set({ joinedDays: e.target.value })} error={errors["rules.joined_within_days"]} />
                <Select label="Account" value={draft.account} onChange={(e) => set({ account: e.target.value as SegmentDraft["account"] })}>
                  <option value="any">Either</option>
                  <option value="yes">Has an account</option>
                  <option value="no">Guest checkout only</option>
                </Select>
              </div>
              {errors.rules ? <p role="alert" className="text-sm text-red-600">{errors.rules}</p> : null}
            </fieldset>

            <p role="status" className="rounded-xl bg-neutral-50 p-3 text-sm">
              {!hasAnyRule(rules) ? "Set a rule to see who matches." : preview.isFetching ? "Counting…" : preview.data ? <>This matches <strong>{preview.data.customersCount}</strong> customer{preview.data.customersCount === 1 ? "" : "s"} right now.</> : "—"}
            </p>
          </form>
        ) : null}
      </Modal>

      {emailing ? <CampaignComposer key={emailing.id} segment={emailing} onClose={() => setEmailing(null)} /> : null}

      <SegmentMembers segment={viewing} onClose={() => setViewing(null)} money={money} />

      <ConfirmDialog open={toDelete !== null} title="Delete segment?" message={`"${toDelete?.name}" will be removed. Your customers are not affected.`} busy={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}

function SegmentMembers({ segment, onClose, money }: { segment: CustomerSegment | null; onClose: () => void; money: (minor: number) => string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["segment-customers", segment?.id, page],
    enabled: segment !== null,
    queryFn: () => adminApi.list<AdminCustomer>(`customer-segments/${segment?.id}/customers`, { page }),
  });

  return (
    <Modal open={segment !== null} wide onClose={() => { setPage(1); onClose(); }} title={segment ? `${segment.name} · customers` : "Customers"} footer={segment ? <a href={`/api/admin/customer-segments/${segment.id}/export`} download className="mr-auto text-sm font-medium text-brand hover:underline">Export CSV</a> : undefined}>
      {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : query.data && query.data.items.length === 0 ? (
        <EmptyState title="Nobody matches right now" description="Customers join and leave a segment automatically as their orders change." />
      ) : query.data ? (
        <>
          <div className={tableClasses.wrap}>
            <table className={tableClasses.table}>
              <thead><tr><th className={tableClasses.th}>Customer</th><th className={`${tableClasses.th} text-right`}>Orders</th><th className={`${tableClasses.th} text-right`}>Spent</th><th className={tableClasses.th}>Last order</th></tr></thead>
              <tbody>
                {query.data.items.map((c) => (
                  <tr key={c.id}>
                    <td className={tableClasses.td}><span className="font-medium">{c.firstName} {c.lastName}</span><span className="block text-xs text-neutral-500">{c.email}</span></td>
                    <td className={`${tableClasses.td} text-right`}>{c.paidOrders ?? 0}</td>
                    <td className={`${tableClasses.td} text-right`}>{money(c.totalSpent ?? 0)}</td>
                    <td className={tableClasses.td}>{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager meta={query.data.meta} onPage={setPage} />
        </>
      ) : null}
    </Modal>
  );
}
