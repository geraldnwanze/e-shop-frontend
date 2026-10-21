import { formatMoney } from "../money.ts";

/** What the API stores: only the rules that are set, all of which must match. Money is in minor units. */
export interface SegmentRules {
  min_orders?: number;
  max_orders?: number;
  min_spent?: number;
  max_spent?: number;
  ordered_within_days?: number;
  inactive_for_days?: number;
  joined_within_days?: number;
  has_account?: boolean;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentRules;
  customersCount: number | null;
  createdAt: string;
}

/** The segment form's state, kept as plain strings/numbers so empty fields are easy to tell from zero. */
export interface SegmentDraft {
  id?: string;
  name: string;
  description: string;
  minOrders: string;
  maxOrders: string;
  minSpent: number | null;
  maxSpent: number | null;
  recency: "any" | "within" | "inactive";
  recencyDays: string;
  joinedDays: string;
  account: "any" | "yes" | "no";
}

export const blankDraft: SegmentDraft = { name: "", description: "", minOrders: "", maxOrders: "", minSpent: null, maxSpent: null, recency: "any", recencyDays: "", joinedDays: "", account: "any" };

const wholeNumber = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;

  return Number.parseInt(trimmed, 10);
};

/** Only the rules the merchant filled in, ready to send. Blank or invalid fields are left out. */
export function toApiRules(draft: SegmentDraft): SegmentRules {
  const rules: SegmentRules = {};
  const minOrders = wholeNumber(draft.minOrders);
  const maxOrders = wholeNumber(draft.maxOrders);
  const days = wholeNumber(draft.recencyDays);
  const joined = wholeNumber(draft.joinedDays);

  if (minOrders !== undefined && minOrders >= 1) rules.min_orders = minOrders;
  if (maxOrders !== undefined) rules.max_orders = maxOrders;
  if (draft.minSpent !== null && draft.minSpent >= 1) rules.min_spent = draft.minSpent;
  if (draft.maxSpent !== null && draft.maxSpent >= 0) rules.max_spent = draft.maxSpent;
  if (draft.recency === "within" && days !== undefined && days >= 1) rules.ordered_within_days = days;
  if (draft.recency === "inactive" && days !== undefined && days >= 1) rules.inactive_for_days = days;
  if (joined !== undefined && joined >= 1) rules.joined_within_days = joined;
  if (draft.account !== "any") rules.has_account = draft.account === "yes";

  return rules;
}

export function fromApiRules(segment: Pick<CustomerSegment, "id" | "name" | "description" | "rules">): SegmentDraft {
  const r = segment.rules;

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description ?? "",
    minOrders: r.min_orders === undefined ? "" : String(r.min_orders),
    maxOrders: r.max_orders === undefined ? "" : String(r.max_orders),
    minSpent: r.min_spent ?? null,
    maxSpent: r.max_spent ?? null,
    recency: r.ordered_within_days !== undefined ? "within" : r.inactive_for_days !== undefined ? "inactive" : "any",
    recencyDays: String(r.ordered_within_days ?? r.inactive_for_days ?? ""),
    joinedDays: r.joined_within_days === undefined ? "" : String(r.joined_within_days),
    account: r.has_account === undefined ? "any" : r.has_account ? "yes" : "no",
  };
}

export const hasAnyRule = (rules: SegmentRules): boolean => Object.keys(rules).length > 0;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Plain-language summary of a segment's rules, one phrase per rule. */
export function describeRules(rules: SegmentRules, currency: string): string[] {
  const out: string[] = [];

  if (rules.max_orders === 0 && rules.min_orders === undefined) out.push("Has never bought");
  else {
    if (rules.min_orders !== undefined && rules.max_orders !== undefined) out.push(`Placed ${rules.min_orders} to ${plural(rules.max_orders, "paid order")}`);
    else if (rules.min_orders !== undefined) out.push(`Placed at least ${plural(rules.min_orders, "paid order")}`);
    else if (rules.max_orders !== undefined) out.push(`Placed at most ${plural(rules.max_orders, "paid order")}`);
  }

  if (rules.min_spent !== undefined && rules.max_spent !== undefined) out.push(`Spent ${formatMoney(rules.min_spent, currency)} to ${formatMoney(rules.max_spent, currency)}`);
  else if (rules.min_spent !== undefined) out.push(`Spent at least ${formatMoney(rules.min_spent, currency)}`);
  else if (rules.max_spent !== undefined) out.push(`Spent at most ${formatMoney(rules.max_spent, currency)}`);

  if (rules.ordered_within_days !== undefined) out.push(`Last ordered within ${plural(rules.ordered_within_days, "day")}`);
  if (rules.inactive_for_days !== undefined) out.push(`Has not ordered for ${plural(rules.inactive_for_days, "day")}`);
  if (rules.joined_within_days !== undefined) out.push(`Joined in the last ${plural(rules.joined_within_days, "day")}`);
  if (rules.has_account !== undefined) out.push(rules.has_account ? "Has an account" : "Guest (no account)");

  return out;
}

/** One-click starting points; each opens the builder pre-filled so the merchant can adjust it. */
export const PRESETS: { name: string; description: string; rules: SegmentRules }[] = [
  { name: "Repeat customers", description: "Bought more than once", rules: { min_orders: 2 } },
  { name: "Big spenders", description: "Spent ₦100,000 or more", rules: { min_spent: 10_000_000 } },
  { name: "Lapsed customers", description: "Not ordered in 90 days", rules: { inactive_for_days: 90 } },
  { name: "New this month", description: "Joined in the last 30 days", rules: { joined_within_days: 30 } },
  { name: "Never ordered", description: "Signed up but haven't bought", rules: { max_orders: 0 } },
];
