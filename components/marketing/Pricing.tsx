"use client";

import Link from "next/link";
import { useState } from "react";

import type { Plan } from "@/lib/admin/platform-types";
import { formatPriceCompact } from "@/lib/money";

import { CheckIcon } from "./Icons";
import { SectionHeading } from "./Sections";

export interface BillingPeriod { months: number; discountPercent: number }

function limitLines(plan: Plan): string[] {
  const { products, custom_domains } = plan.limits;
  return [
    products === null ? "Unlimited products" : `Up to ${products.toLocaleString("en")} products`,
    custom_domains === null ? "Unlimited custom domains" : custom_domains === 0 ? "Subdomain only" : `${custom_domains} custom domain${custom_domains === 1 ? "" : "s"}`,
  ];
}

/** Price per month in minor units for a billing period, rounded to whole major units like the API does. */
function perMonth(plan: Plan, discountPercent: number): number {
  const monthly = plan.interval === "yearly" ? plan.price / 12 : plan.price;

  return Math.round((monthly * (100 - discountPercent)) / 100 / 100) * 100;
}

const periodName = (months: number) => (months === 1 ? "Monthly" : months === 12 ? "Yearly" : `Every ${months} months`);

export function Pricing({ plans, registrationOpen, trialDays = 0, periods = [{ months: 1, discountPercent: 0 }] }: { plans: Plan[] | null; registrationOpen: boolean; trialDays?: number; periods?: BillingPeriod[] }) {
  const [months, setMonths] = useState(periods.find((p) => p.months === 12)?.months ?? periods[0].months);
  const discount = periods.find((p) => p.months === months)?.discountPercent ?? 0;
  const popular = plans && plans.length >= 3 ? plans[1].id : null;

  return (
    <section id="pricing" className="scroll-mt-20 border-y border-mk-border bg-mk-surface py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Pricing" title="Simple pricing that grows with you">
          {trialDays > 0 ? `Try everything free for ${trialDays} days. No card needed.` : "Start free. Upgrade when your store outgrows it."}
        </SectionHeading>

        {periods.length > 1 ? (
          <div role="radiogroup" aria-label="Billing period" className="mx-auto mt-10 flex w-fit flex-wrap justify-center gap-1 rounded-full border border-mk-border bg-mk-raised p-1">
            {periods.map((p) => (
              <button key={p.months} type="button" role="radio" aria-checked={months === p.months} onClick={() => setMonths(p.months)} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${months === p.months ? "mk-btn-primary" : "text-mk-muted hover:text-mk-fg"}`}>
                {periodName(p.months)}{p.discountPercent > 0 ? <span className="ml-1.5 text-xs opacity-80">−{p.discountPercent}%</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        {!plans || plans.length === 0 ? (
          <p className="mt-12 text-center text-mk-muted">Plans are being updated. Please check back shortly.</p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isPopular = plan.id === popular;
              const free = plan.price === 0;
              return (
                <article key={plan.id} className={`mk-reveal mk-card relative flex flex-col rounded-3xl p-8 ${isPopular ? "ring-2 ring-mk-brand" : ""}`}>
                  {isPopular && <span className="mk-btn-primary absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-semibold">Most popular</span>}
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  {plan.description && <p className="mt-1 text-sm text-mk-muted">{plan.description}</p>}
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-extrabold">{free ? "Free" : formatPriceCompact(perMonth(plan, discount), plan.currency)}</span>
                    {!free && <span className="text-mk-muted">/ month</span>}
                  </p>
                  {!free && months > 1 ? <p className="mt-1 text-xs text-mk-muted">Billed {formatPriceCompact(perMonth(plan, discount) * months, plan.currency)} {months === 12 ? "yearly" : `every ${months} months`}</p> : null}
                  <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
                    {[...new Set([...limitLines(plan), ...plan.features])].map((f) => (
                      <li key={f} className="flex items-start gap-2.5"><CheckIcon className="mt-0.5 size-4 shrink-0 text-mk-good" />{f}</li>
                    ))}
                  </ul>
                  {registrationOpen ? (
                    <Link href="/register" className={`mt-8 rounded-full py-3 text-center text-sm font-semibold ${isPopular ? "mk-btn-primary" : "border border-mk-border hover:bg-mk-surface"}`}>
                      {free ? "Start free" : trialDays > 0 ? `Try ${plan.name} free` : `Get ${plan.name}`}
                    </Link>
                  ) : (
                    <Link href="/login" className="mt-8 rounded-full border border-mk-border py-3 text-center text-sm font-semibold hover:bg-mk-surface">Sign in</Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-8 text-center text-sm text-mk-muted">
          {trialDays > 0 ? `Every new store starts with a ${trialDays}-day free trial of our best plan. Subscribe to keep it, or stay on the free plan.` : "New stores start on the free plan."} Cancel any time.
        </p>
      </div>
    </section>
  );
}
