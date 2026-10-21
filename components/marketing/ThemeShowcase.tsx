"use client";

import Image from "next/image";
import { useState } from "react";

import { SectionHeading } from "./Sections";

interface Look { id: string; name: string; blurb: string; sample: string; colors: string[]; fonts: string }

/** Screenshots of real demo stores live in /public/themes ({id}-desktop.jpg and {id}-mobile.jpg). */
const looks: Look[] = [
  { id: "minimal", name: "Minimal", blurb: "Clean and quiet. Lets products speak.", sample: "Everyday Goods", colors: ["#111827", "#f59e0b", "#ffffff"], fonts: "Inter" },
  { id: "fashion", name: "Fashion", blurb: "Editorial, high-contrast and confident.", sample: "Maison Noir", colors: ["#1c1917", "#a16207", "#faf8f5"], fonts: "Playfair Display + Lato" },
  { id: "modern", name: "Modern", blurb: "Bold colour, soft corners, everyday retail.", sample: "Pulse Lifestyle", colors: ["#5b21b6", "#f97316", "#fffdf7"], fonts: "Poppins + DM Sans" },
  { id: "electronics", name: "Electronics", blurb: "Dense, technical and fast to scan.", sample: "VoltHub", colors: ["#0f172a", "#0891b2", "#f8fafc"], fonts: "Montserrat + Roboto" },
  { id: "beauty", name: "Beauty", blurb: "Soft, warm and delicate.", sample: "Glow Studio", colors: ["#9d174d", "#db2777", "#fffaf8"], fonts: "Playfair Display + Nunito" },
  { id: "restaurant", name: "Restaurant", blurb: "Appetising menus and easy ordering.", sample: "Casa Brasa", colors: ["#7c2d12", "#d97706", "#fffbf5"], fonts: "Merriweather + Open Sans" },
];

export function ThemeShowcase() {
  const [active, setActive] = useState(looks[2].id);
  const look = looks.find((l) => l.id === active) ?? looks[0];

  return (
    <section id="themes" className="scroll-mt-20 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Themes" title="A look for every kind of store">
          Pick a starting point, then make it yours with colours, fonts and layout.
        </SectionHeading>

        <div role="tablist" aria-label="Themes" className="mt-6 flex flex-wrap justify-center gap-2">
          {looks.map((l) => (
            <button key={l.id} id={`theme-tab-${l.id}`} role="tab" aria-selected={l.id === active} aria-controls="theme-panel" onClick={() => setActive(l.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${l.id === active ? "mk-btn-primary border-transparent" : "border-mk-border bg-mk-raised hover:bg-mk-surface"}`}>
              {l.name}
            </button>
          ))}
        </div>

        <div id="theme-panel" role="tabpanel" aria-labelledby={`theme-tab-${look.id}`} className="mx-auto mt-6" style={{ width: "min(100%, max(20rem, calc((100svh - 29rem) * 1.55)))" }}>
          <div className="relative">
            <div className="mk-card overflow-hidden rounded-2xl shadow-2xl">
              <div className="flex items-center gap-2 border-b border-mk-border bg-mk-surface px-3 py-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-green-400" />
                <span className="ml-3 flex-1 truncate rounded-md bg-mk-raised px-3 py-0.5 text-[11px] text-mk-muted">{look.id}.yourstore.com</span>
              </div>
              <Image key={look.id} src={`/themes/${look.id}-desktop.jpg`} alt={`The ${look.name} theme on a desktop screen, showing the ${look.sample} demo store`} width={1200} height={775} sizes="(min-width: 1024px) 720px, 100vw" className="block h-auto w-full" unoptimized />
            </div>

            <div className="absolute -bottom-3 -right-2 w-[17%] min-w-14 overflow-hidden rounded-[1rem] border-[3px] border-mk-fg bg-mk-fg shadow-2xl sm:-right-4 sm:rounded-[1.25rem] sm:border-4">
              <Image key={`${look.id}-m`} src={`/themes/${look.id}-mobile.jpg`} alt={`The ${look.name} theme on a phone`} width={560} height={1120} sizes="140px" className="block h-auto w-full rounded-[0.8rem]" unoptimized />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center text-sm">
            <p className="font-semibold">{look.name}: <span className="font-normal text-mk-muted">{look.blurb}</span></p>
            <p className="flex items-center gap-2 text-mk-muted">
              <span className="flex" aria-label="Recommended colours" role="img">{look.colors.map((c) => <span key={c} className="-ml-1 size-5 rounded-full ring-2 ring-mk-raised first:ml-0" style={{ background: c }} />)}</span>
              {look.fonts}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
