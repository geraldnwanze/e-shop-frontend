import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 rounded-[var(--sf-radius)]";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:opacity-90",
  secondary: "border border-current/25 text-foreground hover:bg-black/5",
  ghost: "text-foreground hover:bg-black/5",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: Variant; className?: string }) {
  const external = /^https?:\/\//.test(href);

  return external ? (
    <a href={href} className={buttonClass(variant, className)} rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
