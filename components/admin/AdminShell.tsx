"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { adminApi } from "@/lib/admin/client";
import { errorMessage, useBilling, useMe, useStore } from "@/lib/admin/hooks";

import { BoxIcon, CardIcon, ExternalIcon, FunnelIcon, MailIcon, StarIcon, GlobeIcon, GridIcon, ImageIcon, MenuIcon, PaletteIcon, PercentIcon, ReceiptIcon, RegisterIcon, SlidersIcon, StoreIcon, TagIcon, TrendIcon, TruckIcon, UserIcon, UsersIcon } from "./icons";
import { Avatar, BrandMark, SidebarNav, TopBar, type ShellNavGroup, type ShellNavItem } from "./shell-parts";
import { useToast } from "./Toast";
import { Notice, Spinner } from "./ui";

interface PermissionNavItem extends ShellNavItem { permission?: string }
interface PermissionNavGroup { heading?: string; items: PermissionNavItem[] }

const NAV: PermissionNavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Overview", icon: GridIcon, permission: "orders.manage", exact: true },
      { href: "/dashboard/pos", label: "Point of sale", icon: RegisterIcon, permission: "orders.manage", exact: true },
      { href: "/dashboard/pos/reports", label: "POS reports", icon: TrendIcon, permission: "orders.manage" },
      { href: "/dashboard/orders", label: "Orders", icon: ReceiptIcon, permission: "orders.manage" },
      { href: "/dashboard/products", label: "Products", icon: BoxIcon, permission: "catalog.manage" },
      { href: "/dashboard/reviews", label: "Reviews", icon: StarIcon, permission: "catalog.manage" },
      { href: "/dashboard/categories", label: "Categories", icon: TagIcon, permission: "catalog.manage" },
      { href: "/dashboard/customers", label: "Customers", icon: UsersIcon, permission: "customers.manage", exact: true },
      { href: "/dashboard/customers/segments", label: "Segments", icon: FunnelIcon, permission: "customers.manage" },
      { href: "/dashboard/campaigns", label: "Campaigns", icon: MailIcon, permission: "customers.manage" },
      { href: "/dashboard/discounts", label: "Discounts", icon: PercentIcon, permission: "catalog.manage" },
      { href: "/dashboard/media", label: "Media", icon: ImageIcon, permission: "catalog.manage" },
    ],
  },
  {
    heading: "Store",
    items: [
      { href: "/dashboard/store", label: "Details & branding", icon: StoreIcon, permission: "store.manage", exact: true },
      { href: "/dashboard/store/theme", label: "Theme", icon: PaletteIcon, permission: "store.manage" },
      { href: "/dashboard/store/domains", label: "Domains", icon: GlobeIcon, permission: "domains.manage" },
      { href: "/dashboard/pages", label: "Pages", icon: ReceiptIcon, permission: "store.manage" },
      { href: "/dashboard/shipping", label: "Shipping", icon: TruckIcon, permission: "store.manage" },
      { href: "/dashboard/store/settings", label: "Settings & payments", icon: SlidersIcon, permission: "store.manage" },
      { href: "/dashboard/billing", label: "Billing", icon: CardIcon, permission: "billing.manage" },
    ],
  },
  { items: [{ href: "/dashboard/settings", label: "Account", icon: UserIcon }] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: me, isLoading } = useMe();
  const { data: store } = useStore(me !== undefined);
  const { data: billing } = useBilling(me?.permissions.includes("billing.manage") === true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (me?.role === "platform_admin") router.replace("/admin");
  }, [me, router]);

  const logout = useMutation({
    mutationFn: () => adminApi.post("auth/logout"),
    onSettled: () => {
      queryClient.clear();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload deliberately discards all client state across the auth boundary
      window.location.assign("/login");
    },
  });

  const resend = useMutation({
    mutationFn: () => adminApi.post("auth/email/resend"),
    onSuccess: () => toast.success("Verification email sent"),
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !me || me.role === "platform_admin") return <div className="mx-auto max-w-xl px-6 py-24"><Spinner label="Loading your dashboard…" /></div>;

  const can = (permission?: string) => !permission || me.permissions.includes(permission);
  const groups: ShellNavGroup[] = NAV.map((group) => ({ heading: group.heading, items: group.items.filter((item) => can(item.permission)) })).filter((group) => group.items.length > 0);
  const storeName = me.tenant?.name ?? "Dashboard";

  return (
    <div className="bo min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>

      <aside id="dashboard-nav" className={`${menuOpen ? "block" : "hidden"} bo-sidebar text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto`}>
        <div className="hidden px-5 pb-4 pt-6 lg:block">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold leading-tight">{storeName}</p>
              <p className="text-xs text-white/45">Merchant dashboard</p>
            </div>
          </div>
          {store ? (
            <a href={store.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <span className="truncate">View storefront</span>
              <ExternalIcon className="size-3.5 shrink-0" />
            </a>
          ) : null}
        </div>
        <SidebarNav label="Dashboard" groups={groups} pathname={pathname} />
      </aside>

      <div className="min-w-0">
        <TopBar
          left={
            <>
              <button type="button" className="grid size-9 place-items-center rounded-lg border border-black/10 bg-white lg:hidden" aria-label="Menu" aria-expanded={menuOpen} aria-controls="dashboard-nav" onClick={() => setMenuOpen((o) => !o)}>
                <MenuIcon className="size-5" />
              </button>
              <p className="truncate font-display font-bold lg:hidden">{storeName}</p>
            </>
          }
          right={
            <>
              <span className="hidden items-center gap-2.5 sm:flex">
                <Avatar name={me.name} />
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{me.name}</span>
                  <span className="block text-xs capitalize text-neutral-500">{me.role.replace("merchant_", "")}</span>
                </span>
              </span>
              <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className="rounded-lg border border-black/10 bg-white px-3.5 py-2 text-sm font-medium transition-colors hover:bg-neutral-50 disabled:opacity-50">Sign out</button>
            </>
          }
        />

        {!me.emailVerified ? (
          <div className="px-4 pt-4 lg:px-8">
            <Notice tone="amber">
              {store?.acceptingOrders === false ? "Your store isn't taking orders yet. Verify your email address to start selling." : "Please verify your email address."} <button type="button" className="font-semibold underline" onClick={() => resend.mutate()} disabled={resend.isPending}>Resend verification email</button>
            </Notice>
          </div>
        ) : null}

        {billing?.subscription && pathname !== "/dashboard/billing" && (billing.subscription.status === "trialing" || billing.subscription.status === "past_due") ? (
          <div className="px-4 pt-4 lg:px-8">
            {billing.subscription.status === "past_due" ? (
              <Notice tone="red">We couldn&apos;t renew your plan. <Link href="/dashboard/billing" className="font-semibold underline">Update your payment</Link> to keep your features.</Notice>
            ) : (
              <Notice tone="blue">
                Your free trial of {billing.subscription.plan.name} ends in {billing.subscription.trialDaysLeft ?? 0} day{billing.subscription.trialDaysLeft === 1 ? "" : "s"}. <Link href="/dashboard/billing" className="font-semibold underline">Choose a plan</Link> to keep your features.
              </Notice>
            )}
          </div>
        ) : null}

        <main id="content" className="bo-enter mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
