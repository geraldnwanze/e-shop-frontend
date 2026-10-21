/** Pure order helpers (mirrors the API's state machine; the API remains the authority). */

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  CANCELLED: [],
  COMPLETED: [],
};

export function nextStatuses(status: string): string[] {
  return TRANSITIONS[status] ?? [];
}

export const STATUS_ACTION_LABEL: Record<string, string> = {
  PROCESSING: "Mark as processing",
  SHIPPED: "Mark as shipped",
  DELIVERED: "Mark as delivered",
  COMPLETED: "Mark as completed",
  CANCELLED: "Cancel order",
};

interface PaymentLike {
  status: string;
  amount: number;
  refundedAmount: number;
}

/** Amount (minor units) that can still be refunded on an order's paid payment. */
export function refundableAmount(payments: PaymentLike[] | undefined): number {
  const paid = payments?.find((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED");

  return paid ? Math.max(paid.amount - paid.refundedAmount, 0) : 0;
}

export function formatAddress(a: Record<string, string | null> | undefined): string[] {
  if (!a) return [];

  return [
    [a.first_name, a.last_name].filter(Boolean).join(" "),
    a.line1, a.line2,
    [a.city, a.state, a.postal_code].filter(Boolean).join(", "),
    a.country, a.phone,
  ].filter((line): line is string => Boolean(line));
}
