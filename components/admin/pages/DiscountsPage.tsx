"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import { discountStatus, STATUS_TONE } from "@/lib/admin/discounts";
import { discountSchema, flatten } from "@/lib/admin/schemas";
import type { Discount } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { MoneyField } from "../MoneyField";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, TextInput, Toggle, tableClasses } from "../ui";

interface Draft { id?: string; code: string; type: "percentage" | "fixed"; value: number | null; minSubtotal: number; maxUses: number | null; startsAt: string; endsAt: string; isActive: boolean }
const blank: Draft = { code: "", type: "percentage", value: 10, minSubtotal: 0, maxUses: null, startsAt: "", endsAt: "", isActive: true };

/** API ISO timestamp -> value for <input type="datetime-local"> (local time). */
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function DiscountsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: store } = useStore();
  const currency = store?.currency ?? "NGN";
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"mine" | "automatic">("mine");
  const automatic = tab === "automatic";
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["discounts", tab, page], queryFn: () => adminApi.list<Discount>("discounts", { page, source: automatic ? "automatic" : "manual" }) });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Discount | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = { code: d.code, type: d.type, value: d.value, min_subtotal: d.minSubtotal, max_uses: d.maxUses, starts_at: fromLocalInput(d.startsAt), ends_at: fromLocalInput(d.endsAt), is_active: d.isActive };
      return d.id ? adminApi.put(`discounts/${d.id}`, body) : adminApi.post("discounts", body);
    },
    onSuccess: async () => { toast.success("Discount saved"); setDraft(null); await queryClient.invalidateQueries({ queryKey: ["discounts"] }); },
    onError: (e) => {
      const map: Record<string, string> = { min_subtotal: "minSubtotal", max_uses: "maxUses", starts_at: "startsAt", ends_at: "endsAt", is_active: "isActive" };
      const fields = Object.fromEntries(Object.entries(apiFieldErrors(e)).map(([k, v]) => [map[k] ?? k, v]));
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(errorMessage(e));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`discounts/${id}`),
    onSuccess: async () => { toast.success("Discount deleted"); setToDelete(null); await queryClient.invalidateQueries({ queryKey: ["discounts"] }); },
    onError: (e) => { setToDelete(null); toast.error(errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const parsed = discountSchema.safeParse({ ...draft, startsAt: draft.startsAt || null, endsAt: draft.endsAt || null });
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    save.mutate({ ...draft, code: parsed.data.code });
  }

  const toggle = useMutation({
    mutationFn: (d: Discount) => adminApi.put(`discounts/${d.id}`, { is_active: !d.isActive }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["discounts"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const describe = (d: Discount) => (d.type === "percentage" ? `${d.value}% off` : `${formatMoney(d.value, currency)} off`);

  return (
    <>
      <PageHeader title="Discounts" description="Codes customers can enter at checkout." actions={<Button onClick={() => { setErrors({}); setDraft(blank); }}>Create discount</Button>} />
      <div role="tablist" aria-label="Discount codes" className="mb-4 inline-flex rounded-xl bg-neutral-100 p-1 text-sm">
        {([["mine", "Your codes"], ["automatic", "Cart recovery codes"]] as const).map(([key, label]) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => { setTab(key); setPage(1); }} className={`rounded-lg px-4 py-1.5 font-medium ${tab === key ? "bg-white shadow-sm" : "text-neutral-600"}`}>{label}</button>
        ))}
      </div>
      {automatic ? <p className="mb-4 max-w-2xl text-sm text-neutral-600">Single-use codes created for the follow-up cart reminder emails, one per shopper. You do not need to manage them: unused ones are removed a month after they expire.</p> : null}
      <Card>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? (
          automatic ? <EmptyState title="No cart recovery codes yet" description="They appear when you switch on the follow-up with a discount code in Settings." /> : <EmptyState title="No discount codes yet" description="Create a code to run a promotion." action={<Button onClick={() => setDraft(blank)}>Create discount</Button>} />
        ) : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Code</th><th className={tableClasses.th}>Discount</th><th className={tableClasses.th}>Used</th><th className={tableClasses.th}>{automatic ? "Valid until" : "Status"}</th>{automatic ? <th className={tableClasses.th}>Status</th> : null}<th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {data?.items.map((d) => (
                    <tr key={d.id}>
                      <td className={`${tableClasses.td} font-mono font-medium`}>{d.code}</td>
                      <td className={tableClasses.td}>{describe(d)}{d.minSubtotal > 0 ? <span className="block text-xs text-neutral-500">min. {formatMoney(d.minSubtotal, currency)}</span> : null}</td>
                      <td className={tableClasses.td}>{d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ""}</td>
                      {automatic ? <td className={tableClasses.td}>{d.endsAt ? new Date(d.endsAt).toLocaleDateString() : "—"}</td> : null}
                      <td className={tableClasses.td}>{automatic ? <Badge tone={STATUS_TONE[discountStatus(d)]}>{discountStatus(d)}</Badge> : <Badge tone={d.isActive ? "green" : "neutral"}>{d.isActive ? "Active" : "Inactive"}</Badge>}</td>
                      <td className={`${tableClasses.td} space-x-2 text-right`}>
                        {automatic ? (
                          discountStatus(d) === "Used" ? null : <button type="button" className="font-medium text-brand hover:underline" disabled={toggle.isPending} onClick={() => toggle.mutate(d)}>{d.isActive ? "Pause" : "Resume"}</button>
                        ) : (
                          <button type="button" className="font-medium text-brand hover:underline" onClick={() => { setErrors({}); setDraft({ id: d.id, code: d.code, type: d.type, value: d.value, minSubtotal: d.minSubtotal, maxUses: d.maxUses, startsAt: toLocalInput(d.startsAt), endsAt: toLocalInput(d.endsAt), isActive: d.isActive }); }}>Edit</button>
                        )}
                        <button type="button" className="text-red-700 underline" onClick={() => setToDelete(d)}>Delete</button>
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

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Edit discount" : "New discount"} footer={<>
        <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
        <Button type="submit" form="discount-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        {draft ? (
          <form id="discount-form" onSubmit={submit} noValidate className="space-y-4">
            <TextInput label="Code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} error={errors.code} hint="Customers type this at checkout." autoCapitalize="characters" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"], value: e.target.value === "percentage" ? 10 : null })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></Select>
              {draft.type === "percentage"
                ? <TextInput label="Percent off" type="number" min={1} max={100} value={draft.value ?? ""} onChange={(e) => setDraft({ ...draft, value: e.target.value === "" ? null : Number.parseInt(e.target.value, 10) })} error={errors.value} />
                : <MoneyField key={draft.type} label="Amount off" currency={currency} value={draft.value} onChange={(value) => setDraft({ ...draft, value })} error={errors.value} />}
            </div>
            <MoneyField label="Minimum order subtotal" currency={currency} value={draft.minSubtotal} onChange={(v) => setDraft({ ...draft, minSubtotal: v ?? 0 })} optional error={errors.minSubtotal} />
            <TextInput label="Maximum uses (optional)" type="number" min={1} value={draft.maxUses ?? ""} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value === "" ? null : Number.parseInt(e.target.value, 10) })} error={errors.maxUses} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Starts (optional)" type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} error={errors.startsAt} />
              <TextInput label="Ends (optional)" type="datetime-local" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} error={errors.endsAt} />
            </div>
            <Toggle label="Active" checked={draft.isActive} onChange={(isActive) => setDraft({ ...draft, isActive })} />
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog open={toDelete !== null} title="Delete discount?" message={toDelete?.isAutomatic ? `Code ${toDelete.code} will stop working. If the shopper it was emailed to has not used it yet, their email will carry a code that no longer works.` : `Code ${toDelete?.code} will stop working. Past orders keep their discount record.`} busy={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}
