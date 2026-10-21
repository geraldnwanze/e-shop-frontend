"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import type { Plan } from "@/lib/admin/platform-types";
import { flatten } from "@/lib/admin/schemas";
import { formatMoney } from "@/lib/money";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { MoneyField } from "../MoneyField";
import { useToast } from "../Toast";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, TextArea, TextInput, Toggle, tableClasses } from "../ui";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.string().trim().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes").or(z.literal("")),
  price: z.number({ error: "Enter a price" }).int().min(0),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "3-letter code, e.g. NGN"),
  productsLimit: z.number().int().min(0).nullable(),
  domainsLimit: z.number().int().min(0).nullable(),
  position: z.number().int().min(0).max(1000),
});

interface Draft {
  id?: string; name: string; slug: string; description: string; price: number | null; currency: string; interval: "monthly" | "yearly";
  productsLimit: number | null; domainsLimit: number | null; features: string; isActive: boolean; position: number;
}
const blank: Draft = { name: "", slug: "", description: "", price: 0, currency: "NGN", interval: "monthly", productsLimit: 25, domainsLimit: 0, features: "", isActive: true, position: 0 };
const limit = (n: number | null) => (n === null ? "Unlimited" : String(n));

function LimitField({ label, value, onChange, error }: { label: string; value: number | null; onChange: (v: number | null) => void; error?: string }) {
  return (
    <div>
      <TextInput label={label} type="number" min={0} disabled={value === null} value={value ?? ""} onChange={(e) => onChange(Math.max(0, Number.parseInt(e.target.value, 10) || 0))} error={error} />
      <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={value === null} onChange={(e) => onChange(e.target.checked ? null : 0)} /> Unlimited</label>
    </div>
  );
}

export function PlansPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "plans"], queryFn: () => adminApi.get<Plan[]>("admin/plans") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Plan | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform"] });

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = {
        name: d.name, description: d.description || null, price: d.price, currency: d.currency.toUpperCase(), interval: d.interval,
        limits: { products: d.productsLimit, custom_domains: d.domainsLimit },
        features: d.features.split("\n").map((f) => f.trim()).filter(Boolean), is_active: d.isActive, position: d.position,
        ...(d.id ? {} : { slug: d.slug }),
      };
      return d.id ? adminApi.put(`admin/plans/${d.id}`, body) : adminApi.post("admin/plans", body);
    },
    onSuccess: async () => { toast.success("Plan saved"); setDraft(null); await refresh(); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (Object.keys(f).length === 0) toast.error(errorMessage(e)); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`admin/plans/${id}`),
    onSuccess: async () => { toast.success("Plan deleted"); setToDelete(null); await refresh(); },
    onError: (e) => { setToDelete(null); toast.error(errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const parsed = schema.safeParse(draft);
    const found = parsed.success ? {} : flatten(parsed.error);
    if (!draft.id && !draft.slug) found.slug = "Slug is required";
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate(draft);
  }

  return (
    <>
      <PageHeader title="Plans" description="What merchants can subscribe to, and what each plan allows." actions={<Button onClick={() => { setErrors({}); setDraft(blank); }}>Add plan</Button>} />
      <Card>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.length === 0 ? <EmptyState title="No plans yet" /> : (
          <div className={tableClasses.wrap}>
            <table className={tableClasses.table}>
              <thead><tr><th className={tableClasses.th}>Plan</th><th className={tableClasses.th}>Price</th><th className={tableClasses.th}>Limits</th><th className={`${tableClasses.th} text-right`}>Subscribers</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data?.map((p) => (
                  <tr key={p.id}>
                    <td className={tableClasses.td}><span className="font-medium">{p.name}</span> <span className="font-mono text-xs text-neutral-500">{p.slug}</span></td>
                    <td className={tableClasses.td}>{p.price === 0 ? "Free" : `${formatMoney(p.price, p.currency)} / ${p.interval === "yearly" ? "yr" : "mo"}`}</td>
                    <td className={tableClasses.td}>{limit(p.limits.products)} products · {limit(p.limits.custom_domains)} domains</td>
                    <td className={`${tableClasses.td} text-right`}>{p.subscribersCount ?? 0}</td>
                    <td className={tableClasses.td}><Badge tone={p.isActive ? "green" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge></td>
                    <td className={`${tableClasses.td} space-x-2 text-right`}>
                      <button type="button" className="font-medium text-brand hover:underline" onClick={() => { setErrors({}); setDraft({ id: p.id, name: p.name, slug: p.slug, description: p.description ?? "", price: p.price, currency: p.currency, interval: p.interval, productsLimit: p.limits.products, domainsLimit: p.limits.custom_domains, features: p.features.join("\n"), isActive: p.isActive, position: p.position }); }}>Edit</button>
                      <button type="button" className="text-red-700 underline" onClick={() => setToDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Edit plan" : "New plan"} wide footer={<>
        <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
        <Button type="submit" form="plan-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        {draft ? (
          <form id="plan-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} />
            <TextInput label="Slug" value={draft.slug} disabled={!!draft.id} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} error={errors.slug} hint={draft.id ? "Fixed after creation." : undefined} />
            <TextArea label="Description" className="sm:col-span-2" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} error={errors.description} />
            <MoneyField label="Price" currency={draft.currency} value={draft.price} onChange={(price) => setDraft({ ...draft, price })} error={errors.price} />
            <div className="grid grid-cols-2 gap-4">
              <TextInput label="Currency" value={draft.currency} maxLength={3} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} error={errors.currency} />
              <Select label="Billed" value={draft.interval} onChange={(e) => setDraft({ ...draft, interval: e.target.value as Draft["interval"] })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select>
            </div>
            <LimitField label="Max products" value={draft.productsLimit} onChange={(productsLimit) => setDraft({ ...draft, productsLimit })} error={errors.productsLimit ?? errors["limits.products"]} />
            <LimitField label="Max custom domains" value={draft.domainsLimit} onChange={(domainsLimit) => setDraft({ ...draft, domainsLimit })} error={errors.domainsLimit ?? errors["limits.custom_domains"]} />
            <TextArea label="Features (one per line)" className="sm:col-span-2" rows={3} value={draft.features} onChange={(e) => setDraft({ ...draft, features: e.target.value })} error={errors.features} />
            <TextInput label="Display order" type="number" min={0} value={draft.position} onChange={(e) => setDraft({ ...draft, position: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} error={errors.position} />
            <div className="pt-6"><Toggle label="Active (can be assigned)" checked={draft.isActive} onChange={(isActive) => setDraft({ ...draft, isActive })} /></div>
          </form>
        ) : null}
      </Modal>
      <ConfirmDialog open={toDelete !== null} title="Delete plan?" message={`${toDelete?.name} will be removed. Plans with subscribers cannot be deleted; deactivate them instead.`} busy={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}
