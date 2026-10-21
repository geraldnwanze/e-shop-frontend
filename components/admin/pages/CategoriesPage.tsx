"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import { categorySchema, flatten } from "@/lib/admin/schemas";
import type { AdminCategory } from "@/lib/admin/types";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, TextArea, TextInput, Toggle, tableClasses } from "../ui";

interface Draft { id?: string; name: string; description: string; position: number; isActive: boolean; parentId: string }
const blank: Draft = { name: "", description: "", position: 0, isActive: true, parentId: "" };

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["categories"], queryFn: () => adminApi.get<AdminCategory[]>("categories") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = { name: d.name, description: d.description || null, position: d.position, is_active: d.isActive, parent_id: d.parentId || null };
      return d.id ? adminApi.put(`categories/${d.id}`, body) : adminApi.post("categories", body);
    },
    onSuccess: async () => {
      toast.success("Category saved");
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => {
      const fields = Object.fromEntries(Object.entries(apiFieldErrors(e)).map(([k, v]) => [k === "is_active" ? "isActive" : k === "parent_id" ? "parentId" : k, v]));
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(errorMessage(e));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`categories/${id}`),
    onSuccess: async () => { toast.success("Category deleted"); setToDelete(null); await queryClient.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => { setToDelete(null); toast.error(errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const parsed = categorySchema.safeParse({ name: draft.name, description: draft.description, position: draft.position, isActive: draft.isActive });
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    save.mutate(draft);
  }

  const parents = (data ?? []).filter((c) => c.id !== draft?.id);

  return (
    <>
      <PageHeader title="Categories" description="Group products so customers can browse." actions={<Button onClick={() => { setErrors({}); setDraft(blank); }}>Add category</Button>} />

      <Card>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.length === 0 ? (
          <EmptyState title="No categories yet" description="Create categories to organise your catalogue." action={<Button onClick={() => setDraft(blank)}>Add category</Button>} />
        ) : (
          <div className={tableClasses.wrap}>
            <table className={tableClasses.table}>
              <thead><tr><th className={tableClasses.th}>Name</th><th className={tableClasses.th}>Visibility</th><th className={`${tableClasses.th} text-right`}>Products</th><th className={`${tableClasses.th} text-right`}>Order</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id}>
                    <td className={tableClasses.td}><span className="font-medium">{c.name}</span><span className="block text-xs text-neutral-500">/{c.slug}</span></td>
                    <td className={tableClasses.td}><Badge tone={c.isActive ? "green" : "neutral"}>{c.isActive ? "Visible" : "Hidden"}</Badge></td>
                    <td className={`${tableClasses.td} text-right`}>{c.productsCount ?? 0}</td>
                    <td className={`${tableClasses.td} text-right`}>{c.position}</td>
                    <td className={`${tableClasses.td} space-x-2 text-right`}>
                      <button type="button" className="font-medium text-brand hover:underline" onClick={() => { setErrors({}); setDraft({ id: c.id, name: c.name, description: c.description ?? "", position: c.position, isActive: c.isActive, parentId: c.parentId ?? "" }); }}>Edit</button>
                      <button type="button" className="text-red-700 underline" onClick={() => setToDelete(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Edit category" : "New category"} footer={<>
        <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
        <Button type="submit" form="category-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        {draft ? (
          <form id="category-form" onSubmit={submit} noValidate className="space-y-4">
            <TextInput label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} />
            <TextArea label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} error={errors.description} />
            <Select label="Parent category" value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} error={errors.parentId}><option value="">None</option>{parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <TextInput label="Display order" type="number" min={0} value={draft.position} onChange={(e) => setDraft({ ...draft, position: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} error={errors.position} hint="Lower numbers appear first." />
            <Toggle label="Visible on storefront" checked={draft.isActive} onChange={(isActive) => setDraft({ ...draft, isActive })} />
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog open={toDelete !== null} title="Delete category?" message={`“${toDelete?.name}” will be removed. Products in it are kept but become uncategorised.`} busy={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}
