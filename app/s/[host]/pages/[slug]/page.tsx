import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { PageBanner } from "@/components/store/PageBanner";
import { getPage } from "@/lib/api/server";
import { truncate } from "@/lib/seo";
import { requireStore } from "@/lib/store-page";

type Props = { params: Promise<{ host: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host, slug } = await params;
  const page = await getPage(host, slug).catch(() => null);

  if (!page) return { title: "Page not found", robots: { index: false } };

  return { title: page.title, description: truncate(page.body), alternates: { canonical: `/pages/${page.slug}` } };
}

export default async function InfoPage({ params }: Props) {
  const { host, slug } = await params;
  await requireStore(host);
  const page = await getPage(host, slug);

  if (!page) notFound();

  return (
    <>
      <PageBanner title={page.title} crumbs={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <Container className="max-w-3xl py-12">
        <article className="space-y-5 text-lg leading-relaxed opacity-90">
          {page.body.split(/\n{2,}/).map((paragraph, i) => <p key={i} className="whitespace-pre-line">{paragraph}</p>)}
        </article>
      </Container>
    </>
  );
}
