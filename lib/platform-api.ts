import { env } from "./env";
import type { Plan } from "./admin/platform-types";

export interface PublicPlatform {
  platform: { name: string; registrationOpen: boolean; supportEmail: string | null; trialDays?: number; billingPeriods?: { months: number; discountPercent: number }[] };
  plans: Plan[];
}

/** Public marketing data. Never throws: the landing page must render even if the API is down. */
export async function fetchPublicPlatform(): Promise<PublicPlatform | null> {
  try {
    const res = await fetch(`${env.apiUrl}/plans`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300, tags: ["platform:plans"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PublicPlatform };

    return json.data ?? null;
  } catch {
    return null;
  }
}
