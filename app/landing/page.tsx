import type { Metadata } from "next";
import { Faq, type FaqItem } from "@/components/marketing/Faq";
import { Hero } from "@/components/marketing/Hero";
import { Navbar } from "@/components/marketing/Navbar";
import { Pricing } from "@/components/marketing/Pricing";
import { Features, FinalCta, Footer, HowItWorks } from "@/components/marketing/Sections";
import { ThemeShowcase } from "@/components/marketing/ThemeShowcase";
import { env } from "@/lib/env";
import { fetchPublicPlatform } from "@/lib/platform-api";
import { jsonLd } from "@/lib/seo";

export const revalidate = 300;

const description = "Launch a beautiful online store in minutes. Products, inventory, checkout, Paystack and Flutterwave payments, themes and custom domains in one platform.";

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchPublicPlatform();
  const name = data?.platform.name ?? "E-Shop";
  const origin = `${env.scheme}://${env.platformDomain}`;

  return {
    metadataBase: new URL(origin),
    title: `${name} — Launch your online store in minutes`,
    description,
    alternates: { canonical: "/" },
    openGraph: { title: `${name} — Launch your online store in minutes`, description, url: "/", siteName: name, type: "website" },
    twitter: { card: "summary_large_image", title: `${name} — Launch your online store in minutes`, description },
  };
}

export default async function LandingPage() {
  const data = await fetchPublicPlatform();
  const name = data?.platform.name ?? "E-Shop";
  const registrationOpen = data?.platform.registrationOpen ?? true;
  const plans = data?.plans ?? null;
  const hasFree = plans?.some((p) => p.price === 0) ?? false;

  const faqs: FaqItem[] = [
    { q: "Do I need technical skills?", a: "No. You add products, pick a theme and connect your payment keys from the dashboard. There is no code to write." },
    { q: "Which payment providers are supported?", a: "Paystack and Flutterwave. You use your own gateway keys, so money goes straight to your account. Orders are only marked paid after the provider confirms the payment." },
    { q: "Can I use my own domain?", a: "Yes. Add your domain, create the DNS record we show you, and verify it. Every store also gets a free subdomain. The number of custom domains depends on your plan." },
    { q: "Is my store's data kept separate?", a: "Yes. Every store is isolated at the data layer, and gateway keys are stored encrypted." },
    ...(hasFree ? [{ q: "Is there a free plan?", a: "Yes. You can start on the free plan and move to a paid plan when you need more products or domains." }] : []),
  ];

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description,
        offers: (plans ?? []).map((p) => ({ "@type": "Offer", name: p.name, price: (p.price / 100).toFixed(2), priceCurrency: p.currency })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <div className="mk min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <Navbar name={name} registrationOpen={registrationOpen} />
      <main>
        <Hero registrationOpen={registrationOpen} trialDays={data?.platform.trialDays ?? 0} />
        <Features />
        <HowItWorks />
        <ThemeShowcase />
        <Pricing plans={plans} registrationOpen={registrationOpen} trialDays={data?.platform.trialDays ?? 0} periods={data?.platform.billingPeriods?.length ? data.platform.billingPeriods : undefined} />
        <Faq items={faqs} />
        <FinalCta registrationOpen={registrationOpen} name={name} />
      </main>
      <Footer name={name} supportEmail={data?.platform.supportEmail ?? null} />
    </div>
  );
}
