import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-32 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 opacity-70">We couldn&apos;t find what you were looking for.</p>
      <Link href="/" className="mt-6 inline-block underline underline-offset-4">Back to the store</Link>
    </main>
  );
}
