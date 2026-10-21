import type { MouseEvent } from "react";

import { buttonClass } from "@/components/ui/Button";

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.1L2 22l5.05-1.6A9.9 9.9 0 1 0 12.04 2Zm5.8 14c-.25.7-1.45 1.33-2 1.4-.5.08-1.12.1-1.8-.12a16 16 0 0 1-1.63-.6c-2.87-1.24-4.74-4.13-4.88-4.32-.14-.2-1.16-1.54-1.16-2.94 0-1.4.73-2.08 1-2.37.25-.28.55-.35.74-.35h.53c.17 0 .4-.06.62.48.23.55.78 1.9.85 2.04.07.14.11.3.02.48-.1.2-.14.3-.28.47-.14.17-.3.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.18 1.54 1.9 1.06.94 1.95 1.23 2.23 1.37.28.14.44.12.6-.07.17-.2.7-.82.88-1.1.19-.28.37-.23.63-.14.25.1 1.6.75 1.88.89.28.14.46.2.53.32.07.12.07.68-.18 1.37Z" />
    </svg>
  );
}

/** Opens a pre-filled WhatsApp chat with the store. `onBeforeOpen` can veto the navigation (e.g. no option chosen yet). */
export function WhatsAppButton({ href, className = "", onBeforeOpen }: { href: string; className?: string; onBeforeOpen?: () => boolean }) {
  function handle(e: MouseEvent<HTMLAnchorElement>) {
    if (onBeforeOpen && !onBeforeOpen()) e.preventDefault();
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={handle} className={buttonClass("secondary", `border-[#25D366] text-[#128C4B] hover:bg-[#25D366]/10 ${className}`)}>
      <WhatsAppIcon />
      Order on WhatsApp
    </a>
  );
}
