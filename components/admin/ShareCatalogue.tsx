"use client";

import { useState } from "react";

import { useStore } from "@/lib/admin/hooks";
import { catalogueShareText, whatsappShareLink } from "@/lib/catalogue";

import { Button } from "@/components/ui/Button";

import { Card, CardBody, CardHeader } from "./ui";

/** A link to the public catalogue page that merchants can paste into WhatsApp, Instagram bios and so on. */
export function ShareCatalogue() {
  const { data: store } = useStore();
  const [copied, setCopied] = useState(false);

  if (!store) return null;

  const url = `${store.url.replace(/\/$/, "")}/catalogue`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your catalogue link:", url);
    }
  }

  return (
    <Card>
      <CardHeader title="Share your catalogue" description="One page with everything you sell, grouped by category. Send it to customers or put it in your social bios." />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 text-sm">{url}</code>
          <Button type="button" variant="secondary" onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={whatsappShareLink(catalogueShareText(store.name, url))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-[#25D366] px-3 py-2 text-sm font-semibold text-[#128C4B] hover:bg-[#25D366]/10">Share on WhatsApp</a>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-black/15 px-3 py-2 text-sm font-semibold hover:bg-neutral-50">Preview</a>
        </div>
        <p role="status" className="sr-only">{copied ? "Link copied" : ""}</p>
      </CardBody>
    </Card>
  );
}
