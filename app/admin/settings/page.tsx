import type { Metadata } from "next";

import { SettingsAdminPage } from "@/components/admin/platform/SettingsAdminPage";

export const metadata: Metadata = { title: "Platform settings" };

export default function Page() {
  return <SettingsAdminPage />;
}
