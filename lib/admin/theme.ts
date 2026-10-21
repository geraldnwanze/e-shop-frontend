/**
 * Pure helpers for the theme editor. Mirrors the API's validation (config/themes.php
 * and UpdateThemeRequest); the API remains the authority.
 */
import type { HomepageSection, ThemeConfiguration } from "../types.ts";

/** Fonts merchants may choose; must match config/themes.php 'fonts' in the API. */
export const FONT_OPTIONS = ["Inter", "Poppins", "Roboto", "Open Sans", "Lato", "Montserrat", "Playfair Display", "Merriweather", "DM Sans", "Nunito"];

export const SECTION_LABELS: Record<HomepageSection["type"], string> = {
  hero: "Hero banner",
  featured_products: "Featured products",
  categories: "Categories",
  testimonials: "Testimonials",
  newsletter: "Newsletter signup",
};

export const COLOR_FIELDS: { key: keyof ThemeConfiguration["colors"]; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
];

export const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

/** Site path ("/products") or absolute https URL; blocks javascript:, data:, http: and "//host". */
export const isPathOrHttps = (value: string) => /^\/(?!\/)\S*$/.test(value) || /^https:\/\/[^\s/$.?#]\S*$/i.test(value);
export const isHttps = (value: string) => /^https:\/\/[^\s/$.?#]\S*$/i.test(value);

export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];

  return next;
}

/** Client-side validation of a configuration; returns flat errors keyed like the API's ("configuration.colors.primary"). */
export function validateConfiguration(c: ThemeConfiguration): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const { key } of COLOR_FIELDS) if (!isHex(c.colors[key])) errors[`configuration.colors.${key}`] = "Use a hex colour like #1a2b3c";
  if (c.hero.image_url && !isHttps(c.hero.image_url)) errors["configuration.hero.image_url"] = "Must be an https:// URL";
  if (c.hero.cta_url && !isPathOrHttps(c.hero.cta_url)) errors["configuration.hero.cta_url"] = "Use a path like /products or an https:// URL";

  c.navigation.forEach((item, i) => {
    if (!item.label.trim()) errors[`configuration.navigation.${i}.label`] = "Label is required";
    if (!isPathOrHttps(item.url.trim())) errors[`configuration.navigation.${i}.url`] = "Use a path like /products or an https:// URL";
  });
  c.footer.links.forEach((item, i) => {
    if (!item.label.trim()) errors[`configuration.footer.links.${i}.label`] = "Label is required";
    if (!isPathOrHttps(item.url.trim())) errors[`configuration.footer.links.${i}.url`] = "Use a path like /products or an https:// URL";
  });
  for (const [network, url] of Object.entries(c.social)) {
    if (url && !isHttps(url)) errors[`configuration.social.${network}`] = "Must be an https:// URL";
  }
  c.homepage.sections.forEach((section, i) => {
    const limit = section.config.limit;
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 24)) errors[`configuration.homepage.sections.${i}.config.limit`] = "Between 1 and 24";
    section.config.items?.forEach((item, j) => {
      if (!item.quote.trim()) errors[`configuration.homepage.sections.${i}.config.items.${j}.quote`] = "Quote is required";
      if (!item.author.trim()) errors[`configuration.homepage.sections.${i}.config.items.${j}.author`] = "Name is required";
    });
  });

  return errors;
}

const blank = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : null);

/** Strip empty strings to null and drop config keys the API does not accept. */
export function buildThemePayload(themeId: string | null, c: ThemeConfiguration) {
  return {
    ...(themeId ? { theme_id: themeId } : {}),
    configuration: {
      colors: c.colors,
      fonts: c.fonts,
      hero: { title: blank(c.hero.title), subtitle: blank(c.hero.subtitle), image_url: blank(c.hero.image_url), cta_label: blank(c.hero.cta_label), cta_url: blank(c.hero.cta_url) },
      navigation: c.navigation.map((i) => ({ label: i.label.trim(), url: i.url.trim() })),
      footer: { text: blank(c.footer.text), links: c.footer.links.map((i) => ({ label: i.label.trim(), url: i.url.trim() })) },
      social: Object.fromEntries(Object.entries(c.social).map(([k, v]) => [k, blank(v)])),
      homepage: {
        sections: c.homepage.sections.map((s) => ({
          type: s.type,
          enabled: s.enabled,
          config: {
            ...(s.config.limit !== undefined ? { limit: s.config.limit } : {}),
            ...(blank(s.config.title) ? { title: blank(s.config.title) } : {}),
            ...(s.type === "testimonials" ? { items: (s.config.items ?? []).map((i) => ({ quote: i.quote.trim(), author: i.author.trim() })) } : {}),
          },
        })),
      },
    },
  };
}
