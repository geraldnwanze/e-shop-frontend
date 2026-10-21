import Link from "next/link";

interface Props {
  basePath: string;
  params: Record<string, string | undefined>;
  currentPage: number;
  lastPage: number;
}

function href(basePath: string, params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();

  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ basePath, params, currentPage, lastPage }: Props) {
  if (lastPage <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-3 text-sm">
      {currentPage > 1 ? <Link rel="prev" href={href(basePath, params, currentPage - 1)} className="rounded-[var(--sf-pill,9999px)] border border-black/20 px-5 py-2 font-medium transition hover:bg-foreground hover:text-surface">← Previous</Link> : <span className="rounded-[var(--sf-pill,9999px)] border border-black/10 px-5 py-2 opacity-40">← Previous</span>}
      <span aria-current="page" className="px-2 opacity-70">Page {currentPage} of {lastPage}</span>
      {currentPage < lastPage ? <Link rel="next" href={href(basePath, params, currentPage + 1)} className="rounded-[var(--sf-pill,9999px)] border border-black/20 px-5 py-2 font-medium transition hover:bg-foreground hover:text-surface">Next →</Link> : <span className="rounded-[var(--sf-pill,9999px)] border border-black/10 px-5 py-2 opacity-40">Next →</span>}
    </nav>
  );
}
