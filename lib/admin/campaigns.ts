export interface CampaignAudience {
  inSegment: number;
  notOptedIn: number;
  unsubscribed: number;
  eligible: number;
}

export interface EmailCampaign {
  id: string;
  segmentId: string | null;
  /** Set on campaigns sent by a recurring campaign. */
  seriesId?: string | null;
  segmentName: string;
  subject: string;
  body: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  /** Whether opens and clicks were measured when it was sent. Older campaigns were not. */
  tracked?: boolean;
  /** People who opened / clicked at least once (each counted once). Present on list and detail. */
  openedCount?: number;
  clickedCount?: number;
  status: "scheduled" | "sending" | "sent" | "cancelled" | "failed";
  /** When a scheduled campaign will go out (UTC). */
  scheduledAt?: string | null;
  failureReason?: string | null;
  recipientsCount: number;
  sentCount: number;
  failedCount: number;
  createdBy?: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CampaignDraft {
  subject: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
}

export const blankCampaign: CampaignDraft = { subject: "", body: "Hi {first_name},\n\n", buttonLabel: "", buttonUrl: "" };

const HTTPS_URL = /^https:\/\/[^\s/$.?#][^\s]*$/i;

/** Mirrors the API's rules so mistakes show before sending; the API stays the authority. */
export function validateCampaign(d: CampaignDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const label = d.buttonLabel.trim();
  const url = d.buttonUrl.trim();

  if (d.subject.trim().length < 3) errors.subject = "Write a subject line (at least 3 characters)";
  if (d.subject.trim().length > 150) errors.subject = "Keep the subject under 150 characters";
  if (d.body.trim().length < 10) errors.body = "Write your message (at least 10 characters)";
  if (d.body.length > 5000) errors.body = "Keep the message under 5,000 characters";
  if (label && !url) errors.buttonUrl = "Add the link the button opens";
  if (url && !label) errors.buttonLabel = "Add the text for the button";
  if (url && !HTTPS_URL.test(url)) errors.buttonUrl = "Use a full link starting with https://";
  if (label.length > 40) errors.buttonLabel = "Keep the button text under 40 characters";

  return errors;
}

export function toCampaignPayload(segmentId: string, d: CampaignDraft) {
  return {
    segment_id: segmentId,
    subject: d.subject.trim(),
    body: d.body.trim(),
    button_label: d.buttonLabel.trim() || null,
    button_url: d.buttonUrl.trim() || null,
  };
}

/** Plain-language explanation of who would get the email. */
export function describeAudience(a: CampaignAudience): { headline: string; notes: string[] } {
  const notes: string[] = [];
  if (a.notOptedIn > 0) notes.push(`${a.notOptedIn} ${a.notOptedIn === 1 ? "customer has" : "customers have"} not agreed to receive emails.`);
  if (a.unsubscribed > 0) notes.push(`${a.unsubscribed} unsubscribed.`);

  return {
    headline: a.eligible === 0 ? "Nobody in this segment can be emailed yet." : `This will go to ${a.eligible} ${a.eligible === 1 ? "customer" : "customers"} (of ${a.inSegment} in the segment).`,
    notes,
  };
}

/** How far a campaign has got, for the history table. */
export function deliveryStatus(c: Pick<EmailCampaign, "status" | "recipientsCount" | "sentCount" | "failedCount">): { label: string; tone: "blue" | "green" | "amber" | "neutral" | "red" } {
  if (c.status === "scheduled") return { label: "Scheduled", tone: "amber" };
  if (c.status === "cancelled") return { label: "Cancelled", tone: "neutral" };
  if (c.status === "failed") return { label: "Could not send", tone: "red" };
  if (c.status === "sending") return { label: `Sending ${c.sentCount + c.failedCount}/${c.recipientsCount}`, tone: "blue" };
  if (c.failedCount > 0) return { label: `Sent, ${c.failedCount} failed`, tone: "amber" };

  return { label: "Sent", tone: "green" };
}

export const MIN_SCHEDULE_MINUTES = 5;
export const MAX_SCHEDULE_DAYS = 90;

/** Milliseconds the zone is ahead of UTC at the given instant (positive east of Greenwich). */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - Math.floor(instant / 1000) * 1000;
}

/**
 * Turns a wall-clock time typed as "2026-10-12T08:00" in the store's time zone into the real instant
 * (an ISO string in UTC). Null for anything that is not a complete date and time.
 */
export function zonedTimeToUtcIso(local: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;

  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(asUtc);

  // Dates that only exist by rolling over (month 13, 31 November, 25:00) are mistakes, not times.
  if (Number.isNaN(asUtc) || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59) return null;

  // Two passes settle the offset even when it changes (daylight saving) between the guess and the answer.
  let instant = asUtc - zoneOffsetMs(asUtc, timeZone);
  instant = asUtc - zoneOffsetMs(instant, timeZone);

  return new Date(instant).toISOString();
}

/** The reverse: an instant shown as "2026-10-12T08:00" on the wall clock of the given zone. */
export function utcToZonedLocal(iso: string, timeZone: string): string {
  const instant = new Date(iso).getTime();
  const wall = new Date(instant + zoneOffsetMs(instant, timeZone));

  return wall.toISOString().slice(0, 16);
}

/** A friendly "Mon 12 Oct, 08:00" in the store's zone. */
export function formatInZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).replace(",", "");
}

