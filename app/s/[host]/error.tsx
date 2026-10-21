"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-32 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-3 opacity-70">The store couldn&apos;t be loaded. Please try again.</p>
      <button onClick={reset} className="mt-6 rounded border border-current/30 px-4 py-2 text-sm font-semibold">Try again</button>
    </main>
  );
}
