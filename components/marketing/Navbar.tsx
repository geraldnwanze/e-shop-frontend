import Link from "next/link";
import { MenuIcon, StoreIcon } from "./Icons";

const links = [
  { href: "#features", label: "Features" },
  { href: "#themes", label: "Themes" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar({ name, registrationOpen }: { name: string; registrationOpen: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-mk-border bg-mk-bg/80 backdrop-blur-xl">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="mk-btn-primary grid size-8 place-items-center rounded-lg"><StoreIcon className="size-4.5" /></span>
          {name}
        </Link>

        <ul className="hidden items-center gap-8 text-sm font-medium text-mk-muted md:flex">
          {links.map((l) => (
            <li key={l.href}><a href={l.href} className="transition-colors hover:text-mk-fg">{l.label}</a></li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-mk-muted transition-colors hover:text-mk-fg">Sign in</Link>
          {registrationOpen && (
            <Link href="/register" className="mk-btn-primary rounded-full px-4 py-2 text-sm font-semibold">Start free</Link>
          )}
        </div>

        <details className="group relative md:hidden">
          <summary aria-label="Menu" className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-mk-border [&::-webkit-details-marker]:hidden">
            <MenuIcon className="size-5" />
          </summary>
          <div className="mk-card absolute right-0 top-12 flex w-60 flex-col gap-1 rounded-2xl p-2">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-mk-surface">{l.label}</a>
            ))}
            <hr className="my-1 border-mk-border" />
            <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-mk-surface">Sign in</Link>
            {registrationOpen && <Link href="/register" className="mk-btn-primary rounded-lg px-3 py-2.5 text-center text-sm font-semibold">Start free</Link>}
          </div>
        </details>
      </nav>
    </header>
  );
}
