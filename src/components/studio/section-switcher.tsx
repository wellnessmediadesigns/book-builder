"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

/** The persistent Books | Newsletters switcher — the spine of the two spaces. */
export function SectionSwitcher() {
  const pathname = usePathname() ?? "";
  const section: "book" | "newsletter" = pathname.startsWith("/studio/newsletters")
    ? "newsletter"
    : "book";

  const tabs = [
    { key: "book" as const, label: "Books", icon: BookOpen, href: "/studio" },
    { key: "newsletter" as const, label: "Newsletters", icon: Mail, href: "/studio/newsletters" },
  ];

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-line bg-paper-sunken/70 p-0.5">
      {tabs.map((t) => {
        const active = section === t.key;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="section-switcher-active"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-paper-raised shadow-soft"
              />
            )}
            <t.icon className={cn("relative h-4 w-4", active && (t.key === "book" ? "text-brass" : "text-muse"))} />
            <span className="relative hidden sm:inline">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
