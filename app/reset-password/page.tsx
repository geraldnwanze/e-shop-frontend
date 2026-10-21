import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminProviders } from "@/components/admin/AdminProviders";
import { ResetPasswordPage } from "@/components/admin/pages/AuthPages";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function Page() {
  return (
    <AdminProviders>
      <Suspense>
        <ResetPasswordPage />
      </Suspense>
    </AdminProviders>
  );
}
