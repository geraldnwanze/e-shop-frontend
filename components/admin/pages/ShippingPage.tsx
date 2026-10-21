"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import {
  MAX_RATES, describeCoverage, draftToPayload, emptyZoneDraft, newRateDraft, validateDraft, zoneToDraft,
  type CoverageMode, type RateDraft, type ShippingLocations, type ShippingZone, type ZoneDraft,
} from "@/lib/admin/shipping";
import { formatMoney } from "@/lib/money";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { MoneyField } from "../MoneyField";
import { useToast } from "../Toast";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader, Spinner, TextInput, Toggle, tableClasses } from "../ui";

export function ShippingPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: store } = useStore();
  const zones = useQuery({ queryKey: ["shipping-zones"], queryFn: () => adminApi.get<ShippingZone[]>("shipping-zones") });
  const locations = useQuery({ queryKey: ["shipping-locations"], queryFn: () => adminApi.get<ShippingLocations>("shipping/locations"), staleTime: Infinity });
  const settings = useQuery({ queryKey: ["store-settings"], queryFn: () => adminApi.get<{ checkout: { shipping_flat_rate?: number } }>("store/settings") });
  const [draft, setDraft] = useState<ZoneDraft | null>(null);
  const [toDelete, setToDelete] = useState<ShippingZone | null>(null);

  const remove = useMutation({
    mutationFn: (zone: ShippingZone) => adminApi.delete(`shipping-zones/${zone.id}`),
    onSuccess: async () => { toast.success("Zone deleted"); setToDelete(null); await queryClient.invalidateQueries({ queryKey: ["shipping-zones"] }); },
    onError: (e) => { setToDelete(null); toast.error(errorMessage(e)); },
  });

  const currency = store?.currency ?? "NGN";
  const countryNames = Object.fromEntries((locations.data?.countries ?? []).map((c) => [c.code, c.name]));
  const flatRate = settings.data?.checkout.shipping_flat_rate ?? 0;

  return (
    <>
      <PageHeader title="Shipping" description="Choose where you deliver and what each delivery method costs." actions={<Button onClick={() => setDraft(emptyZoneDraft())}>Add zone</Button>} />

      {zones.isLoading ? <Spinner /> : zones.error || !zones.data ? <ErrorState message={errorMessage(zones.error)} onRetry={() => zones.refetch()} /> : (
        <div className="space-y-6">
          {zones.data.length === 0 ? (
            <Notice tone="blue">
              You haven&apos;t set up any delivery zones yet, so every order is charged your single flat shipping rate ({flatRate > 0 ? formatMoney(flatRate, currency) : "free"}). Add a zone to charge by where the order is going.
            </Notice>
          ) : (
            <Notice tone="blue">Customers only see delivery methods from the zone that best matches their address. A zone with chosen states beats a whole-country zone, which beats &ldquo;everywhere else&rdquo;. Addresses outside every zone can&apos;t check out.</Notice>
          )}

          {zones.data.length === 0 ? (
            <Card><EmptyState title="No delivery zones" description="Start with the area you deliver to most, for example Lagos." action={<Button onClick={() => setDraft(emptyZoneDraft())}>Add your first zone</Button>} /></Card>
          ) : zones.data.map((zone) => (
            <Card key={zone.id}>
              <CardHeader
                title={zone.name}
                description={describeCoverage(zone, countryNames)}
                action={
                  <div className="flex items-center gap-2">
                    {zone.isActive ? <Badge tone="green">Active</Badge> : <Badge>Off</Badge>}
                    <Button variant="secondary" onClick={() => setDraft(zoneToDraft(zone))}>Edit</Button>
                    <Button variant="secondary" className="!text-red-700" onClick={() => setToDelete(zone)}>Delete</Button>
                  </div>
                }
              />
              <div className={tableClasses.wrap}>
                <table className={tableClasses.table}>
                  <thead><tr><th className={tableClasses.th}>Delivery method</th><th className={tableClasses.th}>Price</th><th className={tableClasses.th}>Free over</th><th className={tableClasses.th}>Status</th></tr></thead>
                  <tbody>
                    {zone.rates.map((rate) => (
                      <tr key={rate.id}>
                        <td className={tableClasses.td}><span className="font-medium">{rate.name}</span>{rate.description ? <span className="block text-xs text-neutral-500">{rate.description}</span> : null}</td>
                        <td className={tableClasses.td}>{rate.price === 0 ? "Free" : formatMoney(rate.price, currency)}</td>
                        <td className={tableClasses.td}>{rate.freeOver ? formatMoney(rate.freeOver, currency) : <span className="text-neutral-400">—</span>}</td>
                        <td className={tableClasses.td}>{rate.isActive ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {draft ? <ZoneEditor key={draft.id ?? "new"} initial={draft} locations={locations.data} currency={currency} onClose={() => setDraft(null)} /> : null}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${toDelete?.name ?? "this zone"}?`}
        message="Customers in this area will no longer be able to check out unless another zone covers them. Past orders keep their delivery details."
        confirmLabel="Delete zone"
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

function ZoneEditor({ initial, locations, currency, onClose }: { initial: ZoneDraft; locations?: ShippingLocations; currency: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [d, setD] = useState<ZoneDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () => (d.id ? adminApi.put<ShippingZone>(`shipping-zones/${d.id}`, draftToPayload(d)) : adminApi.post<ShippingZone>("shipping-zones", draftToPayload(d))),
    onSuccess: async () => { toast.success(d.id ? "Zone updated" : "Zone created"); await queryClient.invalidateQueries({ queryKey: ["shipping-zones"] }); onClose(); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); toast.error(Object.keys(f).length ? "Please fix the highlighted fields." : errorMessage(e)); },
  });

  function submit() {
    const found = validateDraft(d);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  const setRate = (key: string, patch: Partial<RateDraft>) => setD((s) => ({ ...s, rates: s.rates.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <Modal open onClose={onClose} title={d.id ? "Edit zone" : "Add zone"} wide footer={<><Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button><Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save zone"}</Button></>}>
      <div className="space-y-6">
        <TextInput label="Zone name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} error={errors.name} placeholder="e.g. Lagos" />

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-neutral-800">Where does it apply?</legend>
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
            {([["states", "Nigerian states", "Pick specific states"], ["countries", "Whole countries", "Everywhere in a country"], ["everywhere", "Everywhere else", "Anywhere not covered above"]] as [CoverageMode, string, string][]).map(([mode, title, text]) => (
              <label key={mode} className={`cursor-pointer rounded-xl border p-3 text-sm ${d.mode === mode ? "border-brand bg-brand-soft" : "border-black/10 hover:bg-neutral-50"}`}>
                <input type="radio" name="mode" className="sr-only" checked={d.mode === mode} onChange={() => setD({ ...d, mode })} />
                <span className="block font-semibold">{title}</span><span className="text-xs text-neutral-500">{text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {d.mode === "states" ? (
          <fieldset>
            <div className="mb-2 flex items-center justify-between"><legend className="text-sm font-medium text-neutral-800">States ({d.states.length} chosen)</legend>
              <span className="flex gap-3 text-xs font-medium text-brand"><button type="button" className="hover:underline" onClick={() => setD({ ...d, states: locations?.states ?? [] })}>Select all</button><button type="button" className="hover:underline" onClick={() => setD({ ...d, states: [] })}>Clear</button></span>
            </div>
            <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-black/10 p-3 text-sm sm:grid-cols-4">
              {(locations?.states ?? []).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={d.states.includes(s)} onChange={() => setD({ ...d, states: toggle(d.states, s) })} />{s}</label>
              ))}
            </div>
            {errors.states ? <p role="alert" className="mt-1 text-sm text-red-600">{errors.states}</p> : null}
          </fieldset>
        ) : null}

        {d.mode === "countries" ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-neutral-800">Countries ({d.countries.length} chosen)</legend>
            <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-xl border border-black/10 p-3 text-sm sm:grid-cols-3">
              {(locations?.countries ?? []).map((c) => (
                <label key={c.code} className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={d.countries.includes(c.code)} onChange={() => setD({ ...d, countries: toggle(d.countries, c.code) })} />{c.name}</label>
              ))}
            </div>
            {errors.countries ? <p role="alert" className="mt-1 text-sm text-red-600">{errors.countries}</p> : null}
          </fieldset>
        ) : null}
        {d.mode === "everywhere" ? <p className="text-sm text-neutral-600">Used for any address that no more specific zone covers (for example, international orders).</p> : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-800">Delivery methods</h3>
            <Button variant="secondary" disabled={d.rates.length >= MAX_RATES} onClick={() => setD({ ...d, rates: [...d.rates, newRateDraft()] })}>Add method</Button>
          </div>
          {errors.rates ? <p role="alert" className="mb-2 text-sm text-red-600">{errors.rates}</p> : null}
          <div className="space-y-3">
            {d.rates.map((r, i) => (
              <div key={r.key} className="rounded-xl border border-black/10 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput label="Name" value={r.name} onChange={(e) => setRate(r.key, { name: e.target.value })} error={errors[`rates.${i}.name`]} placeholder="e.g. Standard delivery" />
                  <TextInput label="Description (optional)" value={r.description} onChange={(e) => setRate(r.key, { description: e.target.value })} placeholder="e.g. 2 to 4 business days" />
                  <MoneyField label="Price" currency={currency} value={r.price} onChange={(price) => setRate(r.key, { price })} error={errors[`rates.${i}.price`]} hint="Use 0 for free delivery." />
                  <MoneyField label="Free when the cart reaches" currency={currency} value={r.freeOver} onChange={(freeOver) => setRate(r.key, { freeOver })} optional error={errors[`rates.${i}.free_over`]} hint="Optional. Counted before discount codes." />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Toggle label="Offer this method" checked={r.isActive} onChange={(isActive) => setRate(r.key, { isActive })} />
                  <button type="button" className="text-sm font-medium text-red-700 hover:underline" onClick={() => setD({ ...d, rates: d.rates.filter((x) => x.key !== r.key) })}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Toggle label="Zone is active" description="Turn off to pause this zone without deleting it." checked={d.isActive} onChange={(isActive) => setD({ ...d, isActive })} />
      </div>
    </Modal>
  );
}
