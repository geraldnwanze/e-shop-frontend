import type { Metadata } from "next";

import { EmailVerifiedPage } from "@/components/admin/pages/AuthPages";

export const metadata: Metadata = { title: "Email verified", robots: { index: false } };

export default function Page() {
  return <EmailVerifiedPage />;
}
