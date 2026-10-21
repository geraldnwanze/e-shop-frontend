"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import { flatten, storeSchema } from "@/lib/admin/schemas";
import type { StoreDetails as StoreDetailsType } from "@/lib/admin/types";

import { useToast } from "../Toast";
import { Card, CardBody, CardHeader, ErrorState, PageHeader, Select, Spinner, TextArea, TextInput } from "../ui";

function timezones(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Europe/London", "America/New_York"];
  }
}

export function StoreDetails() {
  const { data: store, isLoading, error, refetch } = useStore();

  if (isLoading) return <Spinner />;
  if (error || !store) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader title="Store details" description="Your store's name, currency and branding." />
      <div className="space-y-6">
        <DetailsForm key={store.id + store.name + store.currency} store={store} />
        <BrandingCard kind="logo" store={store} />
        <BrandingCard kind="favicon" store={store} />
      </div>
    </>
  );
}

function DetailsForm({ store }: { store: StoreDetailsType }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [v, setV] = useState({ name: store.name, description: store.description ?? "", currency: store.currency, timezone: store.timezone });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const zones = timezones();

  const save = useMutation({
    mutationFn: () => adminApi.put<StoreDetailsType>("store", { ...v, description: v.description || null, currency: v.currency.toUpperCase() }),
    onSuccess: async () => { toast.success("Store details saved"); await queryClient.invalidateQueries({ queryKey: ["store"] }); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (Object.keys(f).length === 0) toast.error(errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = storeSchema.safeParse(v);
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    save.mutate();
  }

  return (
    <Card>
      <CardHeader title="General" />
      <CardBody>
        <form onSubmit={submit} noValidate className="space-y-4">
          <TextInput label="Store name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errors.name} />
          <TextArea label="Description" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} error={errors.description} hint="Used in search results and when your store is shared." />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Currency" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value.toUpperCase() })} error={errors.currency} maxLength={3} hint="3-letter code, e.g. NGN, USD, GHS" />
            <Select label="Timezone" value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })} error={errors.timezone}>{!zones.includes(v.timezone) ? <option value={v.timezone}>{v.timezone}</option> : null}{zones.map((z) => <option key={z} value={z}>{z}</option>)}</Select>
          </div>
          <div className="text-sm text-neutral-500">Store address: <a href={store.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">{store.url}</a> (can&apos;t be changed)</div>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
        </form>
      </CardBody>
    </Card>
  );
}

function BrandingCard({ kind, store }: { kind: "logo" | "favicon"; store: StoreDetailsType }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const current = store[kind];
  const label = kind === "logo" ? "Logo" : "Favicon";

  const upload = useMutation({
    mutationFn: (file: File) => adminApi.upload(`store/${kind}`, file),
    onSuccess: async () => { toast.success(`${label} updated`); await queryClient.invalidateQueries({ queryKey: ["store"] }); },
    onError: (e) => toast.error(errorMessage(e, "Upload failed")),
  });
  const remove = useMutation({
    mutationFn: () => adminApi.delete(`store/${kind}`),
    onSuccess: async () => { toast.success(`${label} removed`); await queryClient.invalidateQueries({ queryKey: ["store"] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader title={label} description={kind === "logo" ? "Shown in your storefront header. JPG, PNG, WebP or GIF." : "The small icon in browser tabs. PNG, ICO or WebP, ideally 32×32."} />
      <CardBody className="flex flex-wrap items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {current ? <img src={current} alt={`Current ${label.toLowerCase()}`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-neutral-400">None</span>}
        </div>
        <div className="flex gap-2">
          <input ref={input} id={`${kind}-file`} type="file" className="sr-only" accept={kind === "logo" ? "image/jpeg,image/png,image/webp,image/gif" : "image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,.ico"} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
          <label htmlFor={`${kind}-file`} className="cursor-pointer rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">{upload.isPending ? "Uploading…" : current ? "Replace" : "Upload"}</label>
          {current ? <Button variant="secondary" className="!text-red-700" onClick={() => remove.mutate()} disabled={remove.isPending}>Remove</Button> : null}
        </div>
      </CardBody>
    </Card>
  );
}
