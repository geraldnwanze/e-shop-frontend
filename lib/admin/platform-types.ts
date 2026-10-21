/** Platform-administration API shapes. */
import type { AdminProduct, DomainRecord, Role } from "./types";

export type TenantStatus = "active" | "suspended";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export interface PlanLimits {
  products: number | null;
  custom_domains: number | null;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  interval: "monthly" | "yearly";
  limits: PlanLimits;
  features: string[];
  isActive: boolean;
  position: number;
  subscribersCount?: number;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  plan?: Plan;
  tenant?: { id: string; name: string; slug: string };
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  suspendedAt: string | null;
  tenant: { id: string; name: string; slug: string; status: string; domains?: { domain: string; isPrimary: boolean }[] } | null;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  suspendedAt: string | null;
  store?: { id: string; name: string; slug: string; status: string; url: string; currency: string; theme?: { name: string } | null };
  domains?: (DomainRecord & { tenant?: never })[];
  users?: PlatformUser[];
  usersCount?: number;
  subscription?: Subscription | null;
  createdAt: string;
}

export interface PlatformStore {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  url: string;
  tenant?: { id: string; name: string; slug: string; status: string };
  theme?: { id: string; name: string; slug: string } | null;
}

export interface PlatformTheme {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  previewImage: string | null;
  status: "active" | "inactive";
  storesCount?: number;
}

export interface PlatformDomain extends DomainRecord {
  tenant?: { id: string; name: string; slug: string };
}

export interface PlatformOverview {
  tenants: { total: number; active: number; suspended: number; newLast30Days: number };
  stores: number;
  merchantUsers: number;
  orders: number;
  gmv: { currency: string; amount: number }[];
  activeSubscriptions: number;
  mrr: { currency: string; amount: number }[];
  domainsNeedingAttention: number;
  recentTenants: Tenant[];
}

export interface PlatformSettings {
  platform: { name: string; support_email: string | null };
  registration: { enabled: boolean };
  billing: { trial_days: number };
  storefront: { default_theme: string };
}

export type { AdminProduct };
