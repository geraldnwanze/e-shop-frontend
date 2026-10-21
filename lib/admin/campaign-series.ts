export type SeriesFrequency = "weekly" | "monthly";
export type SeriesStatus = "active" | "paused" | "ended";

export interface CampaignSeriesItem {
  id: string;
  segmentId: string | null;
  segmentName: string;
  subject: string;
  body: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  frequency: SeriesFrequency;
  /** 1 = Monday … 7 = Sunday. Only for weekly series. */
  dayOfWeek: number | null;
  /** 1–28. Only for monthly series. */
  dayOfMonth: number | null;
  sendTime: string;
  endsOn: string | null;
  status: SeriesStatus;
  nextRunAt: string | null;
  lastRunAt: string | null;
  runsCount: number;
  pauseReason: string | null;
  createdAt: string;
}

export interface SeriesSchedule {
  frequency: SeriesFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  sendTime: string;
  endsOn: string;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const blankSchedule: SeriesSchedule = { frequency: "weekly", dayOfWeek: 1, dayOfMonth: 1, sendTime: "08:00", endsOn: "" };

/** "1st", "2nd", "3rd", "11th", "22nd"… */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;

  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** "Every Tuesday at 08:00" or "On the 15th of every month at 08:00". */
export function describeSchedule(s: { frequency: SeriesFrequency; dayOfWeek: number | null; dayOfMonth: number | null; sendTime: string }): string {
  if (s.frequency === "weekly") return `Every ${WEEKDAYS[(s.dayOfWeek ?? 1) - 1] ?? "week"} at ${s.sendTime}`;

  return `On the ${ordinal(s.dayOfMonth ?? 1)} of every month at ${s.sendTime}`;
}

export function scheduleFromSeries(s: CampaignSeriesItem): SeriesSchedule {
  return { frequency: s.frequency, dayOfWeek: s.dayOfWeek ?? 1, dayOfMonth: s.dayOfMonth ?? 1, sendTime: s.sendTime, endsOn: s.endsOn ?? "" };
}

/** The timing fields as the API wants them; only the day that applies to the frequency is sent. */
export function toSchedulePayload(s: SeriesSchedule) {
  return {
    frequency: s.frequency,
    day_of_week: s.frequency === "weekly" ? s.dayOfWeek : null,
    day_of_month: s.frequency === "monthly" ? s.dayOfMonth : null,
    send_time: s.sendTime,
    ends_on: s.endsOn || null,
  };
}

/** Mirrors the API's rules so mistakes show before saving; the API stays the authority. */
export function validateSchedule(s: SeriesSchedule, today: Date = new Date()): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.sendTime)) errors.sendTime = "Choose a time of day.";
  if (s.frequency === "weekly" && !(s.dayOfWeek >= 1 && s.dayOfWeek <= 7)) errors.dayOfWeek = "Choose a day of the week.";
  if (s.frequency === "monthly" && !(Number.isInteger(s.dayOfMonth) && s.dayOfMonth >= 1 && s.dayOfMonth <= 28)) errors.dayOfMonth = "Choose a day from 1 to 28.";

  if (s.endsOn) {
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.endsOn) || s.endsOn <= todayIso) errors.endsOn = "The end date must be after today.";
  }

  return errors;
}

export const SERIES_STATUS_LABEL: Record<SeriesStatus, string> = { active: "Active", paused: "Paused", ended: "Ended" };
export const SERIES_STATUS_TONE: Record<SeriesStatus, "green" | "amber" | "neutral"> = { active: "green", paused: "amber", ended: "neutral" };
