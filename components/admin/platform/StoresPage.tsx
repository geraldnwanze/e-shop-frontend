"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import type { PlatformStore, PlatformTheme } from "@/lib/admin/platform-types";
import { useDebounced } from "@/lib/use-debounced";

import { Modal } from "../Modal";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Card, EmptyState, ErrorState, PageHeader, Select, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

export function StoresPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PlatformStore | null>(null);
  const [form, setForm] = useState({ status: "", theme_id: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debounced = useDebounced(search);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "stores", debounced, status, page], queryFn: () => adminApi.list<PlatformStore>("admin/stores", { search: debounced, status, page }) });
  const themes = useQuery({ queryKey: ["platform", "themes"], queryFn: () => adminApi.get<PlatformTheme[]>("admin/themes"), enabled: editing !== null });

  const save = useMutation({
    mutationFn: () => adminApi.patch(`admin/stores/${editing?.id}`, { status: form.status, ...(form.theme_id ? { theme_id: form.theme_id } : {}) }),
    onSuccess: async () => { toast.success("Store updated"); setEditing(null); await queryClient.invalidateQueries({ queryKey: ["platform", "stores"] }); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (Object.keys(f).length === 0) toast.error(errorMessage(e)); },
  });

  return (
    <>
      <PageHeader title="Stores" description="Storefronts across all tenants." />
      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-[1fr_12rem]">
          <TextInput label="Search" type="search" placeholder="Name or slug" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option></Select>
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? <EmptyState title="No stores match" /> : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Store</th><th className={tableClasses.th}>Tenant</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Theme</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {data?.items.map((s) => (
                    <tr key={s.id}>
                      <td className={tableClasses.td}><a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">{s.name}</a><span className="block text-xs text-neutral-500">{s.slug}</span></td>
                      <td className={tableClasses.td}>{s.tenant ? <Link href={`/admin/tenants/${s.tenant.id}`} className="font-medium text-brand hover:underline">{s.tenant.name}</Link> : null}{s.tenant?.status === "suspended" ? <span className="ml-2"><StatusBadge status="suspended" /></span> : null}</td>
                      <td className={tableClasses.td}><StatusBadge status={s.status} /></td>
                      <td className={tableClasses.td}>{s.theme?.name ?? <span className="text-neutral-400">None</span>}</td>
                      <td className={`${tableClasses.td} text-right`}><button type="button" className="font-medium text-brand hover:underline" onClick={() => { setErrors({}); setForm({ status: s.status, theme_id: s.theme?.id ?? "" }); setEditing(s); }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Edit ${editing?.name ?? "store"}`} footer={<>
        <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        <div className="space-y-4">
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} error={errors.status}><option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option></Select>
          <Select label="Theme" value={form.theme_id} onChange={(e) => setForm({ ...form, theme_id: e.target.value })} error={errors.theme_id}>
            <option value="">Keep current</option>
            {themes.data?.filter((t) => t.status === "active").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      </Modal>
    </>
  );
}
