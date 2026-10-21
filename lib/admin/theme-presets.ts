import type { ThemeConfiguration } from "../types";

export interface ThemePreset {
  colors: ThemeConfiguration["colors"];
  fonts: ThemeConfiguration["fonts"];
  /** One line on the mood, shown next to the swatches. */
  mood: string;
}

/**
 * The colours and fonts each template was designed around. Merchants can apply one with a click and
 * then adjust it; their own choices are never replaced unless they ask.
 */
export const THEME_PRESETS: Record<string, ThemePreset> = {
  minimal: {
    colors: { primary: "#111827", secondary: "#6b7280", accent: "#f59e0b", background: "#ffffff", text: "#111827" },
    fonts: { heading: "Inter", body: "Inter" },
    mood: "Neutral and crisp, with a warm amber highlight.",
  },
  fashion: {
    colors: { primary: "#1c1917", secondary: "#78716c", accent: "#a16207", background: "#faf8f5", text: "#1c1917" },
    fonts: { heading: "Playfair Display", body: "Lato" },
    mood: "Editorial black and cream with a muted gold.",
  },
  modern: {
    colors: { primary: "#5b21b6", secondary: "#6b7280", accent: "#f97316", background: "#fffdf7", text: "#111111" },
    fonts: { heading: "Poppins", body: "DM Sans" },
    mood: "Confident violet and orange on warm white.",
  },
  electronics: {
    colors: { primary: "#0f172a", secondary: "#64748b", accent: "#0891b2", background: "#f8fafc", text: "#0f172a" },
    fonts: { heading: "Montserrat", body: "Roboto" },
    mood: "Deep navy with a cool cyan accent.",
  },
  beauty: {
    colors: { primary: "#9d174d", secondary: "#a8a29e", accent: "#db2777", background: "#fffaf8", text: "#3b2a2f" },
    fonts: { heading: "Playfair Display", body: "Nunito" },
    mood: "Soft rose on blush, with a serif heading.",
  },
  restaurant: {
    colors: { primary: "#7c2d12", secondary: "#a16207", accent: "#d97706", background: "#fffbf5", text: "#2b1d14" },
    fonts: { heading: "Merriweather", body: "Open Sans" },
    mood: "Warm brick and amber on cream.",
  },
};

export function presetFor(slug: string | null | undefined): ThemePreset | null {
  return (slug && THEME_PRESETS[slug]) || null;
}

/** True when the configuration already uses this preset's colours and fonts. */
export function matchesPreset(config: Pick<ThemeConfiguration, "colors" | "fonts">, preset: ThemePreset): boolean {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  return (Object.keys(preset.colors) as (keyof ThemePreset["colors"])[]).every((k) => same(config.colors[k], preset.colors[k]))
    && config.fonts.heading === preset.fonts.heading && config.fonts.body === preset.fonts.body;
}
