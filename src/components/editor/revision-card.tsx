"use client";

import { motion } from "framer-motion";
import { Check, X, Sparkles, RotateCcw } from "lucide-react";
import { Spinner } from "@/components/ui/primitives";

export type PendingRevision = {
  from: number;
  to: number;
  command: string;
  instruction: string;
  original: string;
  proposed: string;
  loading: boolean;
  error?: string;
  rect: { top: number; left: number; width: number } | null;
};

const LABELS: Record<string, string> = {
  custom: "Custom request",
  rewrite: "Rewrite",
  improve: "Improve writing",
  expand: "Expand",
  condense: "Condense",
  humanize: "Humanize",
};

export function RevisionCard({
  rev,
  onAccept,
  onReject,
  onRetry,
}: {
  rev: PendingRevision;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
}) {
  if (!rev.rect) return null;
  const top = rev.rect.top + 18;
  const left = Math.min(Math.max(rev.rect.left, 16), window.innerWidth - 440);

  return (
    <div style={{ position: "fixed", top, left, zIndex: 55 }}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-[26rem] overflow-hidden rounded-2xl border border-muse/25 bg-paper-raised shadow-glow"
      >
        <div className="flex items-center gap-2 border-b border-line bg-muse-soft/50 px-4 py-2.5">
          <Sparkles className="h-4 w-4 text-muse" />
          <span className="text-sm font-medium text-muse-deep">
            {rev.command === "custom"
              ? rev.instruction
              : LABELS[rev.command] ?? "AI suggestion"}
          </span>
        </div>

        {rev.loading ? (
          <div className="flex items-center gap-3 px-4 py-8 text-sm text-ink-soft">
            <Spinner className="text-muse" />
            Quire is revising your selection…
          </div>
        ) : rev.error ? (
          <div className="px-4 py-5">
            <p className="text-sm text-clay">{rev.error}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg bg-paper-sunken px-3 py-1.5 text-sm text-ink transition-colors hover:bg-line"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
              <button
                onClick={onReject}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-sunken"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-[40vh] space-y-3 overflow-y-auto p-4">
              <div>
                <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                  Original
                </p>
                <p className="rounded-lg bg-clay/5 px-3 py-2 font-serif text-sm leading-relaxed text-ink-soft line-through decoration-clay/40">
                  {rev.original}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-sage">
                  Proposed
                </p>
                <p className="rounded-lg bg-sage/8 px-3 py-2 font-serif text-sm leading-relaxed text-ink">
                  {rev.proposed}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-line bg-paper-sunken/30 px-4 py-3">
              <button
                onClick={onAccept}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-sage/90"
              >
                <Check className="h-4 w-4" /> Accept
              </button>
              <button
                onClick={onReject}
                className="inline-flex items-center gap-1.5 rounded-xl bg-paper-raised px-3.5 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
              >
                <X className="h-4 w-4" /> Reject
              </button>
              <button
                onClick={onRetry}
                title="Regenerate"
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-paper-sunken"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
