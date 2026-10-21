import type { Metadata } from "next";

import { ThemesPage } from "@/components/admin/platform/ThemesPage";

export const metadata: Metadata = { title: "Themes" };

export default function Page() {
  return <ThemesPage />;
}
