"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Mail, Sparkles, Share2, StickyNote, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { key: string; label: string; icon: LucideIcon; href: string; prefix: string; accent: string };

// Ordered most-specific prefix first for active detection.
const TABS: Tab[] = [
  { key: "newsletter", label: "Newsletters", icon: Mail, href: "/studio/newsletters", prefix: "/studio/newsletters", accent: "text-muse" },
  { key: "social", label: "Social", icon: Share2, href: "/studio/social", prefix: "/studio/social", accent: "text-muse" },
  { key: "brand", label: "Brands", icon: Sparkles, href: "/studio/brands", prefix: "/studio/brands", accent: "text-brass" },
  { key: "note", label: "Notes", icon: StickyNote, href: "/studio/notes", prefix: "/studio/notes", accent: "text-brass" },
  { key: "book", label: "Books", icon: BookOpen, href: "/studio", prefix: "/studio", accent: "text-brass" },
];

// Render order (general → specific) so Books sits first.
const ORDER = ["book", "newsletter", "social", "brand", "note"];

/** The persistent space switcher — the spine of the studio's separate sections. */
export function SectionSwitcher() {
  const pathname = usePathname() ?? "";
  const active = TABS.find((t) => pathname === t.prefix || pathname.startsWith(t.prefix + "/"))?.key ?? "book";
  const tabs = ORDER.map((k) => TABS.find((t) => t.key === k)!);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar rounded-xl border border-line bg-paper-sunken/70 p-0.5">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors lg:px-3",
              isActive ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="section-switcher-active"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-paper-raised shadow-soft"
              />
            )}
            <t.icon className={cn("relative h-4 w-4", isActive && t.accent)} />
            <span className="relative hidden lg:inline">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
