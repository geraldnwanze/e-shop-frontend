import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/store/AuthForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
