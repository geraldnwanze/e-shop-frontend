import { formatMoney } from "./money.ts";

export interface WhatsAppSettings {
  enabled: boolean;
  number: string | null;
  message: string | null;
}

const DEFAULT_GREETING = "Hi, I'd like to order:";

/** A `wa.me` deep link that opens a chat with the store and pre-fills the message. Null when the store hasn't enabled it. */
export function whatsappLink(whatsapp: WhatsAppSettings | undefined, text: string): string | null {
  if (!whatsapp?.enabled || !whatsapp.number || !/^\d{8,15}$/.test(whatsapp.number)) return null;

  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(text)}`;
}

function greeting(whatsapp: WhatsAppSettings): string {
  return whatsapp.message?.trim() || DEFAULT_GREETING;
}

export function productMessage(
  whatsapp: WhatsAppSettings,
  line: { name: string; variantName?: string | null; quantity: number; unitPrice: number; currency: string; url: string },
): string {
  const title = line.variantName ? `${line.name} (${line.variantName})` : line.name;

  return [
    greeting(whatsapp),
    "",
    `${line.quantity} × ${title} — ${formatMoney(line.unitPrice * line.quantity, line.currency)}`,
    line.url,
  ].join("\n");
}

export function cartMessage(
  whatsapp: WhatsAppSettings,
  cart: { currency: string; subtotal: number; items: { name: string; variantName: string | null; quantity: number; lineTotal: number }[] },
): string {
  const lines = cart.items.map((i) => `• ${i.quantity} × ${i.variantName ? `${i.name} (${i.variantName})` : i.name} — ${formatMoney(i.lineTotal, cart.currency)}`);

  return [greeting(whatsapp), "", ...lines, "", `Subtotal: ${formatMoney(cart.subtotal, cart.currency)}`].join("\n");
}
