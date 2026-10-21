export interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  tenant: { id: string; name: string | null } | null;
  actor: { type: string; id: string | null; label: string | null };
  subject: { type: string; id: string | null; label: string | null } | null;
  changes: Record<string, unknown> | null;
  meta: { source?: string; ip?: string; user_agent?: string; request_id?: string } | null;
}

export const ACTOR_TYPES: { value: string; label: string }[] = [
  { value: "platform_admin", label: "Platform admin" },
  { value: "merchant", label: "Merchant" },
  { value: "customer", label: "Customer" },
  { value: "system", label: "System" },
  { value: "guest", label: "Not signed in" },
];

export const actorTypeLabel = (type: string) => ACTOR_TYPES.find((t) => t.value === type)?.label ?? type;

/** "product.updated" -> "Product updated"; "auth.login_failed" -> "Auth: login failed". */
export function describeAction(action: string): string {
  const [area, ...rest] = action.split(".");
  const what = rest.join(" ").replace(/_/g, " ");
  const area0 = area.replace(/_/g, " ");

  if (area === "auth") return `Sign-in: ${what}`;

  return `${area0.charAt(0).toUpperCase()}${area0.slice(1)} ${what}`.trim();
}

/** Tone for the action badge: security-relevant and destructive actions stand out. */
export function actionTone(action: string): "red" | "amber" | "green" | "blue" | "neutral" {
  if (/login_failed|login_blocked|suspended|deleted|revoke/.test(action)) return "red";
  if (/role_changed|password|payment_gateway|refund/.test(action)) return "amber";
  if (/created|reactivated|email_verified|^auth\.login$/.test(action)) return "green";

  return "blue";
}

export type ChangeRow = { field: string; before?: string; after?: string; value?: string };

const show = (v: unknown): string => (v === null || v === undefined || v === "" ? "empty" : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Turn the stored changes into rows: edits are [before, after] pairs, creations and facts are plain values. */
export function changeRows(changes: Record<string, unknown> | null): ChangeRow[] {
  if (!changes) return [];

  return Object.entries(changes).map(([field, value]) =>
    Array.isArray(value) && value.length === 2 ? { field, before: show(value[0]), after: show(value[1]) } : { field, value: show(value) },
  );
}

/** Filters as a query string for the export link (empty values left out). */
export function filterQuery(filters: Record<string, string>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);

  return q.toString();
}
