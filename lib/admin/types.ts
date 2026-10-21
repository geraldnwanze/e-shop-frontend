/** Merchant-facing API shapes (admin resources; includes cost price, exact stock, etc.). */
import type { Address, OrderItem } from "../types";

export type Role = "platform_admin" | "merchant_owner" | "merchant_admin" | "merchant_staff" | "customer";

export interface Me {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  permissions: string[];
  tenant: { id: string; name: string; slug: string; status: string } | null;
}

export interface Meta {
  currentPage?: number;
  lastPage?: number;
  total?: number;
  perPage?: number;
}

export interface Page<T> {
  items: T[];
  meta: Meta;
}

export interface MediaItem {
  id: string;
  url: string;
  provider: string;
  folder: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
}

export interface AdminStorePage {
  id: string;
  title: string;
  slug: string;
  body: string;
  isPublished: boolean;
  showInFooter: boolean;
  position: number;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  isActive: boolean;
  parentId?: string | null;
  productsCount?: number;
}

export interface AdminVariant {
  id: string;
  name: string;
  sku: string | null;
  options: Record<string, string>;
  price: number | null;
  stock: number;
}

export interface AdminProductImage {
  mediaId: string | null;
  url: string | null;
  alt: string | null;
  position: number;
}

export type ProductStatus = "draft" | "active" | "archived";

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  status: ProductStatus;
  stock: number;
  trackInventory: boolean;
  category: AdminCategory | null;
  variants: AdminVariant[];
  images: AdminProductImage[];
  createdAt: string;
}

export interface InventoryMovement {
  delta: number;
  stockAfter: number;
  reason: string;
  note: string | null;
  variantId: number | null;
  createdAt: string;
}

export interface AdminPayment {
  id: string;
  reference: string;
  provider: string;
  status: string;
  amount: number;
  refundedAmount: number;
  currency: string;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  /** "pos" for in-person sales, "online" otherwise. Absent on older cached responses. */
  channel?: string;
  paymentMethod?: string | null;
  amountTendered?: number | null;
  change?: number | null;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  shippingMethod?: string | null;
  taxTotal: number;
  total: number;
  discountCode: string | null;
  customer: { id: string | null; email: string; name: string; phone: string | null };
  shippingAddress: Record<string, string | null>;
  billingAddress: Record<string, string | null>;
  notes: string | null;
  items: OrderItem[];
  payments?: AdminPayment[];
  placedAt: string;
  cancelledAt: string | null;
}

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  hasAccount: boolean;
  ordersCount?: number;
  /** Paid, non-cancelled orders and what they came to (minor units). Present on the customer lists. */
  paidOrders?: number;
  totalSpent?: number;
  lastOrderAt?: string | null;
  createdAt: string;
}

export interface Discount {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  /** "cart_recovery" for single-use codes issued by reminder emails. Absent on older responses. */
  source?: string;
  isAutomatic?: boolean;
}

export type DomainStatus = "pending" | "verified" | "active" | "failed";

export interface DomainRecord {
  id: string;
  domain: string;
  type: "SUBDOMAIN" | "CUSTOM";
  status: DomainStatus;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  failureReason: string | null;
  dnsInstructions?: {
    ownership: { type: string; name: string; value: string };
    routing: { type: string; name: string; target: string; note?: string };
  };
}

export interface StoreDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  favicon: string | null;
  currency: string;
  timezone: string;
  status: string;
  url: string;
  theme: { id: string; name: string; slug: string } | null;
  /** False until the store owner verifies their email address. */
  acceptingOrders?: boolean;
}

export interface ThemeOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  previewImage: string | null;
}

export interface Gateway {
  provider: "paystack" | "flutterwave";
  configured: boolean;
  isActive: boolean;
  isDefault: boolean;
  publicKey: string | null;
  secretKeyHint: string | null;
  hasWebhookSecret: boolean;
  webhookUrl: string;
}

import type { RecoveryStats } from "./recovery.ts";

export interface Stats {
  rangeDays: number;
  currency: string;
  grossRevenue: number;
  refunded: number;
  netRevenue: number;
  orders: number;
  averageOrderValue: number;
  newCustomers: number;
  awaitingPayment: number;
  toFulfil: number;
  lowStockProducts: number;
  /** What abandoned-cart reminders brought back. Absent on older API responses. */
  recovery?: RecoveryStats;
  series: { date: string; orders: number; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  recentOrders: AdminOrder[];
}

export type { Address };

export interface PosMethodTotals {
  count: number;
  total: number;
}

export interface PosTotals {
  salesCount: number;
  grossSales: number;
  discounts: number;
  voidedCount: number;
  voidedTotal: number;
  averageSale: number;
  byMethod: Record<"cash" | "transfer" | "card", PosMethodTotals>;
}

export interface PosShiftSummary extends PosTotals {
  openingFloat: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
}

export interface PosShift {
  id: string;
  cashier: { id: string; name: string | null };
  isOpen: boolean;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  notes: string | null;
  /** Absent in shift lists. */
  summary?: PosShiftSummary;
}

export interface CashierReportRow extends PosTotals {
  userId: string;
  name: string;
  shifts: number;
  cashVariance: number | null;
}

export interface CashierReport {
  from: string;
  to: string;
  cashiers: CashierReportRow[];
}
