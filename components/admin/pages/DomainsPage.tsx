"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import { domainSchema, flatten } from "@/lib/admin/schemas";
import type { DomainRecord } from "@/lib/admin/types";

import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { Badge, Card, CardBody, CardHeader, ErrorState, Notice, PageHeader, Spinner, StatusBadge, TextInput } from "../ui";

const STATUS_HELP: Record<string, string> = {
  pending: "Waiting for your DNS records. Add them below, then click Verify.",
  verified: "Ownership confirmed. Point your domain to us (routing record below) to go live.",
  active: "Live. Visitors can reach your store on this domain.",
  failed: "We couldn't verify this domain in time. Check the records and click Verify to retry.",
};

function Copy({ value }: { value: string }) {
  const toast = useToast();

  return <button type="button" className="ml-2 text-xs underline" onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success("Copied"))}>Copy</button>;
}

export function DomainsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["domains"], queryFn: () => adminApi.get<DomainRecord[]>("domains") });
  const [domain, setDomain] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toRemove, setToRemove] = useState<DomainRecord | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["domains"] });

  const add = useMutation({
    mutationFn: (d: string) => adminApi.post<DomainRecord>("domains", { domain: d }),
    onSuccess: async () => { toast.success("Domain added. Add the DNS records below."); setDomain(""); await refresh(); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (Object.keys(f).length === 0) toast.error(errorMessage(e)); },
  });
  const verify = useMutation({
    mutationFn: (id: string) => adminApi.post<DomainRecord>(`domains/${id}/verify`),
    onSuccess: async (d) => {
      if (d.isVerified) toast.success(d.status === "active" ? "Domain is live!" : "Ownership verified");
      else toast.error(d.failureReason ?? "Could not verify yet. DNS changes can take a while.");
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const primary = useMutation({
    mutationFn: (id: string) => adminApi.post(`domains/${id}/primary`),
    onSuccess: async () => { toast.success("Primary domain updated"); await refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`domains/${id}`),
    onSuccess: async () => { toast.success("Domain removed"); setToRemove(null); await refresh(); },
    onError: (e) => { setToRemove(null); toast.error(errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = domainSchema.safeParse({ domain });
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    add.mutate(parsed.data.domain);
  }

  return (
    <>
      <PageHeader title="Domains" description="Where customers find your store." />

      <Card className="mb-6">
        <CardHeader title="Connect a custom domain" description="e.g. yourbrand.shop.com or yourbrand.com" />
        <CardBody>
          <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-3">
            <TextInput label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} error={errors.domain} placeholder="shop.example.com" className="min-w-64 flex-1" />
            <div className="pt-6"><Button type="submit" disabled={add.isPending}>{add.isPending ? "Adding…" : "Add domain"}</Button></div>
          </form>
        </CardBody>
      </Card>

      {isLoading ? <Spinner /> : error ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : (
        <ul className="space-y-4">
          {data?.map((d) => (
            <li key={d.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold">{d.domain} {d.isPrimary ? <Badge tone="blue">Primary</Badge> : null}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-neutral-500"><StatusBadge status={d.status} />{d.type === "SUBDOMAIN" ? "Included with your store" : STATUS_HELP[d.status]}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {d.type === "CUSTOM" && d.status !== "active" ? <Button variant="secondary" onClick={() => verify.mutate(d.id)} disabled={verify.isPending}>{verify.isPending && verify.variables === d.id ? "Checking DNS…" : "Verify"}</Button> : null}
                    {d.isVerified && !d.isPrimary ? <Button variant="secondary" onClick={() => primary.mutate(d.id)} disabled={primary.isPending}>Make primary</Button> : null}
                    {d.type === "CUSTOM" ? <Button variant="ghost" className="!text-red-700" onClick={() => setToRemove(d)}>Remove</Button> : null}
                  </div>
                </div>

                {d.failureReason && d.status !== "active" ? <div className="px-5 pb-4"><Notice tone={d.status === "failed" ? "red" : "amber"}>{d.failureReason}</Notice></div> : null}

                {d.dnsInstructions && d.status !== "active" ? (
                  <div className="space-y-4 border-t border-neutral-200 bg-neutral-50 px-5 py-4 text-sm">
                    <p className="font-medium">Add these records at your DNS provider</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead><tr className="text-neutral-500"><th className="pb-2 pr-4">Purpose</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">Name / Host</th><th className="pb-2">Value / Target</th></tr></thead>
                        <tbody>
                          <tr className="align-top"><td className="py-1 pr-4">1. Prove ownership</td><td className="py-1 pr-4 font-mono">{d.dnsInstructions.ownership.type}</td><td className="py-1 pr-4 font-mono break-all">{d.dnsInstructions.ownership.name}<Copy value={d.dnsInstructions.ownership.name} /></td><td className="py-1 font-mono break-all">{d.dnsInstructions.ownership.value}<Copy value={d.dnsInstructions.ownership.value} /></td></tr>
                          <tr className="align-top"><td className="py-1 pr-4">2. Send traffic to us</td><td className="py-1 pr-4 font-mono">{d.dnsInstructions.routing.type}</td><td className="py-1 pr-4 font-mono">{d.dnsInstructions.routing.name}</td><td className="py-1 font-mono break-all">{d.dnsInstructions.routing.target}<Copy value={d.dnsInstructions.routing.target} /></td></tr>
                        </tbody>
                      </table>
                    </div>
                    {d.dnsInstructions.routing.note ? <p className="text-xs text-neutral-500">{d.dnsInstructions.routing.note}</p> : null}
                    <p className="text-xs text-neutral-500">DNS changes can take from a few minutes up to a day. We re-check automatically every few minutes; you can also click Verify. {d.lastCheckedAt ? `Last checked ${new Date(d.lastCheckedAt).toLocaleString()}.` : ""}</p>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog open={toRemove !== null} title="Remove domain?" message={`${toRemove?.domain} will stop serving your store immediately.`} confirmLabel="Remove" busy={remove.isPending} onConfirm={() => toRemove && remove.mutate(toRemove.id)} onClose={() => setToRemove(null)} />
    </>
  );
}
