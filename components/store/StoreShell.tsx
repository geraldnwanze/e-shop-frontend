import type { ReactNode } from "react";

import { storeStyle } from "@/lib/store-style";
import type { StoreBundle } from "@/lib/types";
import { getTheme } from "@/themes";

export function StoreShell({ bundle, children }: { bundle: StoreBundle; children: ReactNode }) {
  const theme = getTheme(bundle.theme?.slug);
  const { Header, Footer } = theme;

  return (
    <div data-theme={theme.slug} style={storeStyle(bundle.configuration, theme.tokens)} className="flex min-h-screen flex-col bg-surface font-body text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <Header bundle={bundle} />
      {bundle.acceptingOrders === false ? (
        <p role="status" className="bg-accent px-4 py-2 text-center text-sm font-medium text-accent-fg">This store isn&apos;t taking orders yet. You can browse, but checkout opens soon.</p>
      ) : null}
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer bundle={bundle} />
    </div>
  );
}
