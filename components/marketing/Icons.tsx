import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const StoreIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" /><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" /><path d="M10 20v-5h4v5" /></svg>;
export const GlobeIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>;
export const PaletteIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.6-2.1-.4-1.1.2-2.1 1.4-2.1H17a4 4 0 004-4c0-5-4-9.8-9-9.8z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15.5" cy="7.5" r="1" /></svg>;
export const CardIcon = (p: IconProps) => <svg {...base} {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" /><path d="M6.5 15h4" /></svg>;
export const BoxIcon = (p: IconProps) => <svg {...base} {...p}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>;
export const ReceiptIcon = (p: IconProps) => <svg {...base} {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></svg>;
export const ChartIcon = (p: IconProps) => <svg {...base} {...p}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 15l3-4 3 2 4-6" /></svg>;
export const ShieldIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>;
export const CheckIcon = (p: IconProps) => <svg {...base} strokeWidth={2.2} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const ArrowIcon = (p: IconProps) => <svg {...base} strokeWidth={2} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const MenuIcon = (p: IconProps) => <svg {...base} strokeWidth={2} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const SparkIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /><path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7L19 17z" /></svg>;
export const BoltIcon = (p: IconProps) => <svg {...base} {...p}><path d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z" /></svg>;
