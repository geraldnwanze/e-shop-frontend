import { NewsletterForm } from "@/components/store/NewsletterForm";
import { Container } from "@/components/ui/Container";

import type { NewsletterProps } from "../types";
import { HeroBackdrop, headingStyle } from "../shared/ui";

export function Newsletter({ title = "Stay in the loop" }: NewsletterProps) {
  return <NewsletterBand title={title} />;
}

/** The soft variant sits on a tint of the brand colour, for gentler themes. */
export function SoftNewsletter({ title = "Stay in the loop" }: NewsletterProps) {
  return <NewsletterBand title={title} soft />;
}

function NewsletterBand({ title, soft = false }: { title: string; soft?: boolean }) {
  return (
    <section className={`relative isolate overflow-hidden py-16 ${soft ? "bg-primary/[0.07]" : "bg-primary text-primary-fg"}`}>
      <HeroBackdrop tone={soft ? "soft" : "primary"} />
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md">
          <h2 className="font-heading text-3xl sm:text-4xl" style={headingStyle}>{title}</h2>
          <p className="mt-2 opacity-80">New products and offers, straight to your inbox.</p>
        </div>
        <NewsletterForm className={soft ? "" : "text-primary-fg [&_button]:!bg-accent [&_button]:!text-accent-fg"} />
      </Container>
    </section>
  );
}
