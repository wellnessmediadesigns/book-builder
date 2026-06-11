"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Sparkles,
  Lock,
  GripVertical,
  Trash2,
  Brain,
  Download,
  PanelLeftClose,
} from "lucide-react";
import Link from "next/link";
import { cn, formatNumber } from "@/lib/utils";
import { Spinner } from "@/components/ui/primitives";

export type ChapterMeta = {
  id: string;
  order: number;
  title: string;
  wordCount: number;
  minWords: number;
  maxWords: number;
  locked: boolean;
  status: string;
};

const STATUS_DOT: Record<string, string> = {
  planned: "bg-muted",
  drafting: "bg-brass",
  drafted: "bg-muse",
  revised: "bg-sage",
  final: "bg-sage",
};

export function ChapterRail({
  projectId,
  bookTitle,
  chapters,
  activeId,
  generatingId,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
  onGenerate,
  onCollapse,
}: {
  projectId: string;
  bookTitle: string;
  chapters: ChapterMeta[];
  activeId: string;
  generatingId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onGenerate: (id: string) => void;
  onCollapse: () => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = chapters.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setDragId(null);
  }

  return (
    <div className="flex h-full flex-col bg-paper-sunken/30">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="truncate font-display text-sm font-semibold text-ink">
          {bookTitle}
        </span>
        <button
          onClick={onCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink"
          title="Hide chapters"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-2 text-xs text-muted">
        {chapters.length} chapters · {formatNumber(totalWords)} words
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {chapters.map((c, i) => {
          const active = c.id === activeId;
          const gen = generatingId === c.id;
          return (
            <div
              key={c.id}
              draggable
              onDragStart={() => setDragId(c.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(c.id)}
              className={cn(
                "group relative rounded-xl border px-2.5 py-2 transition-all",
                active
                  ? "border-brass/30 bg-paper-raised shadow-soft"
                  : "border-transparent hover:bg-paper-raised/60",
                dragId === c.id && "opacity-40",
              )}
            >
              <button onClick={() => onSelect(c.id)} className="flex w-full items-start gap-2 text-left">
                <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted opacity-0 group-hover:opacity-100" />
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[c.status] ?? "bg-muted")} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-[0.625rem] text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {c.locked && <Lock className="h-3 w-3 text-brass" />}
                  </span>
                  <span
                    className={cn(
                      "line-clamp-2 text-sm leading-snug",
                      active ? "font-medium text-ink" : "text-ink-soft",
                    )}
                  >
                    {c.title}
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] text-muted">
                    {c.wordCount > 0 ? `${formatNumber(c.wordCount)} words` : "Empty"}
                  </span>
                </span>
              </button>

              {/* hover actions */}
              <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {c.wordCount === 0 && !c.locked && (
                  <button
                    onClick={() => onGenerate(c.id)}
                    disabled={gen}
                    title="Generate chapter"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muse transition-colors hover:bg-muse-soft"
                  >
                    {gen ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                  </button>
                )}
                {chapters.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${c.title}"?`)) onDelete(c.id);
                    }}
                    title="Delete chapter"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-clay/10 hover:text-clay"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {gen && (
                <motion.div
                  layout
                  className="mt-1 ml-6 inline-flex items-center gap-1.5 rounded-md bg-muse-soft px-2 py-0.5 text-[0.6875rem] text-muse-deep"
                >
                  <Spinner className="h-3 w-3" /> writing…
                </motion.div>
              )}
            </div>
          );
        })}

        <button
          onClick={onAdd}
          className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-muted transition-colors hover:border-brass/30 hover:text-brass-deep"
        >
          <Plus className="h-4 w-4" /> Add chapter
        </button>
      </div>

      <div className="flex items-center gap-1 border-t border-line p-2">
        <Link
          href={`/studio/book/${projectId}/memory`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs text-ink-soft transition-colors hover:bg-paper-raised hover:text-ink"
        >
          <Brain className="h-3.5 w-3.5" /> Memory
        </Link>
        <Link
          href={`/studio/book/${projectId}/export`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs text-ink-soft transition-colors hover:bg-paper-raised hover:text-ink"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </Link>
      </div>
    </div>
  );
}
