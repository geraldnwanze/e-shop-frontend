"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import type { MediaItem } from "@/lib/admin/types";

import { Modal } from "./Modal";
import { Pager } from "./Pager";
import { useToast } from "./Toast";
import { Notice, Spinner } from "./ui";

/** Pick (and upload) images from the store's media library. */
export function MediaPicker({ open, onClose, onPick, multiple = true, folder = "products" }: { open: boolean; onClose: () => void; onPick: (items: MediaItem[]) => void; multiple?: boolean; folder?: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<string, MediaItem>>(new Map());
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["media", "picker", page], queryFn: () => adminApi.list<MediaItem>("media", { page }), enabled: open });

  function toggle(item: MediaItem) {
    setSelected((current) => {
      const next = new Map(multiple ? current : []);
      if (current.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) await adminApi.upload<MediaItem>("media", file, { folder });
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      setPage(1);
      toast.success(files.length === 1 ? "Image uploaded" : `${files.length} images uploaded`);
    } catch (e) {
      toast.error(errorMessage(e, "Upload failed"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  const confirm = () => {
    onPick([...selected.values()]);
    setSelected(new Map());
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose images" wide footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={confirm} disabled={selected.size === 0}>Use {selected.size > 0 ? `${selected.size} image${selected.size === 1 ? "" : "s"}` : "selected"}</Button>
    </>}>
      <div className="mb-4 flex items-center gap-3">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" id="picker-upload" onChange={(e) => upload(e.target.files)} />
        <label htmlFor="picker-upload" className="inline-flex cursor-pointer items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">{uploading ? "Uploading…" : "Upload images"}</label>
        <span className="text-xs text-neutral-500">JPG, PNG, WebP or GIF · up to 5 MB</span>
      </div>

      {isLoading ? <Spinner /> : error ? <Notice tone="red">{errorMessage(error)}</Notice> : data && data.items.length === 0 ? <p className="py-10 text-center text-sm text-neutral-500">No images yet. Upload your first one above.</p> : (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {data?.items.map((item) => {
              const on = selected.has(item.id);

              return (
                <li key={item.id}>
                  <button type="button" onClick={() => toggle(item)} aria-pressed={on} className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 ${on ? "border-neutral-900" : "border-transparent"} bg-neutral-100`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />
                    {on ? <span className="absolute right-1 top-1 rounded-full bg-neutral-900 px-1.5 text-xs text-white">✓</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
        </>
      )}
    </Modal>
  );
}
