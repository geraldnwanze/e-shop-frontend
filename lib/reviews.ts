export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface ReviewPhoto {
  id: string;
  url: string;
  width?: number | null;
  height?: number | null;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  /** Only shoppers' own reviews show anything but "published". */
  status: "published" | "pending" | "hidden";
  photos?: ReviewPhoto[];
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface ReviewAccess {
  eligible: boolean;
  reason: "purchase_required" | "reviews_off" | null;
  review: Review | null;
}

/** Fill for each of five stars (1 full, 0.5 half, 0 empty), rounding the average to the nearest half. */
export function starFills(average: number): number[] {
  const halves = Math.round(Math.max(0, Math.min(5, average)) * 2) / 2;

  return [0, 1, 2, 3, 4].map((i) => Math.max(0, Math.min(1, halves - i)));
}

/** "4.5", or "5" for a whole number, one decimal at most. */
export function formatAverage(average: number): string {
  return (Math.round(average * 10) / 10).toString();
}

/** Width of each rating bar, as a whole percent of all reviews. */
export function distributionPercents(summary: Pick<ReviewSummary, "count" | "distribution">): { stars: number; count: number; percent: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = summary.distribution[String(stars) as keyof ReviewSummary["distribution"]] ?? 0;

    return { stars, count, percent: summary.count > 0 ? Math.round((count / summary.count) * 100) : 0 };
  });
}

/** Why a customer can't write a review right now, in words they can act on. */
export function reviewBlockedMessage(access: ReviewAccess | undefined, signedIn: boolean): string | null {
  if (!signedIn) return "Sign in to review products you have bought.";
  if (!access || access.eligible) return null;

  return access.reason === "reviews_off" ? "Reviews are turned off for this store." : "Only customers who bought this product can review it.";
}

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** A quick check before uploading, so people hear about a bad file straight away. The server checks again. */
export function photoProblem(file: { type: string; size: number; name?: string }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is over 5 MB. Choose a smaller one.";
  if (file.size === 0) return "That file is empty.";

  return null;
}

/** How many more photos can still be added, never below zero. */
export function photoSlotsLeft(current: number): number {
  return Math.max(0, MAX_PHOTOS - current);
}
