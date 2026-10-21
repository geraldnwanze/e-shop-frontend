import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginPage } from "@/components/admin/pages/AuthPages";
import { AdminProviders } from "@/components/admin/AdminProviders";
import { signedInHomePath } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Page() {
  const home = await signedInHomePath();
  if (home) redirect(home);

  return <AdminProviders><LoginPage /></AdminProviders>;
}
