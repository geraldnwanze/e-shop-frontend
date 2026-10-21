"use client";

import { useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { newsletterSchema } from "@/lib/schemas";

import { Button } from "../ui/Button";

export function NewsletterForm({ className = "" }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = newsletterSchema.safeParse({ email });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setError(null);
    setState("loading");
    try {
      await api.post("newsletter", { email: parsed.data.email });
      setState("done");
    } catch (e) {
      setState("idle");
      setError(e instanceof ApiError ? e.fieldErrors.email?.[0] ?? e.message : "Could not subscribe. Try again.");
    }
  }

  if (state === "done") return <p role="status" className={className}>Thanks for subscribing!</p>;

  return (
    <form onSubmit={submit} noValidate className={`flex w-full max-w-md flex-col gap-2 sm:flex-row ${className}`}>
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="min-w-0 flex-1 rounded-[var(--sf-radius)] border border-black/20 bg-white px-3 py-2 text-sm text-black"
      />
      <Button type="submit" disabled={state === "loading"}>{state === "loading" ? "Subscribing…" : "Subscribe"}</Button>
      {error ? <p role="alert" className="text-sm text-red-600 sm:basis-full">{error}</p> : null}
    </form>
  );
}
