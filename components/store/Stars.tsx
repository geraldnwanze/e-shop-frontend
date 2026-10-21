import { formatAverage, starFills } from "@/lib/reviews";

/** Read-only star rating. The visible stars are decoration; the label carries the meaning. */
export function Stars({ average, count, size = "size-4", showNumber = false, className = "" }: { average: number; count?: number; size?: string; showNumber?: boolean; className?: string }) {
  const label = count === undefined ? `Rated ${formatAverage(average)} out of 5` : `Rated ${formatAverage(average)} out of 5, from ${count} review${count === 1 ? "" : "s"}`;

  return (
    <span role="img" aria-label={label} className={`inline-flex items-center gap-1 ${className}`}>
      <span aria-hidden="true" className="inline-flex">
        {starFills(average).map((fill, i) => (
          <svg key={i} viewBox="0 0 20 20" className={`${size} text-amber-500`}>
            <defs><clipPath id={`half-${i}`}><rect x="0" y="0" width="10" height="20" /></clipPath></defs>
            <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8L10 1.5z" fill="currentColor" opacity={fill === 0 ? 0.2 : 1} clipPath={fill === 0.5 ? `url(#half-${i})` : undefined} />
            {fill === 0.5 ? <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8L10 1.5z" fill="currentColor" opacity={0.2} /> : null}
          </svg>
        ))}
      </span>
      {showNumber ? <span aria-hidden="true" className="text-sm font-medium">{formatAverage(average)}</span> : null}
      {count !== undefined ? <span aria-hidden="true" className="text-sm opacity-60">({count})</span> : null}
    </span>
  );
}
