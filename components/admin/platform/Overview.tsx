"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import type { PlatformOverview } from "@/lib/admin/platform-types";
import { formatMoney } from "@/lib/money";

import { BuildingIcon, CardIcon, GlobeIcon, ReceiptIcon, StoreIcon, TrendIcon, UsersIcon } from "../icons";
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner, StatusBadge, tableClasses } from "../ui";

function Stat({ label, value, hint, href, icon: Icon, tone = "brand" }: { label: string; value: string; hint?: string; href?: string; icon: ComponentType<SVGProps<SVGSVGElement>>; tone?: "brand" | "emerald" | "amber" | "pink" }) {
  const chip = { brand: "bg-brand-soft text-brand", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", pink: "bg-pink-50 text-pink-600" }[tone];
  const body = (
    <div className="h-full rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgb(20_10_90/0.04),0_14px_34px_-18px_rgb(20_10_90/0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgb(91_61_245/0.35)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl ${chip}`}><Icon className="size-[18px]" /></span>
      </div>
      <p className="mt-3 font-display text-[1.65rem] font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-2 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );

  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

const money = (list: { currency: string; amount: number }[]) => (list.length === 0 ? "—" : list.map((m) => formatMoney(m.amount, m.currency)).join(" · "));

export function PlatformOverviewPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "overview"], queryFn: () => adminApi.get<PlatformOverview>("admin/overview") });

  return (
    <>
      <PageHeader title="Overview" description="The whole platform at a glance." />
      {isLoading ? <Spinner /> : error || !data ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={BuildingIcon} label="Tenants" value={String(data.tenants.total)} hint={`${data.tenants.active} active · ${data.tenants.suspended} suspended`} href="/admin/tenants" />
            <Stat icon={TrendIcon} tone="emerald" label="New (30 days)" value={String(data.tenants.newLast30Days)} />
            <Stat icon={UsersIcon} tone="pink" label="Merchant users" value={String(data.merchantUsers)} href="/admin/users" />
            <Stat icon={ReceiptIcon} label="Orders processed" value={String(data.orders)} />
            <Stat icon={TrendIcon} tone="emerald" label="Paid volume (GMV)" value={money(data.gmv)} />
            <Stat icon={CardIcon} label="Monthly recurring revenue" value={money(data.mrr)} hint={`${data.activeSubscriptions} active subscriptions`} href="/admin/subscriptions" />
            <Stat icon={StoreIcon} tone="pink" label="Stores" value={String(data.stores)} href="/admin/stores" />
            <Stat icon={GlobeIcon} tone="amber" label="Domains needing attention" value={String(data.domainsNeedingAttention)} hint="Pending or failed" href="/admin/domains?status=pending" />
          </div>

          <Card>
            <CardHeader title="Newest tenants" action={<Link href="/admin/tenants" className="text-sm font-medium text-brand hover:underline">View all</Link>} />
            {data.recentTenants.length === 0 ? <EmptyState title="No tenants yet" /> : (
              <div className={tableClasses.wrap}>
                <table className={tableClasses.table}>
                  <thead><tr><th className={tableClasses.th}>Tenant</th><th className={tableClasses.th}>Status</th><th className={tableClasses.th}>Plan</th><th className={tableClasses.th}>Joined</th></tr></thead>
                  <tbody>
                    {data.recentTenants.map((t) => (
                      <tr key={t.id}>
                        <td className={tableClasses.td}><Link href={`/admin/tenants/${t.id}`} className="font-semibold text-brand hover:underline">{t.name}</Link><span className="block text-xs text-neutral-500">{t.slug}</span></td>
                        <td className={tableClasses.td}><StatusBadge status={t.status} /></td>
                        <td className={tableClasses.td}>{t.subscription?.plan?.name ?? <span className="text-neutral-400">None</span>}</td>
                        <td className={tableClasses.td}>{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
