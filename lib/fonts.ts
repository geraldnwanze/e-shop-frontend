import { DM_Sans, Inter, Lato, Merriweather, Montserrat, Nunito, Open_Sans, Playfair_Display, Poppins, Roboto } from "next/font/google";

/**
 * Every font a merchant may choose (must match config/themes.php 'fonts' in the API).
 * Only Inter is preloaded; the others are fetched by the browser only if a store uses them.
 * (next/font requires literal options on module-scope consts, hence the repetition.)
 */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], display: "swap", variable: "--font-poppins", weight: ["400", "500", "600", "700", "800"], preload: false });
const roboto = Roboto({ subsets: ["latin"], display: "swap", variable: "--font-roboto", weight: ["400", "500", "700"], preload: false });
const openSans = Open_Sans({ subsets: ["latin"], display: "swap", variable: "--font-open-sans", preload: false });
const lato = Lato({ subsets: ["latin"], display: "swap", variable: "--font-lato", weight: ["400", "700"], preload: false });
const montserrat = Montserrat({ subsets: ["latin"], display: "swap", variable: "--font-montserrat", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", variable: "--font-playfair", preload: false });
const merriweather = Merriweather({ subsets: ["latin"], display: "swap", variable: "--font-merriweather", weight: ["400", "700"], preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans", preload: false });
const nunito = Nunito({ subsets: ["latin"], display: "swap", variable: "--font-nunito", preload: false });

const fonts: Record<string, { variable: string }> = {
  Inter: inter,
  Poppins: poppins,
  Roboto: roboto,
  "Open Sans": openSans,
  Lato: lato,
  Montserrat: montserrat,
  "Playfair Display": playfair,
  Merriweather: merriweather,
  "DM Sans": dmSans,
  Nunito: nunito,
};

/** The CSS custom property each font's className defines (the `variable` option above, not the className itself). */
const cssVariables: Record<string, string> = {
  Inter: "--font-inter",
  Poppins: "--font-poppins",
  Roboto: "--font-roboto",
  "Open Sans": "--font-open-sans",
  Lato: "--font-lato",
  Montserrat: "--font-montserrat",
  "Playfair Display": "--font-playfair",
  Merriweather: "--font-merriweather",
  "DM Sans": "--font-dm-sans",
  Nunito: "--font-nunito",
};

/** Space-separated className exposing every font's CSS variable. */
export const fontVariableClasses = Object.values(fonts).map((f) => f.variable).join(" ");

/** CSS font-family value for a configured font name (falls back to Inter / system). */
export function fontFamily(name: string | null | undefined): string {
  const variable = (name && cssVariables[name]) || cssVariables.Inter;

  return `var(${variable}), ui-sans-serif, system-ui, sans-serif`;
}
