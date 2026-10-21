"use client";

import { useState } from "react";

import { StoreImage } from "@/components/ui/StoreImage";
import type { ProductImage } from "@/lib/types";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[var(--sf-radius)] bg-black/5 shadow-sm ring-1 ring-black/5">
        <StoreImage src={current?.url} alt={current?.alt ?? name} className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" priority />
      </div>
      {images.length > 1 ? (
        <ul className="mt-4 grid grid-cols-5 gap-3">
          {images.map((image, index) => (
            <li key={image.mediaId ?? index}>
              <button type="button" onClick={() => setActive(index)} aria-label={`Show image ${index + 1}`} aria-current={index === active} className={`relative block aspect-square w-full overflow-hidden rounded-[var(--sf-radius)] bg-black/5 transition ${index === active ? "ring-2 ring-primary ring-offset-2" : "opacity-70 ring-1 ring-black/10 hover:opacity-100"}`}>
                <StoreImage src={image.url} alt="" className="object-cover" sizes="100px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
