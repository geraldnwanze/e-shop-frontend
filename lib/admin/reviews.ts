export type ReviewStatus = "published" | "pending" | "hidden";

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  customerEmail?: string | null;
  product?: { id: string; name: string; slug: string } | null;
  status: ReviewStatus;
  photos?: { id: string; url: string }[];
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export const STATUS_LABEL: Record<ReviewStatus, string> = { published: "Published", pending: "Needs approval", hidden: "Hidden" };
export const STATUS_TONE: Record<ReviewStatus, "green" | "amber" | "neutral"> = { published: "green", pending: "amber", hidden: "neutral" };

/** The one-click actions that make sense for a review in its current state. */
export function reviewActions(status: ReviewStatus): { label: string; to: ReviewStatus }[] {
  if (status === "pending") return [{ label: "Approve", to: "published" }, { label: "Hide", to: "hidden" }];
  if (status === "hidden") return [{ label: "Publish", to: "published" }];

  return [{ label: "Hide", to: "hidden" }];
}
