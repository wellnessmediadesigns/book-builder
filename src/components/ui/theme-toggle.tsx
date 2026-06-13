"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  return (
    <button
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink",
        className,
      )}
    >
      {mounted ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "sun" : "moon"}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex"
          >
            {isDark ? <Sun className="h-[1.05rem] w-[1.05rem]" /> : <Moon className="h-[1.05rem] w-[1.05rem]" />}
          </motion.span>
        </AnimatePresence>
      ) : (
        <div className="h-[1.05rem] w-[1.05rem]" />
      )}
    </button>
  );
}
