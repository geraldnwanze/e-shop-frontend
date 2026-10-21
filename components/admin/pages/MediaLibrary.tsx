"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import type { MediaItem } from "@/lib/admin/types";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Card, EmptyState, ErrorState, PageHeader, Select, Spinner, TextInput } from "../ui";

const FOLDERS = ["", "products", "categories", "branding", "uploads"];
const bytes = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function MediaLibrary() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [folder, setFolder] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState<MediaItem | null>(null);
  const [alt, setAlt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["media", "library", folder, page], queryFn: () => adminApi.list<MediaItem>("media", { folder, page }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["media"] });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try { await adminApi.upload<MediaItem>("media", file, { folder: folder || "uploads" }); ok++; } catch (e) { toast.error(`${file.name}: ${errorMessage(e, "Upload failed")}`); }
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
    if (ok > 0) { toast.success(`${ok} image${ok === 1 ? "" : "s"} uploaded`); setPage(1); await refresh(); }
  }

  const saveAlt = useMutation({
    mutationFn: () => adminApi.patch<MediaItem>(`media/${active?.id}`, { alt: alt || null }),
    onSuccess: async () => { toast.success("Saved"); setActive(null); await refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const replace = useMutation({
    mutationFn: (file: File) => adminApi.upload<MediaItem>(`media/${active?.id}/replace`, file),
    onSuccess: async (updated) => { toast.success("Image replaced"); setActive(updated); await refresh(); },
    onError: (e) => toast.error(errorMessage(e, "Replace failed")),
  });
  const remove = useMutation({
    mutationFn: () => adminApi.delete(`media/${active?.id}`),
    onSuccess: async () => { toast.success("Image deleted"); setConfirmDelete(false); setActive(null); await refresh(); },
    onError: (e) => { setConfirmDelete(false); toast.error(errorMessage(e)); },
  });

  return (
    <>
      <PageHeader title="Media" description="Images used across your store." actions={<>
        <input ref={fileInput} id="media-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
        <label htmlFor="media-upload" className="inline-flex cursor-pointer items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">{uploading ? "Uploading…" : "Upload images"}</label>
      </>} />

      <Card>
        <div className="border-b border-neutral-200 p-4 sm:max-w-xs">
          <Select label="Folder" value={folder} onChange={(e) => { setFolder(e.target.value); setPage(1); }}>{FOLDERS.map((f) => <option key={f} value={f}>{f || "All"}</option>)}</Select>
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? (
          <EmptyState title="No images here yet" description="JPG, PNG, WebP or GIF up to 5 MB." />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
              {data?.items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => { setActive(m); setAlt(m.alt ?? ""); }} className="group block w-full text-left">
                    <span className="block aspect-square overflow-hidden rounded-lg bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </span>
                    <span className="mt-1 block truncate text-xs text-neutral-500">{m.folder} · {bytes(m.size)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>

      <Modal open={active !== null} onClose={() => setActive(null)} title="Image details" footer={<>
        <Button variant="secondary" className="!text-red-700" onClick={() => setConfirmDelete(true)}>Delete</Button>
        <Button onClick={() => saveAlt.mutate()} disabled={saveAlt.isPending}>{saveAlt.isPending ? "Saving…" : "Save"}</Button>
      </>}>
        {active ? (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.url} alt={active.alt ?? ""} className="mx-auto max-h-64 rounded-lg" />
            <TextInput label="Alt text" value={alt} onChange={(e) => setAlt(e.target.value)} hint="Describes the image for screen readers and search engines." />
            <dl className="grid grid-cols-2 gap-2 text-xs text-neutral-500">
              <div><dt className="font-medium">Size</dt><dd>{bytes(active.size)}{active.width ? ` · ${active.width}×${active.height}` : ""}</dd></div>
              <div><dt className="font-medium">Stored on</dt><dd>{active.provider}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <input ref={replaceInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" id="replace-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) replace.mutate(f); e.target.value = ""; }} />
              <label htmlFor="replace-file" className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">{replace.isPending ? "Replacing…" : "Replace file"}</label>
              <button type="button" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50" onClick={() => navigator.clipboard?.writeText(active.url).then(() => toast.success("URL copied"))}>Copy URL</button>
            </div>
          </div>
        ) : null}
      </Modal>
      <ConfirmDialog open={confirmDelete} title="Delete image?" message="Products using this image will lose it. This cannot be undone." busy={remove.isPending} onConfirm={() => remove.mutate()} onClose={() => setConfirmDelete(false)} />
    </>
  );
}
