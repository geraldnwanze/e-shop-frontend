import Link from "next/link";
import { ArrowIcon, BoltIcon, CheckIcon } from "./Icons";

export function Hero({ registrationOpen, trialDays = 0 }: { registrationOpen: boolean; trialDays?: number }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="mk-aurora absolute inset-0 -z-10" />
      <div className="mk-grid absolute inset-0 -z-10 opacity-60" />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mk-hero-in mx-auto inline-flex items-center gap-2 rounded-full border border-mk-border bg-mk-raised/70 px-3.5 py-1.5 text-xs font-semibold text-mk-muted backdrop-blur">
          <BoltIcon className="size-3.5 text-mk-accent" /> Your own store, on your own domain
        </p>

        <h1 className="mk-hero-in mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-7xl">
          Launch a beautiful online store in <span className="mk-gradient-text">minutes</span>, not months.
        </h1>

        <p className="mk-hero-in mx-auto mt-6 max-w-2xl text-lg text-mk-muted [animation-delay:160ms]">
          Products, inventory, checkout, payments, themes and custom domains in one multi-tenant platform. Take payments with Paystack or Flutterwave and sell from day one.
        </p>

        <div className="mk-hero-in mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
          {registrationOpen ? (
            <Link href="/register" className="mk-btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold">
              Create your store <ArrowIcon className="size-4" />
            </Link>
          ) : (
            <Link href="/login" className="mk-btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold">
              Sign in <ArrowIcon className="size-4" />
            </Link>
          )}
          <a href="#features" className="rounded-full border border-mk-border bg-mk-raised/70 px-7 py-3.5 text-base font-semibold backdrop-blur transition-colors hover:bg-mk-surface">
            See how it works
          </a>
        </div>

        <ul className="mk-hero-in mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-mk-muted [animation-delay:320ms]">
          {[trialDays > 0 ? `${trialDays}-day free trial` : "Free plan available", "No card to start", "Cancel anytime"].map((t) => (
            <li key={t} className="flex items-center gap-1.5"><CheckIcon className="size-4 text-mk-good" />{t}</li>
          ))}
        </ul>

        <Mockup />
      </div>
    </section>
  );
}

function Mockup() {
  return (
    <div className="mk-hero-in relative mx-auto mt-16 max-w-4xl [animation-delay:420ms]" aria-hidden>
      <div className="mk-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-mk-border bg-mk-surface px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/80" /><span className="size-2.5 rounded-full bg-amber-400/80" /><span className="size-2.5 rounded-full bg-emerald-400/80" />
          <div className="mx-auto w-full max-w-xs truncate rounded-md bg-mk-bg px-3 py-1 text-center text-xs text-mk-muted">🔒 yourbrand.shop.com</div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[1.1fr_1fr] sm:p-8">
          <div className="grid place-items-center rounded-xl bg-linear-to-br from-mk-brand/25 via-mk-accent/20 to-amber-400/20 p-10">
            <div className="grid size-28 place-items-center rounded-3xl bg-mk-raised text-5xl shadow-xl">👟</div>
          </div>
          <div className="flex flex-col items-start gap-3 text-left">
            <span className="rounded-full bg-mk-good/15 px-2.5 py-1 text-xs font-semibold text-mk-good">In stock</span>
            <div className="h-5 w-3/4 rounded bg-mk-fg/85" />
            <div className="h-3 w-full rounded bg-mk-border" />
            <div className="h-3 w-5/6 rounded bg-mk-border" />
            <p className="font-display text-3xl font-bold">₦24,500</p>
            <div className="mk-btn-primary w-full rounded-full py-3 text-center text-sm font-semibold">Add to cart</div>
          </div>
        </div>
      </div>

      <div className="mk-float mk-card absolute -left-2 top-16 hidden items-center gap-3 rounded-2xl p-3.5 pr-5 text-left sm:flex lg:-left-10">
        <span className="grid size-10 place-items-center rounded-xl bg-mk-good/15 text-mk-good"><CheckIcon className="size-5" /></span>
        <div><p className="text-xs text-mk-muted">Payment received</p><p className="text-sm font-bold">₦24,500.00</p></div>
      </div>

      <div className="mk-float-slow mk-card absolute -right-2 bottom-10 hidden w-52 rounded-2xl p-4 text-left sm:block lg:-right-10">
        <p className="text-xs text-mk-muted">Revenue this week</p>
        <p className="font-display text-xl font-bold">₦1.28M</p>
        <svg viewBox="0 0 200 60" className="mt-2 w-full">
          <path className="mk-draw" d="M0 50 C25 45 35 20 60 28 S100 48 125 26 S170 8 200 12" fill="none" stroke="var(--mk-brand)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
