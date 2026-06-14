"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { MoreHorizontal, Copy, Trash2, BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { QuireMark } from "@/components/brand/logo";
import { deleteProject, duplicateProject, restoreProject } from "@/lib/actions/projects";
import { formatNumber, relativeTime, readingTimeLabel } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

const ACCENTS: Record<string, string> = {
  brass: "from-brass/20 to-brass/5 text-brass-deep",
  muse: "from-muse/20 to-muse/5 text-muse-deep",
  sage: "from-sage/20 to-sage/5 text-sage",
};

const STATUS: Record<string, { label: string; tone: "neutral" | "brass" | "muse" | "sage" }> = {
  draft: { label: "Draft", tone: "neutral" },
  blueprint: { label: "Blueprint ready", tone: "muse" },
  writing: { label: "Writing", tone: "brass" },
  complete: { label: "Complete", tone: "sage" },
};

type P = {
  id: string;
  title: string;
  recommendedTitle: string;
  bookType: string;
  kind: string;
  status: string;
  coverAccent: string;
  updatedAt: string;
  chapterCount: number;
  words: number;
  goalWords: number;
  index: number;
  coverUrl?: string;
};

export function ProjectCard(p: P) {
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();
  const accent = ACCENTS[p.coverAccent] ?? ACCENTS.brass;
  const status = STATUS[p.status] ?? STATUS.draft;
  const title = p.recommendedTitle || p.title;
  const progress = p.goalWords > 0 ? Math.min(100, Math.round((p.words / p.goalWords) * 100)) : 0;
  const href =
    p.status === "draft" ? `/studio/book/${p.id}/blueprint` : `/studio/book/${p.id}/write`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: p.index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <Link href={href}>
        <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-raised">
          {/* spine / cover */}
          <div className={`relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br ${accent}`}>
            {p.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.coverUrl} alt={`${title} cover`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-black/10 to-transparent" />
                <QuireMark className="h-9 w-9 opacity-80" />
              </>
            )}
            <Badge tone={status.tone} className="absolute right-3 top-3 bg-paper-raised/80 backdrop-blur">
              {status.label}
            </Badge>
          </div>
          <div className="p-5">
            <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-ink">
              {title}
            </h3>
            <p className="mt-1 text-xs capitalize text-muted">
              {p.bookType} · {p.kind}
            </p>
            <div className="mt-4 flex items-center gap-3 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> {p.chapterCount} ch
              </span>
              <span>{formatNumber(p.words)} words</span>
              <span className="ml-auto text-muted">{relativeTime(p.updatedAt)}</span>
            </div>
            {p.words > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] text-muted">
                <Clock className="h-3 w-3" /> {readingTimeLabel(p.words)}
              </p>
            )}
            {p.status !== "draft" && (
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-paper-sunken">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brass to-muse transition-all duration-700"
                    style={{ width: `${Math.max(2, progress)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[0.6875rem] text-muted">
                  {progress}% of ~{formatNumber(p.goalWords)} word goal
                </p>
              </div>
            )}
          </div>
        </div>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          setMenu((m) => !m);
        }}
        aria-label="Book options"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-paper-raised/90 text-ink-soft opacity-100 shadow-soft backdrop-blur transition-opacity hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
          <div className="absolute right-3 top-11 z-20 w-44 overflow-hidden rounded-xl border border-line bg-paper-raised p-1 shadow-float animate-scale-in">
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await duplicateProject(p.id);
                })
              }
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button
              disabled={pending}
              onClick={() => {
                setMenu(false);
                start(async () => {
                  await deleteProject(p.id);
                  toast.action("Moved to Trash", {
                    label: "Undo",
                    onClick: () => restoreProject(p.id),
                  });
                });
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-clay transition-colors hover:bg-clay/10"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
