import type { Metadata } from "next";

import { AccountPage } from "@/components/admin/pages/AccountPage";

export const metadata: Metadata = { title: "Account" };

export default function Page() {
  return <AccountPage />;
}
