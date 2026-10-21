import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/store/AuthForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
