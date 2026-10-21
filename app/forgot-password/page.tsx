import type { Metadata } from "next";

import { AdminProviders } from "@/components/admin/AdminProviders";
import { ForgotPasswordPage } from "@/components/admin/pages/AuthPages";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Page() {
  return <AdminProviders><ForgotPasswordPage /></AdminProviders>;
}
