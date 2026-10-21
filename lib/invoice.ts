/** Invoices exist once money has changed hands (the API refuses them for unpaid or failed orders). */
export function hasInvoice(paymentStatus: string): boolean {
  return paymentStatus === "PAID" || paymentStatus === "PARTIALLY_REFUNDED" || paymentStatus === "REFUNDED";
}
