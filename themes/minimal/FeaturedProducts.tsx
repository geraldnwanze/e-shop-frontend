import { Container } from "@/components/ui/Container";

import type { FeaturedProductsProps } from "../types";
import { SectionHeader } from "../shared/ui";
import { ProductGrid } from "./ProductGrid";

export function FeaturedProducts({ products, currency, title = "Featured products", Card }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-16">
      <Container>
        <SectionHeader eyebrow="Our picks" title={title} href="/products" />
        <ProductGrid products={products} currency={currency} Card={Card} />
      </Container>
    </section>
  );
}
