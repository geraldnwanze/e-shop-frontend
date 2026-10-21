/** Where a signed-in user belongs: platform administrators use the console, everyone else the merchant dashboard. */
export function homePathForRole(role: string): string {
  return role === "platform_admin" ? "/admin" : "/dashboard";
}
