import { z } from "zod";

/** Client-side validation for dashboard forms (the API remains the authority). */
const required = (label: string, max = 255) => z.string().trim().min(1, `${label} is required`).max(max);

export const adminLoginSchema = z.object({ email: z.email("Enter a valid email"), password: z.string().min(1, "Password is required") });

export const adminRegisterSchema = z
  .object({
    name: required("Your name"),
    email: z.email("Enter a valid email"),
    store_name: required("Store name", 120),
    store_slug: z.string().trim().toLowerCase().min(3, "At least 3 characters").max(40).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Letters, numbers and dashes only"),
    password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ["password_confirmation"], message: "Passwords do not match" });

export const forgotSchema = z.object({ email: z.email("Enter a valid email") });

export const resetSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ["password_confirmation"], message: "Passwords do not match" });

export const categorySchema = z.object({
  name: required("Name", 120),
  description: z.string().trim().max(2000).optional(),
  position: z.number().int().min(0).max(65535),
  isActive: z.boolean(),
});

export const storePageSchema = z.object({
  title: required("Title", 120),
  body: required("Content", 20000),
  position: z.number().int().min(0).max(65535),
});

export const discountSchema = z
  .object({
    code: z.string().trim().toUpperCase().min(3, "At least 3 characters").max(40).regex(/^[A-Z0-9_-]+$/, "Letters, numbers, dashes and underscores"),
    type: z.enum(["percentage", "fixed"]),
    value: z.number({ error: "Enter a value" }).int().min(1, "Must be at least 1"),
    minSubtotal: z.number().int().min(0),
    maxUses: z.number().int().min(1).nullable(),
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "percentage" && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "A percentage cannot exceed 100" });
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Must be after the start" });
  });

export const storeSchema = z.object({
  name: required("Store name", 120),
  description: z.string().trim().max(2000).optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "3-letter code, e.g. NGN"),
  timezone: required("Timezone", 64),
});

export const domainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "Enter a domain")
    .max(253)
    .regex(/^(https?:\/\/)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\/?$/, "Enter a valid domain such as shop.example.com"),
});

export const settingsSchema = z.object({
  contact: z.object({ email: z.email("Enter a valid email").or(z.literal("")), phone: z.string().trim().max(30), address: z.string().trim().max(500) }),
  seo: z.object({ title: z.string().trim().max(70, "Max 70 characters"), description: z.string().trim().max(300, "Max 300 characters"), og_image: z.string().trim().max(2048).refine((v) => v === "" || /^https:\/\//i.test(v), "Must be an https URL") }),
  checkout: z.object({ allow_guest_checkout: z.boolean(), require_phone: z.boolean(), shipping_flat_rate: z.number().int().min(0) }),
  reviews: z.object({ enabled: z.boolean(), require_approval: z.boolean() }),
  inventory: z.object({ low_stock_notice: z.number({ error: "Enter a number from 0 to 100" }).int().min(0, "Enter a number from 0 to 100").max(100, "Enter a number from 0 to 100") }),
  whatsapp: z
    .object({ enabled: z.boolean(), number: z.string().trim().max(30), message: z.string().trim().max(300, "Max 300 characters") })
    .refine((w) => !w.enabled || /^\d{8,15}$/.test(w.number.replace(/\D+/g, "")), { path: ["number"], message: "Enter your WhatsApp number with country code, e.g. +234 801 234 5678" }),
  notifications: z.object({
    customer_order_confirmation: z.boolean(),
    customer_order_updates: z.boolean(),
    customer_payment_receipt: z.boolean(),
    customer_refund: z.boolean(),
    merchant_new_order: z.boolean(),
    merchant_payment_failed: z.boolean(),
    merchant_low_stock: z.boolean(),
    merchant_new_review: z.boolean(),
    merchant_review_digest: z.boolean(),
    merchant_campaign_failure: z.boolean(),
    campaign_tracking: z.boolean(),
    low_stock_threshold: z.number({ error: "Enter a number" }).int("Whole numbers only").min(0, "Cannot be negative").max(100000, "Too large"),
    merchant_email: z.email("Enter a valid email").or(z.literal("")),
    abandoned_cart_reminder: z.boolean(),
    abandoned_cart_delay_hours: z.number({ error: "Choose a delay" }).int().min(1, "At least 1 hour").max(72, "At most 72 hours"),
    abandoned_cart_second_reminder: z.boolean(),
    abandoned_cart_second_delay_hours: z.number({ error: "Choose a delay" }).int().min(1, "At least 1 hour").max(168, "At most 7 days"),
    abandoned_cart_discount_percent: z.number({ error: "Enter a percentage" }).int("Whole numbers only").min(0, "Cannot be negative").max(50, "At most 50%"),
    review_request: z.boolean(),
    review_request_delay_days: z.number({ error: "Choose a delay" }).int().min(1, "At least 1 day").max(30, "At most 30 days"),
  }),
});

export const refundSchema = z.object({ amount: z.number().int().min(1, "Enter an amount").nullable(), reason: z.string().trim().max(255).optional() });

export const stockAdjustSchema = z.object({
  delta: z.number({ error: "Enter a number" }).int().refine((n) => n !== 0, "Cannot be zero").refine((n) => Math.abs(n) <= 1_000_000, "Too large"),
  reason: z.enum(["restock", "manual_adjustment"]),
  note: z.string().trim().max(255).optional(),
});

export const gatewaySchema = (provider: "paystack" | "flutterwave", exists: boolean) =>
  z.object({
    secret_key: (exists ? z.string().trim().length(0).or(z.string().trim()) : z.string().trim().min(1, "Secret key is required")).refine(
      (v) => v === "" || (provider === "paystack" ? /^sk_(test|live)_[A-Za-z0-9]+$/ : /^FLWSECK(_TEST)?-[A-Za-z0-9\-_]+$/).test(v),
      "This does not look like a valid secret key for this provider",
    ),
    public_key: z.string().trim().max(255),
    webhook_secret: provider === "flutterwave" && !exists ? z.string().trim().min(8, "At least 8 characters") : z.string().trim(),
  });

export function flatten(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
