import Image from "next/image";

import { isOptimizable } from "@/lib/images";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
}

/** next/image for known image hosts, plain <img> for anything else (never crashes on unknown hosts). */
export function StoreImage({ src, alt, className, sizes = "(min-width: 1024px) 25vw, 50vw", priority, fill = true, width, height }: Props) {
  if (!src) {
    // No photo yet: a soft tint of the store's own colours with the item's initial, instead of a grey box.
    const initial = alt.trim().charAt(0).toUpperCase();

    return (
      <div aria-hidden="true" style={fill ? undefined : { width, height }} className={`${fill ? "absolute inset-0" : ""} grid select-none place-items-center overflow-hidden bg-gradient-to-br from-accent/30 via-primary/5 to-accent/15 ${className ?? ""}`}>
        {initial ? <span className="font-heading text-5xl font-semibold text-primary/35">{initial}</span> : null}
      </div>
    );
  }

  if (!isOptimizable(src)) {
    // Fill mode must behave like next/image's: pinned to the corners of its (positioned) parent, never in the page flow.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`${fill ? "absolute inset-0 h-full w-full" : ""} ${className ?? ""}`} loading={priority ? "eager" : "lazy"} width={fill ? undefined : width} height={fill ? undefined : height} />;
  }

  return fill ? (
    <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />
  ) : (
    <Image src={src} alt={alt} width={width ?? 400} height={height ?? 400} sizes={sizes} priority={priority} className={className} />
  );
}
