/** Pure helpers for the POS shift and cashier report screens. */

export type PeriodKey = "today" | "7d" | "30d";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Inclusive date range in the viewer's local calendar, as the API's YYYY-MM-DD from/to. */
export function periodRange(key: PeriodKey, now: Date = new Date()): { from: string; to: string } {
  const days = key === "today" ? 0 : key === "7d" ? 6 : 29;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

  return { from: isoDay(start), to: isoDay(now) };
}

/** Drawer difference: counted minus expected. Negative means cash is missing. */
export function describeVariance(variance: number | null): { label: "Not counted" | "Balanced" | "Over" | "Short"; tone: "neutral" | "green" | "amber" | "red" } {
  if (variance === null) return { label: "Not counted", tone: "neutral" };
  if (variance === 0) return { label: "Balanced", tone: "green" };

  return variance > 0 ? { label: "Over", tone: "amber" } : { label: "Short", tone: "red" };
}

/** Whole minutes between two ISO timestamps, rendered like "2h 05m" (or "45m"). Open shifts measure to `now`. */
export function shiftDuration(openedAt: string, closedAt: string | null, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round(((closedAt ? new Date(closedAt) : now).getTime() - new Date(openedAt).getTime()) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
}
