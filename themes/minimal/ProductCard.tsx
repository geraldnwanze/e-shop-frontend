import Link from "next/link";

import { Price } from "@/components/ui/Price";
import { Stars } from "@/components/store/Stars";
import { StoreImage } from "@/components/ui/StoreImage";

import type { ProductCardProps } from "../types";
import { ProductBadges } from "../shared/ui";

export function ProductCard({ product, currency, priority }: ProductCardProps) {
  const image = product.images[0];

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-[var(--sf-radius)] bg-black/5 ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/10">
          <StoreImage src={image?.url} alt={image?.alt ?? product.name} className="object-cover transition-transform duration-500 group-hover:scale-105" priority={priority} />
          <ProductBadges product={product} />
          <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded-full bg-white/95 px-3 py-2 text-center text-xs font-semibold text-black opacity-0 shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">View product</span>
        </div>
        <div className="mt-4 space-y-1">
          {product.category ? <p className="text-[11px] font-medium uppercase tracking-[0.15em] opacity-50">{product.category.name}</p> : null}
          <h3 className="font-medium leading-snug">{product.name}</h3>
          {(product.ratingCount ?? 0) > 0 ? <Stars average={product.ratingAverage ?? 0} count={product.ratingCount} size="size-3.5" className="!flex" /> : null}
          <Price amount={product.price} compareAt={product.compareAtPrice} currency={currency} className="!flex text-sm" />
        </div>
      </Link>
    </article>
  );
}
