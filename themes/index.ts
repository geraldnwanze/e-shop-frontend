import { beauty } from "./beauty";
import { electronics } from "./electronics";
import { fashion } from "./fashion";
import { minimal } from "./minimal";
import { modern } from "./modern";
import { restaurant } from "./restaurant";
import type { ThemeDefinition } from "./types";

/**
 * Theme registry. To add a theme: create themes/<slug>/index.ts exporting a
 * ThemeDefinition (spread `minimal` and override only what differs) and list it here.
 * The storefront engine never changes.
 */
const registry: Record<string, ThemeDefinition> = { minimal, fashion, modern, electronics, beauty, restaurant };

export function getTheme(slug: string | null | undefined): ThemeDefinition {
  return (slug && registry[slug]) || minimal;
}

export const themeSlugs = Object.keys(registry);
