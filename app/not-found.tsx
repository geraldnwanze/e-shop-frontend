/**
 * Root not-found: shown when a hostname does not belong to any store (the store
 * layout itself calls notFound(), which only a parent segment can render).
 */
export default function RootNotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-32 text-center">
      <h1 className="text-3xl font-bold">Store not found</h1>
      <p className="mt-3 opacity-70">There is no store at this address. Check the link and try again.</p>
    </main>
  );
}
