"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PenLine, ArrowRight } from "lucide-react";
import { QuireMark } from "@/components/brand/logo";
import { cleanChapterTitle, relativeTime } from "@/lib/utils";

export function ResumeCard({
  bookTitle,
  chapterTitle,
  href,
  updatedAt,
  coverUrl,
}: {
  bookTitle: string;
  chapterTitle: string | null;
  href: string;
  updatedAt: string;
  coverUrl?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={href} className="group block">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-ink px-5 py-5 shadow-raised transition-transform duration-300 group-hover:-translate-y-0.5 sm:px-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(60% 120% at 100% 0%, hsl(var(--muse)/0.5), transparent 60%)",
            }}
          />
          <div className="relative flex items-center gap-4">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={`${bookTitle} cover`}
                className="h-14 w-11 shrink-0 rounded-lg object-cover shadow-soft ring-1 ring-paper/20"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper/10">
                <QuireMark className="h-6 w-6 text-paper" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-paper/60">
                Continue where you left off · {relativeTime(updatedAt)}
              </p>
              <p className="mt-0.5 truncate font-display text-lg font-semibold text-paper">
                {bookTitle}
              </p>
              {chapterTitle && (
                <p className="truncate text-sm text-paper/70">{cleanChapterTitle(chapterTitle)}</p>
              )}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-paper px-3.5 py-2 text-sm font-medium text-ink transition-transform group-hover:scale-[1.03]">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Resume</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
