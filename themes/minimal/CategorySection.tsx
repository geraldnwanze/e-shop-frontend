import Link from "next/link";

import { Container } from "@/components/ui/Container";

import type { CategorySectionProps } from "../types";
import { ArrowIcon, SectionHeader } from "../shared/ui";

export function CategorySection({ categories, title = "Shop by category" }: CategorySectionProps) {
  if (categories.length === 0) return null;

  return (
    <section className="py-16">
      <Container>
        <SectionHeader eyebrow="Browse" title={title} href="/products" linkLabel="All products" />
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link href={`/products?category=${category.slug}`} className="group relative flex h-full min-h-36 flex-col justify-end overflow-hidden rounded-[var(--sf-radius)] bg-gradient-to-br from-primary/10 to-accent/15 p-5 ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10">
                <span aria-hidden="true" className="font-heading absolute -right-2 -top-4 select-none text-8xl font-bold text-primary/10 transition-transform duration-500 group-hover:scale-110">{category.name.charAt(0).toUpperCase()}</span>
                <span className="relative font-heading text-lg font-semibold">{category.name}</span>
                <span className="relative mt-1 flex items-center justify-between text-xs opacity-70">
                  {typeof category.productsCount === "number" ? <span>{category.productsCount} product{category.productsCount === 1 ? "" : "s"}</span> : <span>Shop now</span>}
                  <ArrowIcon className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
