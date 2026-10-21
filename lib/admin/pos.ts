import type { AdminProduct, AdminVariant } from "./types.ts";

/** Pure register logic (the API prices and validates every sale; this only drives the screen). */

export type PaymentMethod = "cash" | "transfer" | "card";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "card", label: "Card" },
];

export interface SaleLine {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  /** Units on hand, or null when stock isn't tracked. */
  stock: number | null;
}

export const lineKey = (line: Pick<SaleLine, "productId" | "variantId">) => `${line.productId}:${line.variantId ?? ""}`;

/** Add one unit of a product (or variant), merging with an existing line and never going past stock on hand. */
export function addToSale(lines: SaleLine[], product: AdminProduct, variant: AdminVariant | null): SaleLine[] {
  const stock = product.trackInventory ? (variant ? variant.stock : product.stock) : null;
  const key = `${product.id}:${variant?.id ?? ""}`;
  const existing = lines.find((l) => lineKey(l) === key);

  if (existing) {
    return lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clampQuantity(l.quantity + 1, l.stock) } : l));
  }

  if (stock !== null && stock < 1) return lines;

  return [...lines, { productId: product.id, variantId: variant?.id ?? null, name: product.name, variantName: variant?.name ?? null, unitPrice: variant?.price ?? product.price, quantity: 1, stock }];
}

export function clampQuantity(quantity: number, stock: number | null): number {
  const whole = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  const max = stock === null ? 1000 : Math.min(stock, 1000);

  return Math.max(1, Math.min(whole, max));
}

export const setLineQuantity = (lines: SaleLine[], key: string, quantity: number): SaleLine[] =>
  lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clampQuantity(quantity, l.stock) } : l));

export const removeLine = (lines: SaleLine[], key: string): SaleLine[] => lines.filter((l) => lineKey(l) !== key);

export function saleTotals(lines: SaleLine[], discount: number): { subtotal: number; discount: number; total: number } {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const applied = Math.max(0, Math.min(discount, subtotal));

  return { subtotal, discount: applied, total: subtotal - applied };
}

/** What to hand back for a cash sale; null while the cash received doesn't cover the total. */
export function changeDue(total: number, tendered: number | null): number | null {
  if (tendered === null || tendered < total) return null;

  return tendered - total;
}

/** Whether a product can be tapped straight into the sale (no option to choose) and is in stock. */
export function isSellable(product: AdminProduct): boolean {
  if (product.status !== "active") return false;
  if (product.variants.length > 0) return product.variants.some((v) => !product.trackInventory || v.stock > 0);

  return !product.trackInventory || product.stock > 0;
}

export interface SaleInput {
  lines: SaleLine[];
  method: PaymentMethod;
  tendered: number | null;
  discount: number;
  customer: { name: string; email: string; phone: string };
  notes: string;
}

export function toSalePayload(input: SaleInput) {
  const totals = saleTotals(input.lines, input.discount);

  return {
    items: input.lines.map((l) => ({ product_id: l.productId, variant_id: l.variantId, quantity: l.quantity })),
    payment_method: input.method,
    amount_tendered: input.method === "cash" ? (input.tendered ?? totals.total) : null,
    discount_amount: totals.discount > 0 ? totals.discount : null,
    customer: { name: input.customer.name.trim() || null, email: input.customer.email.trim() || null, phone: input.customer.phone.trim() || null },
    notes: input.notes.trim() || null,
  };
}
