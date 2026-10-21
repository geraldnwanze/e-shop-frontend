import Link from "next/link";

import { CartLink } from "@/components/cart/CartLink";
import { AccountLink } from "@/components/store/AccountLink";
import { Container } from "@/components/ui/Container";
import { StoreImage } from "@/components/ui/StoreImage";

import type { BundleProps } from "../types";
import { HeaderSearch } from "../shared/ui";

export function Header({ bundle }: BundleProps) {
  const { store, configuration } = bundle;

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-surface/85 shadow-[0_1px_0_rgba(0,0,0,0.02)] backdrop-blur-xl">
      <Container className="flex flex-wrap items-center gap-x-8 gap-y-2 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight">
          {store.logo ? <span className="relative block h-9 w-9"><StoreImage src={store.logo} alt="" className="object-contain" sizes="36px" priority /></span> : null}
          <span>{store.name}</span>
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-6 overflow-x-auto text-sm font-medium sm:order-none sm:w-auto sm:flex-1">
          {configuration.navigation.map((item) => (
            <Link key={`${item.label}-${item.url}`} href={item.url} className="relative whitespace-nowrap py-1 opacity-70 transition-opacity after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:opacity-100 hover:after:scale-x-100">
              {item.label}
            </Link>
          ))}
        </nav>
        <HeaderSearch className="hidden w-56 md:block" />
        <div className="ml-auto flex items-center gap-5 sm:ml-0">
          <AccountLink />
          <CartLink />
        </div>
      </Container>
    </header>
  );
}
