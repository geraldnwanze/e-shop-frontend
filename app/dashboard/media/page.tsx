import type { Metadata } from "next";

import { MediaLibrary } from "@/components/admin/pages/MediaLibrary";

export const metadata: Metadata = { title: "Media" };

export default function Page() {
  return <MediaLibrary />;
}
