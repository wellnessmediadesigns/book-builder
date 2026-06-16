"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QuireLogo, QuireMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AccountMenu } from "@/components/studio/account-menu";
import { SectionSwitcher } from "@/components/studio/section-switcher";
import { Settings, Search, Lightbulb } from "lucide-react";

export function TopNav({ author, email }: { author?: string; email?: string }) {
  const pathname = usePathname() ?? "";
  const news = pathname.startsWith("/studio/newsletters");
  const brainstormHref = news ? "/studio/newsletters/brainstorm" : "/studio/brainstorm";

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/studio" className="shrink-0 transition-opacity hover:opacity-80" aria-label="Quire home">
          <span className="hidden sm:block">
            <QuireLogo />
          </span>
          <span className="sm:hidden">
            <QuireMark className="h-7 w-7 text-brass" />
          </span>
        </Link>

        {/* Primary navigation: the two spaces */}
        <div className="flex-1">
          <SectionSwitcher />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
            }
            className="mr-1 hidden h-9 items-center gap-2 rounded-xl border border-line bg-paper-raised px-3 text-sm text-muted transition-colors hover:text-ink sm:inline-flex"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">⌘K</span>
          </button>
          <Link
            href={brainstormHref}
            className="hidden h-9 items-center gap-2 rounded-xl px-3 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink sm:inline-flex"
          >
            <Lightbulb className="h-4 w-4" /> Brainstorm
          </Link>
          <Link
            href="/studio/settings"
            className="hidden h-9 items-center gap-2 rounded-xl px-3 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink sm:inline-flex"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" /> <span className="hidden lg:inline">Settings</span>
          </Link>
          <ThemeToggle />
          <AccountMenu name={author ?? "Author"} email={email ?? ""} />
        </div>
      </div>
    </header>
  );
}
