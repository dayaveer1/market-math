import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted">That page doesn&rsquo;t exist. Every drill is listed in the library.</p>
      <Link href="/" className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">Go to the library</Link>
    </div>
  );
}
