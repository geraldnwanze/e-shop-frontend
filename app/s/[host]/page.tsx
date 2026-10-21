import { HomeSections } from "@/components/store/HomeSections";
import { requireStore } from "@/lib/store-page";

export default async function HomePage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const { bundle } = await requireStore(host);

  return <HomeSections host={host} bundle={bundle} />;
}
