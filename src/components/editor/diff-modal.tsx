"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { X, GitCompareArrows, RotateCcw } from "lucide-react";
import { diffTexts, diffStats } from "@/lib/diff";
import { relativeTime, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DiffModal({
  versionLabel,
  versionDate,
  versionText,
  currentText,
  onRestore,
  onClose,
}: {
  versionLabel: string;
  versionDate: string;
  versionText: string;
  currentText: string;
  onRestore: () => void;
  onClose: () => void;
}) {
  const blocks = useMemo(() => diffTexts(versionText, currentText), [versionText, currentText]);
  const stats = useMemo(() => diffStats(blocks), [blocks]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-paper-raised shadow-float sm:m-6 sm:rounded-3xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <GitCompareArrows className="h-4 w-4 shrink-0 text-muse" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {versionLabel || "Version"} <span className="text-muted">· {relativeTime(versionDate)}</span>
            </p>
            <p className="text-xs text-muted">
              Compared with your current text —{" "}
              <span className="text-sage">+{formatNumber(stats.added)}</span>{" "}
              <span className="text-clay">−{formatNumber(stats.removed)}</span> words
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onRestore}>
            <RotateCcw className="h-3.5 w-3.5" /> Restore this version
          </Button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-prose space-y-4 font-serif text-[0.95rem] leading-relaxed">
            {blocks.length === 0 ? (
              <p className="text-center text-sm text-muted">No differences — identical text.</p>
            ) : (
              blocks.map((b, i) => (
                <p key={i} className="text-ink">
                  {b.ops.map((op, j) =>
                    op.type === "same" ? (
                      <span key={j}>{op.text}</span>
                    ) : op.type === "add" ? (
                      <span key={j} className="rounded bg-sage/15 px-0.5 text-ink">
                        {op.text}
                      </span>
                    ) : (
                      <span
                        key={j}
                        className="rounded bg-clay/10 px-0.5 text-ink-soft line-through decoration-clay/50"
                      >
                        {op.text}
                      </span>
                    ),
                  )}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-line bg-paper-sunken/40 px-5 py-2.5 text-center text-xs text-muted">
          <span className="rounded bg-clay/10 px-1 line-through decoration-clay/50">removed</span>{" "}
          was in the version ·{" "}
          <span className="rounded bg-sage/15 px-1">added</span> is new in your current text
        </div>
      </motion.div>
    </div>
  );
}
