import type { Metadata } from "next";

import { ThemeEditor } from "@/components/admin/pages/ThemeEditor";

export const metadata: Metadata = { title: "Theme" };

export default function Page() {
  return <ThemeEditor />;
}
