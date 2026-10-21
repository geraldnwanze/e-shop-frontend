import { formatMoney } from "@/lib/money";

interface Point { date: string; revenue: number; orders: number }

/** Dependency-free SVG bar chart of daily revenue. Exposed to assistive tech as an image with a text summary. */
export function RevenueChart({ series, currency }: { series: Point[]; currency: string }) {
  const max = Math.max(...series.map((p) => p.revenue), 1);
  const width = 600;
  const height = 160;
  const gap = 2;
  const barWidth = Math.max((width - gap * (series.length - 1)) / series.length, 1);
  const total = series.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height + 20}`} role="img" aria-label={`Daily revenue for the last ${series.length} days, total ${formatMoney(total, currency)}`} className="h-44 w-full">
        <defs>
          <linearGradient id="rev-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8b45f0" />
            <stop offset="1" stopColor="#5b3df5" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {series.map((p, i) => {
          const h = Math.max((p.revenue / max) * height, p.revenue > 0 ? 2 : 0);

          return (
            <g key={p.date}>
              <rect x={i * (barWidth + gap)} y={height - h} width={barWidth} height={h} rx={2} fill="url(#rev-bar)" className="opacity-90 transition-opacity hover:opacity-100">
                <title>{`${p.date}: ${formatMoney(p.revenue, currency)} · ${p.orders} order${p.orders === 1 ? "" : "s"}`}</title>
              </rect>
              <rect x={i * (barWidth + gap)} y={height} width={barWidth} height={1} className="fill-black/10" />
            </g>
          );
        })}
        <text x="0" y={height + 15} className="fill-neutral-400 text-[10px]">{series[0]?.date}</text>
        <text x={width} y={height + 15} textAnchor="end" className="fill-neutral-400 text-[10px]">{series[series.length - 1]?.date}</text>
      </svg>
    </figure>
  );
}
