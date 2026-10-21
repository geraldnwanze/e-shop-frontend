"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import type { Billing, BillingInvoice, BillingPlan, BillingSubscription } from "@/lib/admin/billing-types";
import { periodLabel } from "@/lib/admin/billing-types";
import { errorMessage, useMe } from "@/lib/admin/hooks";
import { formatMoney } from "@/lib/money";

import { CheckIcon } from "../icons";
import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, Notice, PageHeader, Spinner, StatusBadge, tableClasses } from "../ui";

const dateOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

export function BillingPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const toast = useToast();
  const allowed = me?.permissions.includes("billing.manage") === true;
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["billing"], queryFn: () => adminApi.get<Billing>("billing"), enabled: allowed });
  const [months, setMonths] = useState(12);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const handledReturn = useRef(false);

  // Back from Paystack: confirm the payment with the API, then clean the address bar.
  const verify = useMutation({
    mutationFn: (reference: string) => adminApi.post<{ status: string; billing: Billing }>("billing/verify", { reference }),
    onSuccess: async (result) => {
      queryClient.setQueryData(["billing"], result.billing);
      toast[result.status === "paid" ? "success" : "error"](result.status === "paid" ? "Payment received. Your plan is active." : result.status === "pending" ? "Your payment is still processing. We'll update this page shortly." : "The payment did not go through.");
      await queryClient.invalidateQueries({ queryKey: ["store"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference || handledReturn.current) return;
    handledReturn.current = true;
    window.history.replaceState(null, "", "/dashboard/billing");
    verify.mutate(reference);
  }, [verify]);

  const checkout = useMutation({
    mutationFn: (plan: BillingPlan) => adminApi.post<{ authorizationUrl: string }>("billing/checkout", { plan_id: plan.id, months }),
    onSuccess: ({ authorizationUrl }) => {
      // Leaving for Paystack's hosted page; a full navigation is deliberate.
      window.location.assign(authorizationUrl);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const autoRenew = useMutation({
    mutationFn: (on: boolean) => adminApi.post<Billing>(on ? "billing/resume" : "billing/cancel"),
    onSuccess: (billing, on) => { queryClient.setQueryData(["billing"], billing); setConfirmCancel(false); toast.success(on ? "Auto-renew is on" : "Auto-renew is off"); },
    onError: (e) => { setConfirmCancel(false); toast.error(errorMessage(e)); },
  });

  if (me && !allowed) return <><PageHeader title="Billing" /><Notice tone="blue">Only the store owner can manage billing.</Notice></>;

  return (
    <>
      <PageHeader title="Billing" description="Your plan, payment method and invoices." />
      {isLoading ? <Spinner /> : error || !data ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : (
        <div className="space-y-6">
          {!data.billingAvailable ? <Notice tone="amber">Online payments for plans aren&apos;t switched on yet. You can keep using your current plan.</Notice> : null}
          <CurrentPlan subscription={data.subscription} currency={data.currency} onToggle={(on) => (on ? autoRenew.mutate(true) : setConfirmCancel(true))} busy={autoRenew.isPending} />

          <Card>
            <CardHeader title="Choose a plan" description="Pay for longer and save. Change or cancel any time." />
            <CardBody className="space-y-6">
              <PeriodToggle plans={data.plans} months={months} onChange={setMonths} />
              <div className="grid gap-4 lg:grid-cols-2">
                {data.plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} months={months} currency={data.currency} selfServe={data.subscription?.selfServe === true} disabled={!data.billingAvailable || checkout.isPending} busy={checkout.isPending && checkout.variables?.id === plan.id} onChoose={() => checkout.mutate(plan)} />
                ))}
              </div>
              {data.plans.length === 0 ? <p className="text-sm text-neutral-500">No paid plans are available right now.</p> : null}
            </CardBody>
          </Card>

          <Invoices invoices={data.invoices} />
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        danger
        title="Turn off auto-renew?"
        message="Your plan stays active until the end of the period you've paid for. After that your store moves to the free plan. You can turn auto-renew back on any time before then."
        confirmLabel="Turn off"
        busy={autoRenew.isPending}
        onConfirm={() => autoRenew.mutate(false)}
        onClose={() => setConfirmCancel(false)}
      />
    </>
  );
}

function CurrentPlan({ subscription, currency, onToggle, busy }: { subscription: BillingSubscription | null; currency: string; onToggle: (on: boolean) => void; busy: boolean }) {
  if (!subscription) return <Card><CardBody><p className="font-semibold">You&apos;re not on a plan yet.</p><p className="text-sm text-neutral-500">Choose one below to get started.</p></CardBody></Card>;

  const { status } = subscription;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">{subscription.plan.name}</h2>
            <StatusBadge status={status} />
          </div>
          {subscription.card ? <p className="text-sm text-neutral-600">{subscription.card.brand ? `${subscription.card.brand[0].toUpperCase()}${subscription.card.brand.slice(1)} ` : "Card "}•••• {subscription.card.last4}</p> : null}
        </div>

        {status === "trialing" ? (
          <p className="text-sm text-neutral-700">
            <strong>{subscription.trialDaysLeft ?? 0} day{subscription.trialDaysLeft === 1 ? "" : "s"} left</strong> in your free trial (ends {dateOf(subscription.trialEndsAt)}). Choose a plan below to keep these features. If you don&apos;t, your store moves to the free plan. Nothing is deleted.
          </p>
        ) : null}

        {status === "active" && subscription.selfServe ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-700">
              {subscription.autoRenew
                ? <>Renews automatically on <strong>{dateOf(subscription.currentPeriodEndsAt)}</strong> ({periodLabel(subscription.billingPeriod ?? 1).toLowerCase()}).</>
                : <>Auto-renew is off. Your plan ends on <strong>{dateOf(subscription.currentPeriodEndsAt)}</strong>, then your store moves to the free plan.</>}
            </p>
            <Button variant="secondary" disabled={busy} onClick={() => onToggle(!subscription.autoRenew)}>{subscription.autoRenew ? "Turn off auto-renew" : "Turn on auto-renew"}</Button>
          </div>
        ) : null}

        {status === "past_due" ? (
          <Notice tone="red">
            We couldn&apos;t renew this plan{subscription.nextAttemptAt ? <>, and will try again on {dateOf(subscription.nextAttemptAt)}</> : null}. Pay below to keep your features. Without payment, your store moves to the free plan.
          </Notice>
        ) : null}

        {status === "active" && !subscription.selfServe && !subscription.free ? <p className="text-sm text-neutral-600">This plan was set up for you by our team{subscription.currentPeriodEndsAt ? ` and runs until ${dateOf(subscription.currentPeriodEndsAt)}` : ""}. You can still switch to a self-serve plan below.</p> : null}
        {subscription.free ? <p className="text-sm text-neutral-600">You&apos;re on the free plan. Upgrade any time to get more products, custom domains and priority support.</p> : null}
        <p className="sr-only">{currency}</p>
      </CardBody>
    </Card>
  );
}

function PeriodToggle({ plans, months, onChange }: { plans: BillingPlan[]; months: number; onChange: (m: number) => void }) {
  const periods = plans[0]?.options ?? [];
  if (periods.length === 0) return null;

  return (
    <div role="radiogroup" aria-label="Billing period" className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
      {periods.map((o) => (
        <button key={o.months} type="button" role="radio" aria-checked={months === o.months} onClick={() => onChange(o.months)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${months === o.months ? "bg-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}>
          {periodLabel(o.months)}{o.discountPercent > 0 ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Save {o.discountPercent}%</span> : null}
        </button>
      ))}
    </div>
  );
}

function PlanCard({ plan, months, currency, selfServe, disabled, busy, onChoose }: { plan: BillingPlan; months: number; currency: string; selfServe: boolean; disabled: boolean; busy: boolean; onChoose: () => void }) {
  const option = plan.options.find((o) => o.months === months) ?? plan.options[0];
  const limit = (n: number | null, one: string, many: string) => (n === null ? `Unlimited ${many}` : `Up to ${n.toLocaleString("en")} ${n === 1 ? one : many}`);

  return (
    <div className={`flex flex-col rounded-2xl border p-5 ${plan.current ? "border-brand ring-2 ring-brand/20" : "border-black/10"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold">{plan.name}</h3>
        {plan.current ? <Badge tone="blue">Current plan</Badge> : null}
      </div>
      {plan.description ? <p className="mt-1 text-sm text-neutral-500">{plan.description}</p> : null}
      <p className="mt-4 flex items-baseline gap-1"><span className="font-display text-3xl font-extrabold">{formatMoney(option.perMonth, currency)}</span><span className="text-sm text-neutral-500">/ month</span></p>
      <p className="mt-1 text-xs text-neutral-500">
        {months === 1 ? "Billed monthly" : `Billed ${formatMoney(option.amount, currency)} every ${months === 12 ? "year" : `${months} months`}`}
        {option.savings > 0 ? ` · you save ${formatMoney(option.savings, currency)}` : ""}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {[...new Set([limit(plan.limits.products, "product", "products"), limit(plan.limits.custom_domains, "custom domain", "custom domains"), ...plan.features])].map((f) => (
          <li key={f} className="flex items-start gap-2"><CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />{f}</li>
        ))}
      </ul>
      <Button className="mt-5" variant={plan.current && selfServe ? "secondary" : "primary"} disabled={disabled} onClick={onChoose}>
        {busy ? "Redirecting…" : plan.current && selfServe ? `Pay for another ${periodLabel(months).toLowerCase() === "monthly" ? "month" : "period"}` : `Choose ${plan.name}`}
      </Button>
    </div>
  );
}

function Invoices({ invoices }: { invoices: BillingInvoice[] }) {
  return (
    <Card>
      <CardHeader title="Invoices" description="Your most recent payments." />
      {invoices.length === 0 ? <EmptyState title="No payments yet" description="Your payments will appear here." /> : (
        <div className={tableClasses.wrap}>
          <table className={tableClasses.table}>
            <thead><tr><th className={tableClasses.th}>Date</th><th className={tableClasses.th}>Plan</th><th className={tableClasses.th}>Period</th><th className={tableClasses.th}>Status</th><th className={`${tableClasses.th} text-right`}>Amount</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className={tableClasses.td}>{dateOf(i.paidAt ?? i.createdAt)}</td>
                  <td className={tableClasses.td}>{i.plan ?? "—"}</td>
                  <td className={tableClasses.td}>{periodLabel(i.periodMonths)}</td>
                  <td className={tableClasses.td}><StatusBadge status={i.status} /></td>
                  <td className={`${tableClasses.td} text-right`}>{formatMoney(i.amount, i.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
