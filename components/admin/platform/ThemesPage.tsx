"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import type { PlatformTheme } from "@/lib/admin/platform-types";
import { flatten } from "@/lib/admin/schemas";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { Badge, Card, EmptyState, ErrorState, Notice, PageHeader, Select, Spinner, TextArea, TextInput, tableClasses } from "../ui";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.string().trim().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes").or(z.literal("")),
  description: z.string().trim().max(500),
  preview_image: z.string().trim().refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "Must be an https:// URL"),
});

interface Draft { id?: string; name: string; slug: string; description: string; preview_image: string; status: "active" | "inactive" }
const blank: Draft = { name: "", slug: "", description: "", preview_image: "", status: "active" };

export function ThemesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "themes"], queryFn: () => adminApi.get<PlatformTheme[]>("admin/themes") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<PlatformTheme | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform", "themes"] });

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = { name: d.name, description: d.description || null, preview_image: d.preview_image || null, status: d.status, ...(d.id ? {} : { slug: d.slug }) };
      return d.id ? adminApi.put(`admin/themes/${d.id}`, body) : adminApi.post("admin/themes", body);
    },
    onSuccess: async () => { toast.success("Theme saved"); setDraft(null); await refresh(); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (Object.keys(f).length === 0) toast.error(errorMessage(e)); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`admin/themes/${id}`),
    onSuccess: async () => { toast.success("Theme deleted"); setToDelete(null); await refresh(); },
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
      <PageHeader title="Themes" description="Templates merchants can choose for their storefront." actions={<Button onClick={() => { setErrors({}); setDraft(blank); }}>Add theme</Button>} />
      <div className="mb-4"><Notice tone="blue">A theme&apos;s slug must match a template in the storefront code (<code>themes/&lt;slug&gt;</code>). Unknown slugs fall back to the Minimal layout.</Notice></div>
      <Card>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.length === 0 ? <EmptyState title="No themes" /> : (
          <div className={tableClasses.wrap}>
            <table className={tableClasses.table}>
              <thead><tr><th className={tableClasses.th}>Theme</th><th className={tableClasses.th}>Status</th><th className={`${tableClasses.th} text-right`}>Stores</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data?.map((t) => (
                  <tr key={t.id}>
                    <td className={tableClasses.td}><span className="font-medium">{t.name}</span> <span className="font-mono text-xs text-neutral-500">{t.slug}</span>{t.description ? <span className="block text-xs text-neutral-500">{t.description}</span> : null}</td>
                    <td className={tableClasses.td}><Badge tone={t.status === "active" ? "green" : "neutral"}>{t.status}</Badge></td>
                    <td className={`${tableClasses.td} text-right`}>{t.storesCount ?? 0}</td>
                    <td className={`${tableClasses.td} space-x-2 text-right`}>
                      <button type="button" className="font-medium text-brand hover:underline" onClick={() => { setErrors({}); setDraft({ id: t.id, name: t.name, slug: t.slug, description: t.description ?? "", preview_image: t.previewImage ?? "", status: t.status }); }}>Edit</button>
                      <button type="button" className="text-red-700 underline" onClick={() => setToDelete(t)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Edit theme" : "New theme"} footer={<>
        <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
        <Button type="submit" form="theme-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        {draft ? (
          <form id="theme-form" onSubmit={submit} noValidate className="space-y-4">
            <TextInput label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} />
            <TextInput label="Slug" value={draft.slug} disabled={!!draft.id} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} error={errors.slug} hint={draft.id ? "Fixed after creation." : "e.g. neon (must exist in the storefront code)"} />
            <TextArea label="Description" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} error={errors.description} />
            <TextInput label="Preview image URL" value={draft.preview_image} onChange={(e) => setDraft({ ...draft, preview_image: e.target.value })} error={errors.preview_image} placeholder="https://…" />
            <Select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}><option value="active">Active (selectable)</option><option value="inactive">Inactive (hidden)</option></Select>
          </form>
        ) : null}
      </Modal>
      <ConfirmDialog open={toDelete !== null} title="Delete theme?" message={`${toDelete?.name} will be removed. Themes used by stores cannot be deleted; deactivate them instead.`} busy={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}
