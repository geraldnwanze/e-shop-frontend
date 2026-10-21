import { z } from "zod";

/**
 * Client-side form validation. These mirror (never replace) the server rules:
 * Laravel remains the authority and its field errors are shown too.
 */
const text = (label: string, max = 100) => z.string().trim().min(1, `${label} is required`).max(max);

export const addressSchema = z.object({
  firstName: text("First name"),
  lastName: text("Last name"),
  line1: text("Address", 255),
  line2: z.string().trim().max(255).optional(),
  city: text("City"),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a 2-letter country code, e.g. NG"),
  phone: z.string().trim().max(30).optional(),
});

export const checkoutSchema = (requirePhone: boolean) =>
  z.object({
    email: z.email("Enter a valid email"),
    firstName: text("First name"),
    lastName: text("Last name"),
    phone: requirePhone ? text("Phone", 30) : z.string().trim().max(30).optional(),
    shipping: addressSchema,
    billingSameAsShipping: z.boolean(),
    billing: addressSchema.optional(),
    discountCode: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(1000).optional(),
  }).refine((v) => v.billingSameAsShipping || v.billing !== undefined, { path: ["billing"], message: "Billing address is required" });

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    firstName: text("First name"),
    lastName: text("Last name"),
    email: z.email("Enter a valid email"),
    phone: z.string().trim().max(30).optional(),
    password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    passwordConfirmation: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirmation, { path: ["passwordConfirmation"], message: "Passwords do not match" });

export const forgotPasswordSchema = z.object({ email: z.email("Enter a valid email") });

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number"),
    passwordConfirmation: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirmation, { path: ["passwordConfirmation"], message: "Passwords do not match" });

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(1, "Order number is required").max(32),
});

export const newsletterSchema = z.object({ email: z.email("Enter a valid email") });

/** Flatten a Zod error into `{ "shipping.city": "City is required" }`. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
