"use client";

import { randomId } from "@/lib/random-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useMe } from "@/lib/admin/hooks";
import { hasInvoice } from "@/lib/invoice";
import { formatAddress, nextStatuses, refundableAmount, STATUS_ACTION_LABEL } from "@/lib/admin/orders";
import { refundSchema, flatten } from "@/lib/admin/schemas";
import type { AdminOrder } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { MoneyField } from "../MoneyField";
import { useToast } from "../Toast";
import { Badge, Card, CardBody, CardHeader, ErrorState, Notice, PageHeader, Spinner, StatusBadge, TextInput, tableClasses } from "../ui";

export function OrderDetail({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: me } = useMe();
  const { data: order, isLoading, error, refetch } = useQuery({ queryKey: ["order", orderId], queryFn: () => adminApi.get<AdminOrder>(`orders/${orderId}`) });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const setStatus = useMutation({
    mutationFn: (status: string) => adminApi.patch<AdminOrder>(`orders/${orderId}/status`, { status }),
    onSuccess: async (updated) => {
      setConfirmCancel(false);
      toast.success(`Order is now ${updated.status.toLowerCase()}`);
      queryClient.setQueryData(["order", orderId], (old: AdminOrder | undefined) => (old ? { ...old, ...updated, payments: old.payments } : updated));
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["orders"] }), queryClient.invalidateQueries({ queryKey: ["stats"] }), queryClient.invalidateQueries({ queryKey: ["products"] })]);
    },
    onError: (e) => { setConfirmCancel(false); toast.error(errorMessage(e)); },
  });

  const voidSale = useMutation({
    mutationFn: () => adminApi.post<AdminOrder>(`orders/${orderId}/void`),
    onSuccess: async (updated) => {
      setConfirmVoid(false);
      toast.success("Sale voided");
      void queryClient.invalidateQueries({ queryKey: ["pos-shift"] });
      queryClient.setQueryData(["order", orderId], (old: AdminOrder | undefined) => (old ? { ...old, ...updated, payments: old.payments } : updated));
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["orders"] }), queryClient.invalidateQueries({ queryKey: ["stats"] }), queryClient.invalidateQueries({ queryKey: ["products"] })]);
    },
    onError: (e) => { setConfirmVoid(false); toast.error(errorMessage(e)); },
  });

  if (isLoading) return <Spinner />;
  if (error || !order) return <ErrorState message={errorMessage(error, "Could not load this order.")} onRetry={() => refetch()} />;

  const isPos = order.channel === "pos";
  const actions = nextStatuses(order.status);
  const canRefund = (me?.permissions.includes("payments.refund") ?? false) && refundableAmount(order.payments) > 0;

  return (
    <>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed ${new Date(order.placedAt).toLocaleString()}`}
        actions={<>
          <Link href="/dashboard/orders" className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">Back</Link>
          {hasInvoice(order.paymentStatus) ? <a href={`/api/admin/orders/${order.id}/invoice`} download className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">Download invoice</a> : null}
          {isPos && order.status !== "CANCELLED" ? <Button variant="secondary" className="!text-red-700" onClick={() => setConfirmVoid(true)}>Void sale</Button> : null}
          {canRefund ? <Button variant="secondary" onClick={() => setRefundOpen(true)}>Refund</Button> : null}
          {actions.map((next) => (
            <Button key={next} variant={next === "CANCELLED" ? "secondary" : "primary"} className={next === "CANCELLED" ? "!text-red-700" : ""} disabled={setStatus.isPending} onClick={() => (next === "CANCELLED" ? setConfirmCancel(true) : setStatus.mutate(next))}>
              {STATUS_ACTION_LABEL[next] ?? next}
            </Button>
          ))}
        </>}
      />

      <div className="mb-6 flex flex-wrap gap-2"><StatusBadge status={order.status} /><StatusBadge status={order.paymentStatus} />{isPos ? <Badge tone="blue">in store{order.paymentMethod ? ` · ${order.paymentMethod}` : ""}</Badge> : null}</div>
      {order.status === "CANCELLED" && order.paymentStatus === "PAID" ? <div className="mb-6"><Notice tone="amber">This order was cancelled after payment. Issue a refund if the customer should get their money back.</Notice></div> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Items" />
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Product</th><th className={`${tableClasses.th} text-right`}>Price</th><th className={`${tableClasses.th} text-right`}>Qty</th><th className={`${tableClasses.th} text-right`}>Total</th></tr></thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className={tableClasses.td}><span className="font-medium">{item.name}</span>{item.variantName ? <span className="block text-xs text-neutral-500">{item.variantName}</span> : null}{item.sku ? <span className="block text-xs text-neutral-400">{item.sku}</span> : null}</td>
                      <td className={`${tableClasses.td} text-right`}>{formatMoney(item.unitPrice, order.currency)}</td>
                      <td className={`${tableClasses.td} text-right`}>{item.quantity}</td>
                      <td className={`${tableClasses.td} text-right`}>{formatMoney(item.total, order.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="space-y-1.5 border-t border-neutral-200 p-5 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotal, order.currency)}</dd></div>
              {order.discountTotal > 0 ? <div className="flex justify-between"><dt>Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt><dd>−{formatMoney(order.discountTotal, order.currency)}</dd></div> : null}
              <div className="flex justify-between"><dt>Shipping{order.shippingMethod ? <span className="ml-1 text-neutral-500">({order.shippingMethod})</span> : null}</dt><dd>{formatMoney(order.shippingTotal, order.currency)}</dd></div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.total, order.currency)}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Payments" />
            {!order.payments || order.payments.length === 0 ? <CardBody><p className="text-sm text-neutral-500">No payment attempts yet.</p></CardBody> : (
              <div className={tableClasses.wrap}>
                <table className={tableClasses.table}>
                  <thead><tr><th className={tableClasses.th}>Provider</th><th className={tableClasses.th}>Status</th><th className={`${tableClasses.th} text-right`}>Amount</th><th className={`${tableClasses.th} text-right`}>Refunded</th><th className={tableClasses.th}>Reference</th></tr></thead>
                  <tbody>
                    {order.payments.map((p) => (
                      <tr key={p.id}>
                        <td className={tableClasses.td}>{p.provider}</td>
                        <td className={tableClasses.td}><StatusBadge status={p.status} />{p.failureReason ? <span className="block text-xs text-red-700">{p.failureReason.replace(/_/g, " ")}</span> : null}</td>
                        <td className={`${tableClasses.td} text-right`}>{formatMoney(p.amount, p.currency)}</td>
                        <td className={`${tableClasses.td} text-right`}>{p.refundedAmount > 0 ? formatMoney(p.refundedAmount, p.currency) : "—"}</td>
                        <td className={`${tableClasses.td} font-mono text-xs`}>{p.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Customer" />
            <CardBody className="space-y-1 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <p><a href={`mailto:${order.customer.email}`} className="font-medium text-brand hover:underline">{order.customer.email}</a></p>
              {order.customer.phone ? <p>{order.customer.phone}</p> : null}
            </CardBody>
          </Card>
          {isPos ? null : <>
          <Card>
            <CardHeader title="Shipping address" />
            <CardBody><address className="text-sm not-italic leading-relaxed">{formatAddress(order.shippingAddress).map((line, i) => <span key={i} className="block">{line}</span>)}</address></CardBody>
          </Card>
          <Card>
            <CardHeader title="Billing address" />
            <CardBody><address className="text-sm not-italic leading-relaxed">{formatAddress(order.billingAddress).map((line, i) => <span key={i} className="block">{line}</span>)}</address></CardBody>
          </Card>
          </>}
          {order.notes ? <Card><CardHeader title="Customer note" /><CardBody><p className="whitespace-pre-line text-sm">{order.notes}</p></CardBody></Card> : null}
        </div>
      </div>

      <ConfirmDialog open={confirmVoid} title="Void this sale?" message="The items go back into stock and the sale stops counting as revenue. Give the customer their money back yourself. This cannot be undone." confirmLabel="Void sale" busy={voidSale.isPending} onConfirm={() => voidSale.mutate()} onClose={() => setConfirmVoid(false)} />
      <ConfirmDialog open={confirmCancel} title="Cancel this order?" message="Reserved stock is returned to inventory and the customer is notified. This cannot be undone. If the order was paid, remember to refund it." confirmLabel="Cancel order" busy={setStatus.isPending} onConfirm={() => setStatus.mutate("CANCELLED")} onClose={() => setConfirmCancel(false)} />
      {refundOpen ? <RefundModal order={order} onClose={() => setRefundOpen(false)} onDone={() => { setRefundOpen(false); void queryClient.invalidateQueries({ queryKey: ["order", orderId] }); void queryClient.invalidateQueries({ queryKey: ["stats"] }); }} /> : null}
    </>
  );
}

function RefundModal({ order, onClose, onDone }: { order: AdminOrder; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const remaining = refundableAmount(order.payments);
  const [amount, setAmount] = useState<number | null>(remaining);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  // One idempotency key per dialog session: a double-click or retry can never refund twice.
  const key = useRef(`refund-${randomId()}`);

  const refund = useMutation({
    mutationFn: (body: { amount: number | null; reason: string | null }) => adminApi.post(`orders/${order.id}/refund`, body, { idempotencyKey: key.current }),
    onSuccess: () => { toast.success("Refund issued"); onDone(); },
    onError: (e) => {
      const fields = apiFieldErrors(e);
      setErrors(fields);
      if (Object.keys(fields).length === 0) setErrors({ amount: errorMessage(e) });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = refundSchema.safeParse({ amount, reason });
    if (!parsed.success) return setErrors(flatten(parsed.error));
    if (parsed.data.amount !== null && parsed.data.amount > remaining) return setErrors({ amount: `At most ${formatMoney(remaining, order.currency)} can be refunded` });
    setErrors({});
    refund.mutate({ amount: parsed.data.amount, reason: parsed.data.reason || null });
  }

  return (
    <Modal open onClose={onClose} title="Refund payment" footer={<>
      <Button variant="secondary" onClick={onClose} disabled={refund.isPending}>Cancel</Button>
      <Button type="submit" form="refund-form" disabled={refund.isPending}>{refund.isPending ? "Refunding…" : "Issue refund"}</Button>
    </>}>
      <form id="refund-form" onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-neutral-600">Up to <strong>{formatMoney(remaining, order.currency)}</strong> can still be refunded to the customer&apos;s original payment method.</p>
        <MoneyField label="Amount" currency={order.currency} value={amount} onChange={setAmount} error={errors.amount} />
        <TextInput label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
      </form>
    </Modal>
  );
}
