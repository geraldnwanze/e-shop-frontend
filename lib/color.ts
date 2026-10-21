/** Pick black or white text for readable contrast on a #rrggbb background. */
export function readableOn(hex: string): "#000000" | "#ffffff" {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "#ffffff";

  const [r, g, b] = [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Black vs white contrast are equal at luminance ~0.179; pick whichever reads better.
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

function luminanceOf(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 0;

  const [r, g, b] = [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);

  return (hi + 0.05) / (lo + 0.05);
}
