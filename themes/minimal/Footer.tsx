import Link from "next/link";

import { Container } from "@/components/ui/Container";

import type { BundleProps } from "../types";

const SOCIAL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", twitter: "X / Twitter", tiktok: "TikTok", youtube: "YouTube" };

type Tone = "dark" | "light";

const TONES: Record<Tone, { shell: string; rule: string; chip: string }> = {
  dark: { shell: "bg-foreground text-surface", rule: "border-white/10", chip: "border-white/20 hover:border-white/50" },
  light: { shell: "bg-primary/[0.05] text-foreground", rule: "border-black/10", chip: "border-black/20 hover:border-black/50" },
};

export function Footer({ bundle }: BundleProps) {
  return <FooterBody bundle={bundle} tone="dark" />;
}

export function LightFooter({ bundle }: BundleProps) {
  return <FooterBody bundle={bundle} tone="light" />;
}

function FooterBody({ bundle, tone }: BundleProps & { tone: Tone }) {
  const t = TONES[tone];
  const { store, configuration, settings } = bundle;
  const socials = Object.entries(configuration.social).filter(([, url]) => Boolean(url)) as [string, string][];
  const link = "opacity-70 transition-opacity hover:opacity-100";

  return (
    <footer className={`${t.shell} text-sm`}>
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-heading text-2xl font-bold">{store.name}</p>
          {configuration.footer.text ? <p className="mt-3 max-w-sm opacity-70">{configuration.footer.text}</p> : null}
          {socials.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {socials.map(([key, url]) => (
                <li key={key}><a href={url} target="_blank" rel="noopener noreferrer" className={`inline-block rounded-full border px-3 py-1 text-xs opacity-80 transition hover:opacity-100 ${t.chip}`}>{SOCIAL_LABELS[key] ?? key}</a></li>
              ))}
            </ul>
          ) : null}
        </div>
        <nav aria-label="Footer">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] opacity-50">Shop</p>
          <ul className="space-y-2.5">
            <li><Link href="/products" className={link}>All products</Link></li>
            {(bundle.pages ?? []).map((page) => <li key={page.slug}><Link href={`/pages/${page.slug}`} className={link}>{page.title}</Link></li>)}
            {configuration.footer.links.map((item) => <li key={`${item.label}-${item.url}`}><Link href={item.url} className={link}>{item.label}</Link></li>)}
            <li><Link href="/orders/track" className={link}>Track your order</Link></li>
          </ul>
        </nav>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] opacity-50">Contact</p>
          <ul className="space-y-2.5">
            {settings.contact.email ? <li><a href={`mailto:${settings.contact.email}`} className={link}>{settings.contact.email}</a></li> : null}
            {settings.contact.phone ? <li><a href={`tel:${settings.contact.phone}`} className={link}>{settings.contact.phone}</a></li> : null}
            {settings.contact.address ? <li className="opacity-70">{settings.contact.address}</li> : null}
          </ul>
        </div>
      </Container>
      <div className={`border-t ${t.rule}`}>
        <Container className="py-5 text-xs opacity-50">© {new Date().getFullYear()} {store.name}. All rights reserved.</Container>
      </div>
    </footer>
  );
}
