"use client";

import { useEffect } from "react";
import Link from "next/link";
import { QuireLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grain flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <QuireLogo size="lg" className="mb-8" />
      <h1 className="font-display text-display-md font-semibold text-ink">
        Something interrupted your flow.
      </h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        An unexpected error occurred. Your work is autosaved — try again, or head back to
        your library.
      </p>
      <div className="mt-7 flex gap-3">
        <Button variant="primary" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
        <Link href="/studio">
          <Button variant="outline">Library</Button>
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-xs text-muted">Reference: {error.digest}</p>
      )}
    </main>
  );
}
