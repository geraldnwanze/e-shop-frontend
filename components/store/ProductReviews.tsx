"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { useCustomer } from "@/lib/hooks/use-customer";
import { distributionPercents, formatAverage, MAX_PHOTOS, photoProblem, photoSlotsLeft, reviewBlockedMessage, type Review, type ReviewAccess, type ReviewPhoto, type ReviewSummary } from "@/lib/reviews";

import { Stars } from "./Stars";

interface ReviewPage {
  items: Review[];
  currentPage: number;
  lastPage: number;
  summary: ReviewSummary;
  photos: { id: string; url: string; reviewId: string }[];
}

/** Plain <img>: review photos come from the store's media host, which may not be configured for next/image. */
function Thumb({ photo, size = "size-20" }: { photo: Pick<ReviewPhoto, "url">; size?: string }) {
  return (
    <a href={photo.url} target="_blank" rel="noopener noreferrer" className={`${size} shrink-0 overflow-hidden rounded-[var(--sf-radius)] bg-black/5`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="Photo from a customer review" loading="lazy" className="size-full object-cover" />
    </a>
  );
}

/** Reviews for one product: the rating summary, what customers wrote, and a form for those who bought it. */
export function ProductReviews({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [pages, setPages] = useState(1);
  const customer = useCustomer();

  const list = useQuery({
    queryKey: ["reviews", slug, pages],
    queryFn: async (): Promise<ReviewPage> => {
      const all: Review[] = [];
      let summary: ReviewSummary | null = null;
      let photos: ReviewPage["photos"] = [];
      let lastPage = 1;

      for (let page = 1; page <= pages; page++) {
        const result = await api.getPage<Review[], { summary: ReviewSummary; photos: ReviewPage["photos"] }>(`products/${slug}/reviews`, { page });
        all.push(...result.data);
        summary = result.meta.summary;
        photos = result.meta.photos ?? [];
        lastPage = result.meta.lastPage ?? 1;
      }

      return { items: all, currentPage: pages, lastPage, summary: summary as ReviewSummary, photos };
    },
    placeholderData: (previous) => previous,
  });

  const access = useQuery({
    queryKey: ["review-access", slug],
    enabled: customer.data != null,
    queryFn: () => api.get<ReviewAccess>(`products/${slug}/reviews/mine`),
  });

  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["reviews", slug] }), queryClient.invalidateQueries({ queryKey: ["review-access", slug] })]);
  };

  const summary = list.data?.summary;
  const blocked = reviewBlockedMessage(access.data, customer.data != null);

  return (
    <section id="reviews" aria-labelledby="reviews-h" className="mt-12 border-t border-black/10 pt-8">
      <h2 id="reviews-h" className="font-heading text-2xl">Customer reviews</h2>

      {list.isLoading ? <p role="status" className="mt-4 text-sm opacity-70">Loading reviews…</p> : list.error ? <p role="alert" className="mt-4 text-sm text-red-700">We couldn&apos;t load reviews right now.</p> : summary ? (
        <div className="mt-6 grid gap-8 md:grid-cols-[14rem_1fr]">
          <div>
            {summary.count > 0 ? (
              <>
                <p className="text-4xl font-bold">{formatAverage(summary.average)}<span className="ml-1 text-base font-normal opacity-60">/ 5</span></p>
                <Stars average={summary.average} size="size-5" className="mt-1" />
                <p className="mt-1 text-sm opacity-70">{summary.count} review{summary.count === 1 ? "" : "s"}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {distributionPercents(summary).map((row) => (
                    <li key={row.stars} className="flex items-center gap-2">
                      <span className="w-10 shrink-0">{row.stars} star</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/10"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${row.percent}%` }} /></span>
                      <span className="w-6 text-right opacity-60">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="text-sm opacity-70">No reviews yet. Be the first to share what you think.</p>}
          </div>

          <div className="space-y-8">
            {list.data && list.data.photos.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Photos from customers</h3>
                <div className="flex flex-wrap gap-2">{list.data.photos.map((p) => <Thumb key={p.id} photo={p} size="size-16" />)}</div>
              </div>
            ) : null}

            <WriteReview slug={slug} blocked={blocked} signedIn={customer.data != null} access={access.data} onChanged={refresh} />

            {list.data && list.data.items.length > 0 ? (
              <ul className="space-y-6">
                {list.data.items.map((r) => (
                  <li key={r.id} className="border-b border-black/10 pb-6 last:border-0">
                    <Stars average={r.rating} />
                    {r.title ? <h3 className="mt-1 font-semibold">{r.title}</h3> : null}
                    {r.body ? <p className="mt-1 whitespace-pre-line text-sm leading-relaxed opacity-90">{r.body}</p> : null}
                    {r.photos && r.photos.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{r.photos.map((ph) => <Thumb key={ph.id} photo={ph} />)}</div> : null}
                    <p className="mt-2 text-xs opacity-60">{r.authorName} · {new Date(r.createdAt).toLocaleDateString()} · Verified purchase</p>
                    {r.reply ? <p className="mt-3 rounded-[var(--sf-radius)] bg-black/5 p-3 text-sm"><strong>Reply from the store:</strong> {r.reply}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {list.data && list.data.currentPage < list.data.lastPage ? <Button type="button" variant="secondary" onClick={() => setPages((p) => p + 1)} disabled={list.isFetching}>{list.isFetching ? "Loading…" : "Show more reviews"}</Button> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WriteReview({ slug, blocked, signedIn, access, onChanged }: { slug: string; blocked: string | null; signedIn: boolean; access: ReviewAccess | undefined; onChanged: () => Promise<void> }) {
  const existing = access?.review ?? null;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ReviewPhoto[]>(existing?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function addPhotos(files: FileList | null) {
    setPhotoError(null);
    const chosen = Array.from(files ?? []).slice(0, photoSlotsLeft(photos.length));

    if ((files?.length ?? 0) > chosen.length) setPhotoError(`You can add up to ${MAX_PHOTOS} photos.`);

    for (const file of chosen) {
      const problem = photoProblem(file);

      if (problem) { setPhotoError(problem); continue; }

      setUploading((n) => n + 1);

      try {
        const form = new FormData();
        form.append("photo", file);
        const photo = await api.upload<ReviewPhoto>("review-photos", form);
        setPhotos((current) => [...current, photo]);
      } catch (e) {
        setPhotoError(e instanceof ApiError ? e.message : "That photo could not be uploaded. Please try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  /** Photos already saved on the review stay until the review is saved; fresh uploads are discarded right away. */
  function removePhoto(photo: ReviewPhoto) {
    setPhotos((current) => current.filter((p) => p.id !== photo.id));

    if (!(existing?.photos ?? []).some((p) => p.id === photo.id)) void api.delete(`review-photos/${photo.id}`).catch(() => undefined);
  }

  const save = useMutation({
    mutationFn: () => api.post<Review>(`products/${slug}/reviews`, { rating, title: title.trim() || null, body: body.trim() || null, photo_ids: photos.map((p) => p.id) }),
    onSuccess: async (review) => {
      setNotice(review.status === "pending" ? "Thanks! Your review will appear once the store approves it." : "Thanks for your review!");
      setEditing(false);
      await onChanged();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not save your review. Please try again."),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`products/${slug}/reviews/mine`),
    onSuccess: async () => { setNotice("Your review was deleted."); setRating(0); setTitle(""); setBody(""); setEditing(false); await onChanged(); },
  });

  if (blocked) {
    return (
      <p className="rounded-[var(--sf-radius)] bg-black/5 p-4 text-sm">
        {blocked} {!signedIn ? <Link href="/account/login" className="font-medium underline underline-offset-4">Sign in</Link> : null}
      </p>
    );
  }

  if (existing && !editing) {
    return (
      <div className="rounded-[var(--sf-radius)] border border-black/10 p-4 text-sm">
        <p className="font-medium">Your review {existing.status === "pending" ? <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Awaiting approval</span> : existing.status === "hidden" ? <span className="ml-1 rounded bg-black/10 px-2 py-0.5 text-xs">Hidden by the store</span> : null}</p>
        <Stars average={existing.rating} className="mt-1" />
        {existing.photos && existing.photos.length > 0 ? <div className="mt-2 flex gap-2">{existing.photos.map((ph) => <Thumb key={ph.id} photo={ph} size="size-14" />)}</div> : null}
        {notice ? <p role="status" className="mt-2 text-green-700">{notice}</p> : null}
        <div className="mt-3 flex gap-4">
          <button type="button" className="underline underline-offset-4" onClick={() => { setRating(existing.rating); setTitle(existing.title ?? ""); setBody(existing.body ?? ""); setPhotos(existing.photos ?? []); setNotice(null); setEditing(true); }}>Edit</button>
          <button type="button" className="text-red-700 underline underline-offset-4" disabled={remove.isPending} onClick={() => remove.mutate()}>Delete</button>
        </div>
      </div>
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) return setError("Choose a star rating.");
    save.mutate();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-[var(--sf-radius)] border border-black/10 p-4">
      <h3 className="font-semibold">{existing ? "Edit your review" : "Write a review"}</h3>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Your rating</legend>
        <div role="radiogroup" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className="sr-only">{n} star{n === 1 ? "" : "s"}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-8 ${n <= rating ? "text-amber-500" : "text-black/20"} hover:text-amber-400`}><path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8L10 1.5z" fill="currentColor" /></svg>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-title" className="mb-1 block text-sm font-medium">Headline (optional)</label>
        <input id="review-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-[var(--sf-radius)] border border-black/20 bg-transparent px-3 py-2 text-sm" />
      </div>
      <div>
        <label htmlFor="review-body" className="mb-1 block text-sm font-medium">Your review (optional)</label>
        <textarea id="review-body" rows={4} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} className="w-full rounded-[var(--sf-radius)] border border-black/20 bg-transparent px-3 py-2 text-sm" />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Photos (optional)</p>
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((p) => (
            <span key={p.id} className="relative">
              <Thumb photo={p} size="size-16" />
              <button type="button" onClick={() => removePhoto(p)} aria-label="Remove this photo" className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-black text-xs text-white">×</button>
            </span>
          ))}
          {uploading > 0 ? <span role="status" className="grid size-16 place-items-center rounded-[var(--sf-radius)] border border-dashed border-black/30 text-xs opacity-70">Uploading…</span> : null}
          {photoSlotsLeft(photos.length) > 0 && uploading === 0 ? (
            <label className="grid size-16 cursor-pointer place-items-center rounded-[var(--sf-radius)] border border-dashed border-black/30 text-center text-xs hover:bg-black/5">
              <span>+ Add<br />photo</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
            </label>
          ) : null}
        </div>
        <p className="mt-1 text-xs opacity-60">Up to {MAX_PHOTOS} photos, JPG, PNG or WebP, 5 MB each.</p>
        {photoError ? <p role="alert" className="mt-1 text-sm text-red-600">{photoError}</p> : null}
      </div>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending || uploading > 0}>{save.isPending ? "Saving…" : existing ? "Save changes" : "Submit review"}</Button>
        {existing ? <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button> : null}
      </div>
    </form>
  );
}
