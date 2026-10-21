import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";
import { headingStyle } from "@/themes/shared/ui";

/** The tinted title band at the top of every inner page, in the store's own colours and heading style. */
export function PageBanner({ title, crumbs, children, className = "" }: { title: string; crumbs?: { label: string; href?: string }[]; children?: ReactNode; className?: string }) {
  return (
    <section className={`sf-banner border-b border-black/5 bg-primary/[0.04] ${className}`}>
      <Container className="py-8 sm:py-10">
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="sf-banner-crumbs mb-3 flex flex-wrap items-center gap-x-2 text-sm opacity-70">
            {crumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.href ? <Link href={crumb.href} className="underline-offset-4 hover:underline">{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="sf-banner-title font-heading text-3xl sm:text-4xl" style={headingStyle}>{title}</h1>
        {children ? <div className="sf-banner-sub mt-2 text-sm opacity-70">{children}</div> : null}
      </Container>
    </section>
  );
}

/** A rounded card for a block of a page. `step` numbers it (used for the checkout stages). */
export function Panel({ title, step, children, className = "", id }: { title?: string; step?: number; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={id} className={`sf-panel rounded-[var(--sf-radius)] bg-surface p-5 shadow-sm ring-1 ring-black/10 sm:p-6 ${className}`}>
      {title ? (
        <h2 id={id} className="sf-panel-title mb-5 flex items-center gap-3 font-heading text-lg font-semibold">
          {step ? <span aria-hidden="true" className="sf-step grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">{step}</span> : null}
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

const TONES = {
  success: { mark: "✓", ring: "bg-green-100 text-green-700" },
  warn: { mark: "…", ring: "bg-amber-100 text-amber-700" },
  error: { mark: "!", ring: "bg-red-100 text-red-700" },
  neutral: { mark: "i", ring: "bg-primary/10 text-primary" },
} as const;

/** A centred result screen: a coloured mark, a heading, a short message and the next actions. */
export function StatusCard({ tone = "neutral", title, children, actions }: { tone?: keyof typeof TONES; title: string; children?: ReactNode; actions?: ReactNode }) {
  const t = TONES[tone];

  return (
    <Container className="max-w-xl py-16 sm:py-24">
      <div className="sf-panel rounded-[var(--sf-radius)] bg-surface p-8 text-center shadow-lg ring-1 ring-black/10 sm:p-12">
        <div aria-hidden="true" className={`mx-auto grid size-16 place-items-center rounded-full text-3xl font-bold ${t.ring}`}>{t.mark}</div>
        <h1 className="font-heading mt-6 text-2xl sm:text-3xl" style={headingStyle}>{title}</h1>
        {children ? <div className="mt-3 opacity-80" role="status" aria-live="polite">{children}</div> : null}
        {actions ? <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div> : null}
      </div>
    </Container>
  );
}
