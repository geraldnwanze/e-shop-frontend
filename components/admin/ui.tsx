import { PasswordInput } from "@/components/ui/PasswordInput";
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-[0_1px_0_rgb(20_10_90/0.03)] transition-colors placeholder:text-neutral-400 hover:border-black/25 focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand/30 disabled:bg-neutral-100 disabled:text-neutral-500";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgb(20_10_90/0.04),0_14px_34px_-18px_rgb(20_10_90/0.16)] ${className}`}>{children}</section>;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
      <div>
        <h2 className="font-display font-semibold text-neutral-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-neutral-500">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-neutral-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const tones = {
  neutral: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-indigo-50 text-indigo-700 ring-indigo-200",
} as const;

const dots: Record<keyof typeof tones, string> = { neutral: "bg-neutral-400", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", blue: "bg-indigo-500" };

export type Tone = keyof typeof tones;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  active: "green", verified: "green", PAID: "green", COMPLETED: "green", DELIVERED: "green", succeeded: "green",
  draft: "neutral", PENDING: "amber", pending: "amber", PROCESSING: "blue", SHIPPED: "blue",
  archived: "neutral", CANCELLED: "red", FAILED: "red", failed: "red", suspended: "red",
  REFUNDED: "neutral", PARTIALLY_REFUNDED: "amber", inactive: "neutral",
  trialing: "blue", past_due: "amber", cancelled: "red", paid: "green",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{status.replace(/_/g, " ").toLowerCase()}</Badge>;
}

export function Field({ label, htmlFor, error, hint, children, className = "", hideLabel = false }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; className?: string; hideLabel?: boolean }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={hideLabel ? "sr-only" : "mb-1.5 block text-sm font-medium text-neutral-800"}>{label}</label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
      {error ? <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; hideLabel?: boolean; suffix?: string };

export function TextInput({ label, error, hint, id, className = "", hideLabel, suffix, ...props }: InputProps) {
  const autoId = useId();
  const fieldId = id ?? props.name ?? autoId;

  return (
    <Field label={label} htmlFor={fieldId} error={error} hint={hint} className={className} hideLabel={hideLabel}>
      {suffix ? (
        <div className="flex">
          <input id={fieldId} {...props} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : undefined} className={`${control} min-w-0 rounded-r-none`} />
          <span className="flex shrink-0 items-center whitespace-nowrap rounded-r-lg border border-l-0 border-black/15 bg-neutral-50 px-3.5 text-sm text-neutral-500">{suffix}</span>
        </div>
      ) : (
        props.type === "password" ? (
          <PasswordInput id={fieldId} {...props} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : undefined} className={control} />
        ) : (
          <input id={fieldId} {...props} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : undefined} className={control} />
        )
      )}
    </Field>
  );
}

export function TextArea({ label, error, hint, id, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }) {
  const fieldId = id ?? props.name ?? label;

  return (
    <Field label={label} htmlFor={fieldId} error={error} hint={hint} className={className}>
      <textarea id={fieldId} rows={4} {...props} aria-invalid={error ? true : undefined} className={control} />
    </Field>
  );
}

export function Select({ label, error, id, className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const fieldId = id ?? props.name ?? label;

  return (
    <Field label={label} htmlFor={fieldId} error={error} className={className}>
      <select id={fieldId} {...props} className={control}>{children}</select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, description, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-9 cursor-pointer appearance-none rounded-full bg-neutral-300 transition-colors checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4" />
      <span>
        <span className="block text-sm font-medium text-neutral-800">{label}</span>
        {description ? <span className="block text-xs text-neutral-500">{description}</span> : null}
      </span>
    </label>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-neutral-500">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center">
      <span aria-hidden className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6a1 1 0 001 1h16a1 1 0 001-1v-6h-5l-1.5 2.5h-3L8 13H3z" /></svg>
      </span>
      <p className="font-display font-semibold text-neutral-900">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>{message}</p>
      {onRetry ? <button type="button" onClick={onRetry} className="mt-2 font-medium underline">Try again</button> : null}
    </div>
  );
}

export function Notice({ tone = "blue", children }: { tone?: "blue" | "amber" | "red" | "green"; children: ReactNode }) {
  const t = { blue: "border-indigo-200 bg-indigo-50 text-indigo-900", amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-red-200 bg-red-50 text-red-900", green: "border-emerald-200 bg-emerald-50 text-emerald-900" }[tone];

  return <div role={tone === "red" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${t}`}>{children}</div>;
}

export const tableClasses = {
  wrap: "overflow-x-auto",
  table: "w-full text-left text-sm",
  th: "whitespace-nowrap border-b border-black/[0.06] bg-[#faf9ff] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500",
  td: "border-b border-black/[0.05] px-5 py-3.5 align-middle text-neutral-800",
};
