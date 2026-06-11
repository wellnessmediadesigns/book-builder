"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Sparkles, PenLine, Brain, Download } from "lucide-react";
import { QuireMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "blueprint", label: "Blueprint", icon: Sparkles },
  { key: "write", label: "Write", icon: PenLine },
  { key: "memory", label: "Memory", icon: Brain },
  { key: "export", label: "Export", icon: Download },
];

export function BookHeader({
  projectId,
  title,
  right,
}: {
  projectId: string;
  title: string;
  right?: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4">
        <Link
          href="/studio"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <QuireMark className="h-5 w-5 shrink-0 text-brass" />
          <span className="truncate font-display text-sm font-semibold text-ink">
            {title}
          </span>
        </div>

        <nav className="ml-2 hidden items-center gap-1 rounded-xl bg-paper-sunken/60 p-1 md:flex">
          {TABS.map((t) => {
            const href = `/studio/book/${projectId}/${t.key}`;
            const active = path === href;
            return (
              <Link
                key={t.key}
                href={href}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm transition-all",
                  active
                    ? "bg-paper-raised text-ink shadow-soft"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
