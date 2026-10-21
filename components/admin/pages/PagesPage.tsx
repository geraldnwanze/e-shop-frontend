"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import { PAGE_TEMPLATES } from "@/lib/admin/page-templates";
import { flatten, storePageSchema } from "@/lib/admin/schemas";
import type { AdminStorePage } from "@/lib/admin/types";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, TextArea, TextInput, Toggle, tableClasses } from "../ui";

interface Draft { id?: string; title: string; body: string; isPublished: boolean; showInFooter: boolean; position: number }
const blank: Draft = { title: "", body: "", isPublished: true, showInFooter: true, position: 0 };

export function PagesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["pages"], queryFn: () => adminApi.get<AdminStorePage[]>("pages") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<AdminStorePage | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = { title: d.title, body: d.body, is_published: d.isPublished, show_in_footer: d.showInFooter, position: d.position };
      return d.id ? adminApi.put(`pages/${d.id}`, body) : adminApi.post("pages", body);
    },
    onSuccess: async () => {
      toast.success("Page saved");
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["pages"] });
    },
    onError: (e) => {
      const fields = Object.fromEntries(Object.entries(apiFieldErrors(e)).map(([k, v]) => [k === "is_published" ? "isPublished" : k === "show_in_footer" ? "showInFooter" : k, v]));
      setErrors(fields);
      if (Object.keys(fields).length === 0) toast.error(errorMessage(e));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`pages/${id}`),
    onSuccess: async () => { toast.success("Page deleted"); setToDelete(null); await queryClient.invalidateQueries({ queryKey: ["pages"] }); },
    onError: (e) => { setToDelete(null); toast.error(errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const parsed = storePageSchema.safeParse(draft);
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    save.mutate(draft);
  }

  const open = (next: Draft) => { setErrors({}); setDraft(next); };
  const unused = PAGE_TEMPLATES.filter((t) => !data?.some((p) => p.title === t.title));

  return (
    <>
      <PageHeader title="Pages" description="About, contact, shipping, privacy and terms pages. Shown in your store's footer." actions={<Button onClick={() => open(blank)}>Add page</Button>} />

      <Card>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.length === 0 ? (
          <EmptyState title="No pages yet" description="Customers expect shipping, returns and privacy information. Start from a template below." action={<Button onClick={() => open(blank)}>Add page</Button>} />
        ) : (
          <div className={tableClasses.wrap}>
            <table className={tableClasses.table}>
              <thead><tr><th className={tableClasses.th}>Page</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Footer</th><th className={`${tableClasses.th} text-right`}>Order</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data?.map((p) => (
                  <tr key={p.id}>
                    <td className={tableClasses.td}><span className="font-medium">{p.title}</span><span className="block text-xs text-neutral-500">/pages/{p.slug}</span></td>
                    <td className={tableClasses.td}><Badge tone={p.isPublished ? "green" : "neutral"}>{p.isPublished ? "Published" : "Draft"}</Badge></td>
                    <td className={tableClasses.td}>{p.showInFooter ? "Yes" : "No"}</td>
                    <td className={`${tableClasses.td} text-right`}>{p.position}</td>
                    <td className={`${tableClasses.td} space-x-2 text-right`}>
                      <button type="button" className="font-medium text-brand hover:underline" onClick={() => open({ id: p.id, title: p.title, body: p.body, isPublished: p.isPublished, showInFooter: p.showInFooter, position: p.position })}>Edit</button>
                      <button type="button" className="text-red-700 underline" onClick={() => setToDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {unused.length > 0 ? (
        <Card className="mt-6 p-4">
          <p className="mb-3 text-sm font-medium">Start from a template</p>
          <div className="flex flex-wrap gap-2">
            {unused.map((t) => <Button key={t.title} variant="secondary" onClick={() => open({ ...blank, title: t.title, body: t.body })}>{t.title}</Button>)}
          </div>
          <p className="mt-3 text-xs text-neutral-500">Templates are only a starting point. Replace the [bracketed] parts and check the wording fits your business and local law.</p>
        </Card>
      ) : null}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Edit page" : "New page"} footer={<>
        <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
        <Button type="submit" form="page-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        {draft ? (
          <form id="page-form" onSubmit={submit} noValidate className="space-y-4">
            <TextInput label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} error={errors.title} />
            <TextArea label="Content" rows={10} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} error={errors.body} hint="Plain text. Leave a blank line between paragraphs." />
            <TextInput label="Display order" type="number" min={0} value={draft.position} onChange={(e) => setDraft({ ...draft, position: Math.max(0, Number.parseInt(e.target.value, 10) || 0) })} error={errors.position} hint="Lower numbers appear first in the footer." />
            <Toggle label="Published" checked={draft.isPublished} onChange={(isPublished) => setDraft({ ...draft, isPublished })} />
            <Toggle label="Show link in footer" checked={draft.showInFooter} onChange={(showInFooter) => setDraft({ ...draft, showInFooter })} />
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog open={toDelete !== null} title="Delete page?" message={`“${toDelete?.title}” will be removed from your store.`} busy={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}
