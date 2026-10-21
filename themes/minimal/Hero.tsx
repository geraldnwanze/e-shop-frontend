import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { StoreImage } from "@/components/ui/StoreImage";

import type { BundleProps } from "../types";
import { Eyebrow, HeroBackdrop, headingStyle } from "../shared/ui";

export function Hero({ bundle }: BundleProps) {
  const { hero } = bundle.configuration;
  const browse = hero.cta_url !== "/products";

  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-fg">
      {hero.image_url ? (
        <>
          <StoreImage src={hero.image_url} alt="" className="-z-10 object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
        </>
      ) : (
        <HeroBackdrop />
      )}
      <Container className="py-24 sm:py-32 lg:py-40">
        <Eyebrow>{bundle.store.name}</Eyebrow>
        <h1 className="font-heading mt-6 max-w-3xl text-5xl leading-[1.05] sm:text-6xl lg:text-7xl" style={headingStyle}>
          {hero.title ?? bundle.store.name}
        </h1>
        {hero.subtitle ? <p className="mt-6 max-w-xl text-lg opacity-90 sm:text-xl">{hero.subtitle}</p> : null}
        <div className="mt-10 flex flex-wrap gap-3">
          {hero.cta_label && hero.cta_url ? <ButtonLink href={hero.cta_url} className="!bg-accent !px-7 !py-3 !text-accent-fg shadow-lg shadow-black/20">{hero.cta_label}</ButtonLink> : null}
          {browse ? <ButtonLink href="/products" variant="secondary" className="!border-white/40 !px-7 !py-3 !text-current hover:!bg-white/10">Browse all</ButtonLink> : null}
        </div>
      </Container>
    </section>
  );
}
