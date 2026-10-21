"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/errors";

import { ToastProvider } from "./Toast";

/** An expired/revoked session on ANY request sends the merchant back to the login page. */
function onUnauthenticated(error: unknown) {
  if (error instanceof ApiError && error.status === 401 && !window.location.pathname.startsWith("/login")) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload deliberately discards all client state across the auth boundary
    window.location.assign("/login");
  }
}

export function AdminProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: onUnauthenticated }),
        mutationCache: new MutationCache({ onError: onUnauthenticated }),
        defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: false } },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
