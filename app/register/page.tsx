import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminProviders } from "@/components/admin/AdminProviders";
import { RegisterPage } from "@/components/admin/pages/AuthPages";
import { signedInHomePath } from "@/lib/admin/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Create your store", robots: { index: false } };

export default async function Page() {
  const home = await signedInHomePath();
  if (home) redirect(home);

  return <AdminProviders><RegisterPage platformDomain={env.platformDomain} /></AdminProviders>;
}
