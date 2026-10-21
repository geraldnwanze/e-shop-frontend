import Link from "next/link";
import type { ReactNode } from "react";
import { BoxIcon, CardIcon, ChartIcon, GlobeIcon, PaletteIcon, ReceiptIcon, ShieldIcon, SparkIcon, StoreIcon } from "./Icons";

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mk-reveal mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-mk-brand">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-mk-muted">{children}</p>}
    </div>
  );
}

const features = [
  { icon: StoreIcon, title: "Your store, instantly", text: "Every merchant gets an isolated store with its own catalogue, customers and orders. Nothing is ever shared across stores.", span: "lg:col-span-2" },
  { icon: GlobeIcon, title: "Custom domains", text: "Connect yourbrand.shop.com (or your own domain) with a simple DNS check. Verified domains go live automatically.", span: "" },
  { icon: PaletteIcon, title: "Themes you control", text: "Six polished themes plus colours, fonts and layout options. No code required.", span: "" },
  { icon: CardIcon, title: "Paystack & Flutterwave", text: "Bring your own gateway keys; payments are confirmed server-side with the provider before an order is marked paid.", span: "lg:col-span-2" },
  { icon: BoxIcon, title: "Products & inventory", text: "Variants, SKUs, stock tracking and a full movement history, so counts always add up.", span: "" },
  { icon: ReceiptIcon, title: "Checkout that retries safely", text: "Idempotent checkout and refunds mean a flaky network never double-charges a customer.", span: "" },
  { icon: ChartIcon, title: "Dashboard & analytics", text: "Orders, revenue and customers at a glance, with team roles for staff.", span: "" },
  { icon: ShieldIcon, title: "Built secure", text: "Encrypted gateway keys, strict tenant isolation, audit logs and rate limits out of the box.", span: "lg:col-span-2" },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Features" title={<>Everything you need to <span className="mk-gradient-text">sell online</span></>}>
          One platform for the storefront, the back office and the money.
        </SectionHeading>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text, span }) => (
            <article key={title} className={`mk-reveal mk-card group rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 ${span}`}>
              <span className="grid size-11 place-items-center rounded-xl bg-mk-brand/12 text-mk-brand transition-colors group-hover:bg-mk-brand group-hover:text-white"><Icon className="size-5.5" /></span>
              <h3 className="mt-5 font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mk-muted">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { n: "01", title: "Create your store", text: "Sign up, name your store and pick a currency. Your storefront is live on a subdomain right away." },
  { n: "02", title: "Add products & connect payments", text: "Upload products, choose a theme and paste your Paystack or Flutterwave keys." },
  { n: "03", title: "Go live on your domain", text: "Point your domain at us, verify it, and start taking orders." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-mk-border bg-mk-surface py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How it works" title="From idea to first order in three steps" />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="mk-reveal mk-card relative rounded-2xl p-7">
              <span className="mk-gradient-text font-display text-5xl font-extrabold">{s.n}</span>
              <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-mk-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function FinalCta({ registrationOpen, name }: { registrationOpen: boolean; name: string }) {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mk-aurora mk-card relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-16 text-center sm:py-20">
        <SparkIcon className="mx-auto size-8 text-mk-accent" />
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Ready to open your store on {name}?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-mk-muted">Start on the free plan and upgrade when you grow.</p>
        <Link href={registrationOpen ? "/register" : "/login"} className="mk-btn-primary mt-8 inline-block rounded-full px-8 py-4 text-base font-semibold">
          {registrationOpen ? "Create your store" : "Sign in"}
        </Link>
      </div>
    </section>
  );
}

export function Footer({ name, supportEmail }: { name: string; supportEmail: string | null }) {
  return (
    <footer className="border-t border-mk-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-mk-muted sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
        <nav aria-label="Footer" className="flex items-center gap-6">
          <a href="#features" className="hover:text-mk-fg">Features</a>
          <a href="#pricing" className="hover:text-mk-fg">Pricing</a>
          <Link href="/login" className="hover:text-mk-fg">Sign in</Link>
          {supportEmail && <a href={`mailto:${supportEmail}`} className="hover:text-mk-fg">Contact</a>}
        </nav>
      </div>
    </footer>
  );
}
