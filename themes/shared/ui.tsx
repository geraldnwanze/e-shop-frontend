import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { LiveSearch } from "@/components/store/LiveSearch";
import type { Product } from "@/lib/types";
import { stockNote } from "@/lib/stock-note";

/** Heading style every theme shares: its own case, tracking and weight come from theme tokens. */
export const headingStyle: CSSProperties = {
  textTransform: "var(--sf-heading-transform)" as never,
  letterSpacing: "var(--sf-heading-tracking)",
  fontWeight: "var(--sf-heading-weight)" as never,
};

export function ArrowIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`${className} fill-none stroke-current`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function SearchIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`${className} fill-none stroke-current`} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5L17 17" />
    </svg>
  );
}

/** Header search: a pill with live suggestions, submitting to the product list on Enter. */
export function HeaderSearch({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return <LiveSearch className={className} tone={tone} />;
}

/** Eyebrow + title + optional "view all" link, used above every homepage section. */
export function SectionHeader({ eyebrow, title, href, linkLabel = "View all", align = "left", className = "" }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; align?: "left" | "center"; className?: string }) {
  return (
    <div className={`mb-8 flex items-end gap-4 ${align === "center" ? "flex-col items-center text-center" : "justify-between"} ${className}`}>
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent brightness-90">{eyebrow}</p> : null}
        <h2 className="font-heading text-3xl sm:text-4xl" style={headingStyle}>{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium">
          <span className="underline-offset-4 group-hover:underline">{linkLabel}</span>
          <ArrowIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

/** "Sold out" and "Only N left" tags in the corner of a product photo. */
export function ProductBadges({ product, className = "left-3 top-3" }: { product: Product; className?: string }) {
  const note = product.variants.length === 0 ? stockNote(product.unitsLeft) : null;

  if (product.inStock && !note) return null;

  return (
    <div className={`absolute z-10 flex flex-col items-start gap-1.5 ${className}`}>
      {!product.inStock ? <span className="rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Sold out</span> : null}
      {note ? <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-black">{note}</span> : null}
    </div>
  );
}

/** Soft glows and a dot grid for heroes without a photo, drawn from the store's own colours. */
export function HeroBackdrop({ tone = "primary" }: { tone?: "primary" | "soft" }) {
  const dots = tone === "primary" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.07)";

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -right-32 -top-32 size-[34rem] rounded-full bg-accent/35 blur-3xl" />
      <div className={`absolute -bottom-40 left-1/3 size-[30rem] rounded-full blur-3xl ${tone === "primary" ? "bg-white/10" : "bg-primary/15"}`} />
      <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${dots} 1px, transparent 1px)`, backgroundSize: "24px 24px" }} />
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border border-current/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] backdrop-blur ${className}`}>{children}</span>;
}
