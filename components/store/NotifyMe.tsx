"use client";

import { useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { newsletterSchema } from "@/lib/schemas";

import { Button } from "../ui/Button";

type Option = { id: string; name: string };

/** Lets a shopper ask to be emailed when a sold-out product (or one of its options) returns. */
export function NotifyMe({ slug, options }: { slug: string; options: Option[] }) {
  const [email, setEmail] = useState("");
  const [variantId, setVariantId] = useState(options[0]?.id ?? "");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = newsletterSchema.safeParse({ email });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setError(null);
    setState("loading");
    try {
      await api.post(`products/${slug}/stock-alerts`, { email: parsed.data.email, ...(options.length > 0 ? { variant_id: variantId } : {}) });
      setState("done");
    } catch (e) {
      setState("idle");
      setError(e instanceof ApiError ? e.fieldErrors.email?.[0] ?? e.message : "Could not save your request. Try again.");
    }
  }

  if (state === "done") return <p role="status" className="text-sm">Done. We will email you when it is back.</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-2 rounded-[var(--sf-radius)] border border-black/15 p-4">
      <p className="text-sm font-medium">{options.length > 0 ? "Sold-out option? Get an email when it returns." : "Sold out. Get an email when it returns."}</p>
      {options.length > 0 ? (
        <>
          <label htmlFor="notify-option" className="sr-only">Option</label>
          <select id="notify-option" value={variantId} onChange={(e) => setVariantId(e.target.value)} className="w-full rounded-[var(--sf-radius)] border border-black/20 bg-white px-3 py-2 text-sm text-black">
            {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="notify-email" className="sr-only">Email address</label>
        <input id="notify-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="min-w-0 flex-1 rounded-[var(--sf-radius)] border border-black/20 bg-white px-3 py-2 text-sm text-black" />
        <Button type="submit" disabled={state === "loading"}>{state === "loading" ? "Saving…" : "Notify me"}</Button>
      </div>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
