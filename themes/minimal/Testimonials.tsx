import { Container } from "@/components/ui/Container";

import type { TestimonialsProps } from "../types";
import { SectionHeader } from "../shared/ui";

export function Testimonials({ items, title = "What customers say" }: TestimonialsProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-primary/[0.04] py-16">
      <Container>
        <SectionHeader eyebrow="Reviews" title={title} align="center" />
        <ul className="grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <li key={index}>
              <figure className="relative flex h-full flex-col rounded-[var(--sf-radius)] bg-surface p-7 shadow-sm ring-1 ring-black/5">
                <span aria-hidden="true" className="font-heading absolute right-5 top-2 text-7xl leading-none text-accent/40">“</span>
                <blockquote className="relative leading-relaxed">{item.quote}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 text-sm">
                  <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-fg">{item.author.charAt(0).toUpperCase()}</span>
                  <span className="font-semibold">{item.author}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
