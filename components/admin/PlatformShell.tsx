"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { adminApi } from "@/lib/admin/client";
import { useMe } from "@/lib/admin/hooks";

import { BuildingIcon, CardIcon, CogIcon, GlobeIcon, GridIcon, LayersIcon, MenuIcon, PaletteIcon, ShieldIcon, StoreIcon, UsersIcon } from "./icons";
import { Avatar, BrandMark, SidebarNav, TopBar, type ShellNavGroup } from "./shell-parts";
import { Spinner } from "./ui";

const NAV: ShellNavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Overview", icon: GridIcon, exact: true },
      { href: "/admin/tenants", label: "Tenants", icon: BuildingIcon },
      { href: "/admin/stores", label: "Stores", icon: StoreIcon },
      { href: "/admin/users", label: "Users", icon: UsersIcon },
    ],
  },
  {
    heading: "Billing & catalogue",
    items: [
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CardIcon },
      { href: "/admin/plans", label: "Plans", icon: LayersIcon },
      { href: "/admin/themes", label: "Themes", icon: PaletteIcon },
      { href: "/admin/domains", label: "Domains", icon: GlobeIcon },
    ],
  },
  {
    heading: "Platform",
    items: [
      { href: "/admin/audit-log", label: "Audit log", icon: ShieldIcon },
      { href: "/admin/settings", label: "Platform settings", icon: CogIcon },
    ],
  },
];

/** Console for platform administrators. Non-admins are sent back to their own dashboard. */
export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (me && me.role !== "platform_admin") router.replace("/dashboard");
  }, [me, router]);

  const logout = useMutation({
    mutationFn: () => adminApi.post("auth/logout"),
    onSettled: () => {
      queryClient.clear();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload deliberately discards all client state across the auth boundary
      window.location.assign("/login");
    },
  });

  if (isLoading || !me || me.role !== "platform_admin") return <div className="mx-auto max-w-xl px-6 py-24"><Spinner label="Loading the console…" /></div>;

  return (
    <div className="bo min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>

      <aside id="platform-nav" className={`${menuOpen ? "block" : "hidden"} bo-sidebar text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto`}>
        <div className="hidden items-center gap-3 px-5 pb-4 pt-6 lg:flex">
          <BrandMark />
          <div>
            <p className="font-display text-base font-bold leading-tight">Platform console</p>
            <p className="text-xs text-white/45">Administrator</p>
          </div>
        </div>
        <SidebarNav label="Platform" groups={NAV} pathname={pathname} />
      </aside>

      <div className="min-w-0">
        <TopBar
          left={
            <>
              <button type="button" className="grid size-9 place-items-center rounded-lg border border-black/10 bg-white lg:hidden" aria-label="Menu" aria-expanded={menuOpen} aria-controls="platform-nav" onClick={() => setMenuOpen((o) => !o)}>
                <MenuIcon className="size-5" />
              </button>
              <p className="font-display font-bold lg:hidden">Platform console</p>
            </>
          }
          right={
            <>
              <span className="hidden items-center gap-2.5 sm:flex">
                <Avatar name={me.name || me.email} />
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{me.name}</span>
                  <span className="block text-xs text-neutral-500">{me.email}</span>
                </span>
              </span>
              <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className="rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-medium transition-colors hover:bg-neutral-50 disabled:opacity-50">Sign out</button>
            </>
          }
        />
        <main id="content" className="bo-enter mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
