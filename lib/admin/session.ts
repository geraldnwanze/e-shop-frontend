import "server-only";

import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE } from "../admin-bff";
import { env } from "../env";
import { homePathForRole } from "./home";

/**
 * Landing path for the current session, or null when nobody is signed in or the token is stale.
 * Lets the sign-in pages redirect straight to the right area instead of bouncing
 * /login -> /dashboard -> /admin in the browser.
 */
export async function signedInHomePath(): Promise<string | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${env.apiUrl}/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const role = (await response.json())?.data?.role;

    return typeof role === "string" ? homePathForRole(role) : null;
  } catch {
    return null;
  }
}
