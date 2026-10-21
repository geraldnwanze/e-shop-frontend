export type TimelineState = "done" | "current" | "upcoming" | "cancelled";

export interface TimelineStep {
  key: "placed" | "processing" | "shipped" | "delivered" | "cancelled";
  label: string;
  description: string;
  state: TimelineState;
}

const FLOW = [
  { key: "placed", label: "Order placed", description: "We've received your order." },
  { key: "processing", label: "Being prepared", description: "Your items are being packed." },
  { key: "shipped", label: "On its way", description: "Your order has left the store." },
  { key: "delivered", label: "Delivered", description: "Your order has arrived." },
] as const;

/** Position of an order status on the happy path (COMPLETED means delivered and closed). */
const POSITION: Record<string, number> = { PENDING: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3, COMPLETED: 3 };

/**
 * Steps for the customer-facing order timeline. A cancelled order shows only the
 * placement followed by the cancellation, because the later steps never happened.
 */
export function timelineSteps(status: string): TimelineStep[] {
  if (status === "CANCELLED") {
    return [
      { ...FLOW[0], state: "done" },
      { key: "cancelled", label: "Cancelled", description: "This order was cancelled.", state: "cancelled" },
    ];
  }

  const position = POSITION[status] ?? 0;
  const finished = position === FLOW.length - 1;

  return FLOW.map((step, index) => ({
    ...step,
    state: index < position || (finished && index === position) ? "done" : index === position ? "current" : "upcoming",
  }));
}
