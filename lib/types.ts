/** Shapes returned by the Laravel API (camelCase resources, money in minor units). */

export interface ApiEnvelope<T> {
  status: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta: Record<string, unknown> & {
    errorCode?: string;
    errors?: Record<string, string[] | unknown>;
    currentPage?: number;
    lastPage?: number;
    total?: number;
    perPage?: number;
  };
  requestId: string | null;
}

export interface Paginated<T> {
  items: T[];
  currentPage: number;
  lastPage: number;
  total: number;
}

export interface Store {
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
}

export interface ThemeInfo {
  id: string;
  name: string;
  slug: string;
}

export type HomepageSectionType =
  | "hero"
  | "featured_products"
  | "categories"
  | "testimonials"
  | "newsletter";

export interface HomepageSection {
  type: HomepageSectionType;
  enabled: boolean;
  config: { limit?: number; title?: string; items?: { quote: string; author: string }[] };
}

export interface ThemeConfiguration {
  colors: { primary: string; secondary: string; accent: string; background: string; text: string };
  fonts: { heading: string; body: string };
  hero: { title: string | null; subtitle: string | null; image_url: string | null; cta_label: string | null; cta_url: string | null };
  navigation: { label: string; url: string }[];
  footer: { text: string | null; links: { label: string; url: string }[] };
  social: Partial<Record<"facebook" | "instagram" | "twitter" | "tiktok" | "youtube", string | null>>;
  homepage: { sections: HomepageSection[] };
}

/** Which emails the store sends. Only the merchant dashboard reads these; the storefront never receives them. */
export interface NotificationSettings {
  customer_order_confirmation: boolean;
  customer_order_updates: boolean;
  customer_payment_receipt: boolean;
  customer_refund: boolean;
  merchant_new_order: boolean;
  merchant_payment_failed: boolean;
  merchant_low_stock: boolean;
  merchant_new_review: boolean;
  merchant_review_digest: boolean;
  merchant_campaign_failure: boolean;
  campaign_tracking: boolean;
  low_stock_threshold: number;
  merchant_email: string | null;
  abandoned_cart_reminder: boolean;
  abandoned_cart_delay_hours: number;
  abandoned_cart_second_reminder: boolean;
  abandoned_cart_second_delay_hours: number;
  abandoned_cart_discount_percent: number;
  review_request: boolean;
  review_request_delay_days: number;
}

/** Where a store delivers, for the checkout's country and state pickers. */
export interface ShippingLocations {
  configured: boolean;
  countries: { code: string; name: string }[];
  states: string[];
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  free: boolean;
  freeOver: number | null;
}

/** Delivery methods for an address and cart. `configured: false` means the store still uses one flat rate. */
export interface ShippingQuote {
  configured: boolean;
  available: boolean;
  flatRate: number | null;
  options: ShippingOption[];
  message: string | null;
}

export interface StoreSettings {
  contact: { email: string | null; phone: string | null; address: string | null };
  seo: { title: string | null; description: string | null; og_image: string | null };
  checkout: { allow_guest_checkout: boolean; require_phone: boolean; shipping_flat_rate?: number };
  /** Public subset only: the number and message are null unless the merchant switched the button on. */
  whatsapp?: { enabled: boolean; number: string | null; message: string | null };
  /** Public: just whether reviews show. Merchants also get `require_approval`. */
  reviews?: { enabled: boolean; require_approval?: boolean };
  /** Merchant-only: show "Only N left" at or below this many units; 0 turns the note off. */
  inventory?: { low_stock_notice: number };
  notifications?: NotificationSettings;
}

export interface StoreBundle {
  store: Store;
  theme: ThemeInfo | null;
  configuration: ThemeConfiguration;
  settings: StoreSettings;
  primaryDomain: string | null;
  domains: string[];
  /** Published information pages that are linked from the footer. Absent on older cached bundles. */
  pages?: { title: string; slug: string }[];
  /** False while the store owner has not verified their email; the API then refuses checkout. Absent on older cached bundles. */
  acceptingOrders?: boolean;
}

export interface ProductImage {
  mediaId: string | null;
  url: string | null;
  alt: string | null;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: Record<string, string>;
  price: number;
  inStock: boolean;
  /** Set only when a few are left. Absent on older cached responses. */
  unitsLeft?: number | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  inStock: boolean;
  /** Set only when a few are left (never for products with options: see each option). */
  unitsLeft?: number | null;
  /** Average of published reviews (0 with none) and how many there are. Absent on older cached responses. */
  ratingAverage?: number;
  ratingCount?: number;
  category: { id: string; name: string; slug: string } | null;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  productsCount?: number;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  variantName: string | null;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: boolean;
}

export interface Cart {
  id: string;
  currency: string;
  items: CartLine[];
  itemCount: number;
  subtotal: number;
}

export interface Address {
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
}

export interface SavedAddress extends Address {
  id: string;
  label: string | null;
  isDefault: boolean;
}

export interface OrderItem {
  /** Null when the product has since been deleted. Present for the customer's own orders. */
  productId?: string | null;
  variantId?: string | null;
  name: string;
  variantName: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  shippingMethod?: string | null;
  taxTotal: number;
  total: number;
  discountCode: string | null;
  customer: { email: string; name: string; phone: string | null };
  items: OrderItem[];
  placedAt: string;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  hasAccount: boolean;
}

export interface PaymentInit {
  requiresPayment: boolean;
  orderNumber: string;
  payment: { id: string; reference: string; provider: string; status: string; amount: number; currency: string; authorizationUrl?: string } | null;
}

export interface PaymentVerification {
  reference: string;
  status: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
}

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  placedAt: string;
  items: { name: string; variantName: string | null; quantity: number }[];
}
