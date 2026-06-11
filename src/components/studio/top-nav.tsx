"use client";

import Link from "next/link";
import { QuireLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Settings, Palette, Search } from "lucide-react";

export function TopNav({ author }: { author?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/studio" className="transition-opacity hover:opacity-80">
          <QuireLogo />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true }),
              )
            }
            className="mr-1 hidden h-9 items-center gap-2 rounded-xl border border-line bg-paper-raised px-3 text-sm text-muted transition-colors hover:text-ink sm:inline-flex"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">⌘K</span>
          </button>
          <Link
            href="/studio/style"
            className="hidden h-9 items-center gap-2 rounded-xl px-3 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink sm:inline-flex"
          >
            <Palette className="h-4 w-4" /> Style
          </Link>
          <Link
            href="/studio/settings"
            className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <ThemeToggle />
          {author && (
            <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-brass/15 font-display text-sm font-semibold text-brass-deep">
              {author.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
