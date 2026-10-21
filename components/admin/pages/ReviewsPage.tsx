"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import { reviewActions, STATUS_LABEL, STATUS_TONE, type AdminReview, type ReviewStatus } from "@/lib/admin/reviews";
import { useDebounced } from "@/lib/use-debounced";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, TextArea, TextInput } from "../ui";

function Stars({ rating }: { rating: number }) {
  return <span role="img" aria-label={`${rating} out of 5 stars`} className="text-amber-500">{"★".repeat(rating)}<span className="text-neutral-300">{"★".repeat(5 - rating)}</span></span>;
}

export function ReviewsPage({ initialStatus }: { initialStatus?: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState(initialStatus && initialStatus in STATUS_LABEL ? initialStatus : "");
  const [rating, setRating] = useState("");
  const [unanswered, setUnanswered] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [reply, setReply] = useState("");
  const [toDelete, setToDelete] = useState<AdminReview | null>(null);
  const [photoToRemove, setPhotoToRemove] = useState<{ review: AdminReview; photoId: string } | null>(null);

  const query = useQuery({
    queryKey: ["reviews", { status, rating, unanswered, debounced, page }],
    queryFn: () => adminApi.list<AdminReview>("reviews", { status, rating, unanswered: unanswered || "", search: debounced, page }),
  });

  const changed = async () => { await queryClient.invalidateQueries({ queryKey: ["reviews"] }); await queryClient.invalidateQueries({ queryKey: ["products"] }); };

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: ReviewStatus; reply?: string | null } }) => adminApi.patch(`reviews/${id}`, body),
    onSuccess: async () => { toast.success("Review updated"); setReplying(null); await changed(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.delete(`reviews/${id}`),
    onSuccess: async () => { toast.success("Review deleted"); setToDelete(null); await changed(); },
    onError: (e) => { setToDelete(null); toast.error(errorMessage(e)); },
  });

  const removePhoto = useMutation({
    mutationFn: ({ review, photoId }: { review: AdminReview; photoId: string }) => adminApi.delete(`reviews/${review.id}/photos/${photoId}`),
    onSuccess: async () => { toast.success("Photo removed"); setPhotoToRemove(null); await changed(); },
    onError: (e) => { setPhotoToRemove(null); toast.error(errorMessage(e)); },
  });

  const pending = Number((query.data?.meta as { pending?: number } | undefined)?.pending ?? 0);
  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <>
      <PageHeader title="Reviews" description="What customers say about your products. Hide anything inappropriate and reply to the rest." />
      {pending > 0 && status !== "pending" ? <div className="mb-4"><button type="button" onClick={() => reset(setStatus)("pending")} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"><strong>{pending}</strong> review{pending === 1 ? "" : "s"} waiting for approval →</button></div> : null}

      <Card>
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_9rem_auto] lg:items-end">
          <TextInput label="Search" type="search" placeholder="Name, headline or text" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
          <Select label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)}><option value="">All</option>{(Object.keys(STATUS_LABEL) as ReviewStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</Select>
          <Select label="Rating" value={rating} onChange={(e) => reset(setRating)(e.target.value)}><option value="">Any</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}</Select>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={unanswered} onChange={(e) => reset(setUnanswered)(e.target.checked)} />Needs a reply</label>
        </div>

        {query.isLoading ? <Spinner /> : query.error ? <div className="p-4"><ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /></div> : query.data && query.data.items.length === 0 ? (
          <EmptyState title="No reviews found" description="Customers who bought a product can review it from its page." />
        ) : query.data ? (
          <>
            <ul className="divide-y divide-black/[0.06]">
              {query.data.items.map((r) => (
                <li key={r.id} className="space-y-2 p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={r.rating} />
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    <span className="text-sm text-neutral-500">on <strong className="text-neutral-800">{r.product?.name ?? "a deleted product"}</strong></span>
                  </div>
                  {r.title ? <p className="font-semibold">{r.title}</p> : null}
                  {r.body ? <p className="whitespace-pre-line text-sm text-neutral-700">{r.body}</p> : null}
                  {r.photos && r.photos.length > 0 ? (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {r.photos.map((ph) => (
                        <div key={ph.id} className="text-center">
                          <a href={ph.url} target="_blank" rel="noopener noreferrer" className="block size-20 overflow-hidden rounded-lg bg-neutral-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ph.url} alt="Customer photo" loading="lazy" className="size-full object-cover" />
                          </a>
                          <button type="button" className="mt-1 text-xs text-red-700 underline" onClick={() => setPhotoToRemove({ review: r, photoId: ph.id })}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-neutral-500">{r.authorName}{r.customerEmail ? ` · ${r.customerEmail}` : ""} · {new Date(r.createdAt).toLocaleDateString()}</p>
                  {r.reply ? <p className="rounded-xl bg-neutral-50 p-3 text-sm"><strong>Your reply:</strong> {r.reply}</p> : null}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
                    {reviewActions(r.status).map((a) => <button key={a.to} type="button" className="font-medium text-brand hover:underline" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, body: { status: a.to } })}>{a.label}</button>)}
                    <button type="button" className="font-medium text-brand hover:underline" onClick={() => { setReply(r.reply ?? ""); setReplying(r); }}>{r.reply ? "Edit reply" : "Reply"}</button>
                    <button type="button" className="text-red-700 underline" onClick={() => setToDelete(r)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
            <Pager meta={query.data.meta} onPage={setPage} />
          </>
        ) : null}
      </Card>

      <Modal open={replying !== null} onClose={() => setReplying(null)} title="Reply to this review" footer={<>
        <Button variant="secondary" onClick={() => setReplying(null)}>Cancel</Button>
        <Button disabled={update.isPending} onClick={() => replying && update.mutate({ id: replying.id, body: { reply: reply.trim() || null } })}>{update.isPending ? "Saving…" : reply.trim() ? "Post reply" : "Remove reply"}</Button>
      </>}>
        {replying ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-neutral-50 p-3 text-sm"><Stars rating={replying.rating} /> {replying.body ?? replying.title ?? ""}</p>
            <TextArea label="Your reply" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} hint="Shown publicly under the review." />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog open={photoToRemove !== null} title="Remove this photo?" message="The photo is deleted from the review. The review itself stays." confirmLabel="Remove photo" busy={removePhoto.isPending} onConfirm={() => photoToRemove && removePhoto.mutate(photoToRemove)} onClose={() => setPhotoToRemove(null)} />
      <ConfirmDialog open={toDelete !== null} title="Delete this review?" message="It disappears from the product page and the product's rating is recalculated. The customer can write a new one." confirmLabel="Delete review" busy={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
    </>
  );
}
