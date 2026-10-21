import { discountPercent, formatMoney } from "@/lib/money";

export function Price({ amount, compareAt, currency, className = "" }: { amount: number; compareAt?: number | null; currency: string; className?: string }) {
  const off = discountPercent(amount, compareAt ?? null);

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-2 ${className}`}>
      <span className="font-semibold">{formatMoney(amount, currency)}</span>
      {off !== null && compareAt ? (
        <>
          <s className="text-sm opacity-60">{formatMoney(compareAt, currency)}</s>
          <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-fg">-{off}%</span>
        </>
      ) : null}
    </span>
  );
}
