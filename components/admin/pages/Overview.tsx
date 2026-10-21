"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ComponentType, type SVGProps } from "react";

import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import { hasRecoveryActivity, recoveryRate } from "@/lib/admin/recovery";
import type { Stats } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";

import { RevenueChart } from "../BarChart";
import { ShareCatalogue } from "../ShareCatalogue";
import { ClockIcon, ReceiptIcon, TrendIcon, UsersIcon } from "../icons";
import { Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, Select, Spinner, StatusBadge, tableClasses } from "../ui";

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

export function Overview() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["stats", days], queryFn: () => adminApi.get<Stats>("dashboard/stats", { days }) });

  return (
    <>
      <PageHeader title="Overview" description="How your store is doing." actions={
        <div className="w-40"><Select label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </Select></div>
      } />

      {isLoading ? <Spinner /> : error ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon={TrendIcon} label="Net revenue" value={formatMoney(data.netRevenue, data.currency)} hint={data.refunded > 0 ? `${formatMoney(data.grossRevenue, data.currency)} gross, ${formatMoney(data.refunded, data.currency)} refunded` : "Paid orders"} />
            <Stat icon={ReceiptIcon} tone="emerald" label="Orders" value={String(data.orders)} hint={`Avg. paid order ${formatMoney(data.averageOrderValue, data.currency)}`} href="/dashboard/orders" />
            <Stat icon={UsersIcon} tone="pink" label="New customers" value={String(data.newCustomers)} href="/dashboard/customers" />
            <Stat icon={ClockIcon} tone="amber" label="Awaiting payment" value={String(data.awaitingPayment)} href="/dashboard/orders?payment_status=PENDING" />
          </div>

          {hasRecoveryActivity(data.recovery) ? (
            <Card>
              <CardHeader title="Recovered by cart reminders" description={`Orders placed within a week of a reminder email, over the last ${data.rangeDays} days.`} action={<Link href="/dashboard/store/settings" className="text-sm font-medium text-brand hover:underline">Reminder settings</Link>} />
              <CardBody>
                <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
                  <div>
                    <p className="font-display text-[1.65rem] font-extrabold leading-none tracking-tight text-ink">{formatMoney(data.recovery.recoveredRevenue, data.currency)}</p>
                    <p className="mt-2 text-xs text-neutral-500">Paid revenue brought back</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                    <div><dt className="text-neutral-500">Reminded carts</dt><dd className="font-semibold">{data.recovery.cartsReminded}</dd></div>
                    <div><dt className="text-neutral-500">Orders recovered</dt><dd className="font-semibold">{data.recovery.recoveredOrders}{recoveryRate(data.recovery) !== null ? <span className="ml-1 font-normal text-neutral-500">({recoveryRate(data.recovery)}%)</span> : null}</dd></div>
                    <div><dt className="text-neutral-500">From first reminder</dt><dd className="font-semibold">{formatMoney(data.recovery.byStage.first.revenue, data.currency)}</dd></div>
                    <div><dt className="text-neutral-500">From follow-up</dt><dd className="font-semibold">{formatMoney(data.recovery.byStage.second.revenue, data.currency)}</dd></div>
                  </dl>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <ShareCatalogue />

          {(data.toFulfil > 0 || data.lowStockProducts > 0) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.toFulfil > 0 ? <Link href="/dashboard/orders?status=PROCESSING" className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 transition-colors hover:bg-indigo-100"><strong>{data.toFulfil}</strong> order{data.toFulfil === 1 ? "" : "s"} to fulfil →</Link> : null}
              {data.lowStockProducts > 0 ? <Link href="/dashboard/products?low_stock=1" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 transition-colors hover:bg-amber-100"><strong>{data.lowStockProducts}</strong> product{data.lowStockProducts === 1 ? "" : "s"} running low on stock →</Link> : null}
            </div>
          ) : null}

          <Card>
            <CardHeader title="Revenue" description={`Paid orders, last ${data.rangeDays} days (UTC)`} />
            <CardBody><RevenueChart series={data.series} currency={data.currency} /></CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Top products" description="By units sold" />
              {data.topProducts.length === 0 ? <EmptyState title="No sales yet" description="Your best sellers will show up here." /> : (
                <ol className="divide-y divide-neutral-100">
                  {data.topProducts.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                      <span><span className="mr-2 text-neutral-400">{i + 1}.</span>{p.name}</span>
                      <span className="text-neutral-500">{p.quantity} sold · {formatMoney(p.revenue, data.currency)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent orders" action={<Link href="/dashboard/orders" className="text-sm font-medium text-brand hover:underline">View all</Link>} />
              {data.recentOrders.length === 0 ? <EmptyState title="No orders yet" description="Share your store link to get your first order." /> : (
                <div className={tableClasses.wrap}>
                  <table className={tableClasses.table}>
                    <thead><tr><th className={tableClasses.th}>Order</th><th className={tableClasses.th}>Customer</th><th className={tableClasses.th}>Status</th><th className={`${tableClasses.th} text-right`}>Total</th></tr></thead>
                    <tbody>
                      {data.recentOrders.map((o) => (
                        <tr key={o.id}>
                          <td className={tableClasses.td}><Link href={`/dashboard/orders/${o.id}`} className="font-semibold text-brand hover:underline">{o.orderNumber}</Link></td>
                          <td className={tableClasses.td}>{o.customer.name}</td>
                          <td className={tableClasses.td}><StatusBadge status={o.status} /></td>
                          <td className={`${tableClasses.td} text-right`}>{formatMoney(o.total, o.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
