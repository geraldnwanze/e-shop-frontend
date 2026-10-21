import type { Metadata } from "next";

import { fontVariableClasses } from "@/lib/fonts";

import "./globals.css";

/**
 * Root layout is deliberately minimal: per-store title, icons and theme come from
 * app/s/[host]/layout.tsx, which knows which store the hostname belongs to.
 */
export const metadata: Metadata = {
  title: "Shop Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVariableClasses} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