/** Mirrors the API's window for scheduled sends. Returns a message, or null when the time is fine. */
export function scheduleProblem(local: string, timeZone: string, now: Date = new Date()): string | null {
  const iso = zonedTimeToUtcIso(local, timeZone);
  if (iso === null) return "Choose a date and time.";

  const at = new Date(iso).getTime();
  if (at < now.getTime() + MIN_SCHEDULE_MINUTES * 60_000) return `Choose a time at least ${MIN_SCHEDULE_MINUTES} minutes from now.`;
  if (at > now.getTime() + MAX_SCHEDULE_DAYS * 86_400_000) return `You can schedule up to ${MAX_SCHEDULE_DAYS} days ahead.`;

  return null;
}

export interface CampaignRecipient {
  id: string;
  email: string;
  firstName: string | null;
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt: string | null;
  openCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  clickCount: number;
  firstClickedAt: string | null;
  lastClickedAt: string | null;
}

export type RecipientFilter = "all" | "opened" | "clicked" | "not_opened" | "failed";

export const RECIPIENT_FILTERS: { key: RecipientFilter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "opened", label: "Opened" },
  { key: "clicked", label: "Clicked" },
  { key: "not_opened", label: "Not opened" },
  { key: "failed", label: "Failed" },
];

/** Where to download a campaign's results as a spreadsheet, for the filter and search currently shown. */
export function resultsExportUrl(campaignId: string, filter: RecipientFilter = "all", search = ""): string {
  const query = new URLSearchParams();
  if (filter !== "all") query.set("status", filter);
  if (search.trim() !== "") query.set("search", search.trim());
  const qs = query.toString();

  return `/api/admin/email-campaigns/${encodeURIComponent(campaignId)}/export${qs ? `?${qs}` : ""}`;
}

/** A whole-number percentage, or null when there is nothing to divide by. */
export function percentOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;

  return Math.min(100, Math.round((part / whole) * 100));
}

/**
 * Open and click rates among the people the email was delivered to. Null for campaigns that were not
 * measured, so they show a dash instead of a misleading 0%.
 */
export function engagementRates(c: Pick<EmailCampaign, "tracked" | "sentCount" | "openedCount" | "clickedCount">): { openRate: number | null; clickRate: number | null; clickToOpenRate: number | null } | null {
  if (!c.tracked) return null;

  const opened = c.openedCount ?? 0;

  return { openRate: percentOf(opened, c.sentCount), clickRate: percentOf(c.clickedCount ?? 0, c.sentCount), clickToOpenRate: percentOf(c.clickedCount ?? 0, opened) };
}
