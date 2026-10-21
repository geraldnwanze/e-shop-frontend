import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const GridIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>;
export const ReceiptIcon = (p: IconProps) => <svg {...base} {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" /><path d="M9 8h6M9 12h6" /></svg>;
export const BoxIcon = (p: IconProps) => <svg {...base} {...p}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>;
export const TagIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 12V4a1 1 0 011-1h8l9 9-9 9-9-9z" /><circle cx="8" cy="8" r="1.3" /></svg>;
export const UsersIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.3c2 .7 3.5 2.6 3.5 5.7" /></svg>;
export const PercentIcon = (p: IconProps) => <svg {...base} {...p}><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></svg>;
export const ImageIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.7" /><path d="M21 16l-5-5-9 9" /></svg>;
export const StoreIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" /><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" /><path d="M10 20v-5h4v5" /></svg>;
export const PaletteIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.6-2.1-.4-1.1.2-2.1 1.4-2.1H17a4 4 0 004-4c0-5-4-9.8-9-9.8z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15.5" cy="7.5" r="1" /></svg>;
export const GlobeIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>;
export const SlidersIcon = (p: IconProps) => <svg {...base} {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>;
export const UserIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>;
export const BuildingIcon = (p: IconProps) => <svg {...base} {...p}><rect x="4" y="3" width="11" height="18" rx="1.5" /><path d="M15 9h4a1 1 0 011 1v11H15M8 7.5h3M8 11.5h3M8 15.5h3" /></svg>;
export const CardIcon = (p: IconProps) => <svg {...base} {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19" /><path d="M6.5 15h4" /></svg>;
export const LayersIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>;
export const CogIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 14a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
export const TruckIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>;
export const MenuIcon = (p: IconProps) => <svg {...base} strokeWidth={2} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
export const ExternalIcon = (p: IconProps) => <svg {...base} strokeWidth={2} {...p}><path d="M14 4h6v6M20 4l-9 9M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4" /></svg>;
export const SparkIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></svg>;
export const CheckIcon = (p: IconProps) => <svg {...base} strokeWidth={2.2} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const TrendIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>;
export const InboxIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6a1 1 0 001 1h16a1 1 0 001-1v-6h-5l-1.5 2.5h-3L8 13H3z" /></svg>;
export const ClockIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const RegisterIcon = (p: IconProps) => <svg {...base} {...p}><rect x="4" y="3" width="16" height="7" rx="1.5" /><path d="M6 10l-2 10h16l-2-10" /><path d="M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01" /></svg>;
export const FunnelIcon = (p: IconProps) => <svg {...base} {...p}><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>;
export const MailIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
export const StarIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l2.7 5.7 6.3.8-4.6 4.4 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.5l6.3-.8L12 3z" /></svg>;
export const ShieldIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></svg>;
