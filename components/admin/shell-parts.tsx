"use client";

import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { StoreIcon } from "./icons";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
}

export interface ShellNavGroup {
  heading?: string;
  items: ShellNavItem[];
}

export function BrandMark({ size = "size-9" }: { size?: string }) {
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_20px_-8px_rgb(91_61_245/0.9)]`} style={{ backgroundImage: "linear-gradient(135deg,#5b3df5,#8344ee 55%,#c42a9f)" }}>
      <StoreIcon className="size-[55%]" />
    </span>
  );
}

export function Avatar({ name, className = "size-9 text-sm" }: { name: string; className?: string }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  return (
    <span aria-hidden className={`${className} grid shrink-0 place-items-center rounded-full font-bold text-white`} style={{ backgroundImage: "linear-gradient(135deg,#5b3df5,#c42a9f)" }}>
      {initial}
    </span>
  );
}

/** Sidebar navigation shared by the merchant dashboard and the platform console. */
export function SidebarNav({ label, groups, pathname }: { label: string; groups: ShellNavGroup[]; pathname: string }) {
  return (
    <nav aria-label={label} className="space-y-6 px-3 pb-6 pt-2">
      {groups.map((group, i) => (
        <div key={i}>
          {group.heading ? <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">{group.heading}</p> : null}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
                  >
                    {active ? <span aria-hidden className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#8b7bff] to-[#ff5fc4]" /> : null}
                    <Icon className={`size-[18px] shrink-0 transition-colors ${active ? "text-[#b5a9ff]" : "text-white/45 group-hover:text-white/80"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function TopBar({ left, right }: { left?: ReactNode; right: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/[0.06] bg-white/75 px-4 py-3 backdrop-blur-xl lg:px-8">
      {left}
      <div className="ml-auto flex items-center gap-3 text-sm">{right}</div>
    </header>
  );
}
