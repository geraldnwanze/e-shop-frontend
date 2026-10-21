import type { CSSProperties } from "react";

import { readableOn } from "./color";
import { fontFamily } from "./fonts";
import type { ThemeConfiguration } from "./types";
import type { ThemeTokens } from "../themes/types";

const HEX = /^#[0-9a-f]{6}$/i;
const safe = (value: string, fallback: string) => (HEX.test(value) ? value : fallback);

/**
 * CSS custom properties for a store: colours + fonts from its configuration,
 * radius/heading style from its theme. Colours are re-validated here so a bad
 * value from the API can never inject arbitrary CSS.
 */
export function storeStyle(config: ThemeConfiguration, tokens: ThemeTokens): CSSProperties {
  const primary = safe(config.colors.primary, "#111827");
  const accent = safe(config.colors.accent, "#f59e0b");

  return {
    "--sf-primary": primary,
    "--sf-primary-fg": readableOn(primary),
    "--sf-secondary": safe(config.colors.secondary, "#6b7280"),
    "--sf-accent": accent,
    "--sf-accent-fg": readableOn(accent),
    "--sf-background": safe(config.colors.background, "#ffffff"),
    "--sf-text": safe(config.colors.text, "#111827"),
    "--sf-font-heading": fontFamily(config.fonts.heading),
    "--sf-font-body": fontFamily(config.fonts.body),
    "--sf-radius": tokens.radius,
    "--sf-heading-transform": tokens.headingTransform,
    "--sf-heading-tracking": tokens.headingTracking,
    "--sf-heading-weight": tokens.headingWeight,
    "--sf-pill": tokens.pill,
  } as CSSProperties;
}
