import type { Discount } from "./types.ts";

export type DiscountStatus = "Used" | "Paused" | "Expired" | "Scheduled" | "Active";

/** Plain-language state of a code, most final first (a used single-use code is "Used" even after it expires). */
export function discountStatus(d: Pick<Discount, "isActive" | "usedCount" | "maxUses" | "startsAt" | "endsAt">, now: Date = new Date()): DiscountStatus {
  if (d.maxUses !== null && d.usedCount >= d.maxUses) return "Used";
  if (!d.isActive) return "Paused";
  if (d.endsAt && new Date(d.endsAt) <= now) return "Expired";
  if (d.startsAt && new Date(d.startsAt) > now) return "Scheduled";

  return "Active";
}

export const STATUS_TONE: Record<DiscountStatus, "green" | "neutral" | "amber" | "blue"> = { Active: "green", Used: "blue", Paused: "neutral", Expired: "neutral", Scheduled: "amber" };
