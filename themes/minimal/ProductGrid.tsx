import type { ProductGridProps } from "../types";

export function ProductGrid({ products, currency, Card }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <Card product={product} currency={currency} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}
