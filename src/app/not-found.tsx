import Link from "next/link";
import { QuireLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grain flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <QuireLogo size="lg" className="mb-8" />
      <p className="font-mono text-sm text-brass">404</p>
      <h1 className="mt-2 font-display text-display-md font-semibold text-ink">
        This page slipped off the shelf.
      </h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        The page you were looking for doesn&apos;t exist, or the book may have been moved.
      </p>
      <Link href="/studio" className="mt-7">
        <Button variant="primary">Back to your library</Button>
      </Link>
    </main>
  );
}
