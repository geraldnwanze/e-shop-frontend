export interface BillingOption {
  months: number;
  amount: number;
  perMonth: number;
  discountPercent: number;
  savings: number;
}

export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPrice: number;
  limits: { products: number | null; custom_domains: number | null };
  features: string[];
  options: BillingOption[];
  current: boolean;
}

export interface BillingInvoice {
  id: string;
  reference: string;
  plan: string | null;
  amount: number;
  currency: string;
  periodMonths: number;
  status: "pending" | "paid" | "failed";
  paidAt: string | null;
  periodEndsAt: string | null;
  createdAt: string;
}

export interface BillingSubscription {
  status: "trialing" | "active" | "past_due" | "cancelled";
  plan: { id: string; name: string; slug: string; limits: BillingPlan["limits"]; features: string[] };
  selfServe: boolean;
  billingPeriod: number | null;
  autoRenew: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  currentPeriodEndsAt: string | null;
  card: { brand: string | null; last4: string } | null;
  failedAttempts: number;
  nextAttemptAt: string | null;
  free: boolean;
}

export interface Billing {
  billingAvailable: boolean;
  currency: string;
  subscription: BillingSubscription | null;
  plans: BillingPlan[];
  invoices: BillingInvoice[];
}

/** Label for a billing period in months. */
export function periodLabel(months: number): string {
  return months === 1 ? "Monthly" : months === 12 ? "Yearly" : `Every ${months} months`;
}
