import { SectionHeading } from "./Sections";

export interface FaqItem { q: string; a: string }

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <div className="mt-12 flex flex-col gap-3">
          {items.map((item) => (
            <details key={item.q} className="mk-card group rounded-2xl px-6 py-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden className="text-xl text-mk-brand transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-mk-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
