import { redirect } from "next/navigation";

import { signedInHomePath } from "@/lib/admin/session";

import LandingPage from "./landing/page";

export { generateMetadata } from "./landing/page";

/**
 * Served only on the platform's own hosts (app.<platform-domain>); merchant
 * storefronts never reach this file (proxy.ts rewrites them to /s/[host]).
 *
 * Signed-in users go straight to their dashboard or console. Everyone else gets the marketing
 * page, so "Back to homepage" on the sign-in screens is an in-app navigation, not a page load
 * to a different host.
 */
export default async function PlatformHome() {
  const home = await signedInHomePath();
  if (home) redirect(home);

  return <LandingPage />;
}
