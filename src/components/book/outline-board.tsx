"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GripVertical,
  Plus,
  Lock,
  Trash2,
  Sparkles,
  PenLine,
  BookOpen,
  FolderInput,
} from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { EditableText } from "@/components/book/editable-text";
import { toast } from "@/components/ui/toast";
import { cn, formatNumber } from "@/lib/utils";
import {
  updateChapterMeta,
  reorderChapters,
  addChapter,
  deleteChapter,
} from "@/lib/actions/chapters";
import { convertChapterToMatter } from "@/lib/actions/matter";

const MOVE_TARGETS = [
  { mt: "front:introduction", label: "Introduction" },
  { mt: "front:how-to-use", label: "How to Use This Book" },
  { mt: "front:about-book", label: "About This Book" },
  { mt: "front:preface", label: "Preface" },
  { mt: "front:foreword", label: "Foreword" },
  { mt: "back:conclusion", label: "Conclusion" },
];

type Ch = {
  id: string;
  order: number;
  title: string;
  summary: string;
  wordCount: number;
  minWords: number;
  maxWords: number;
  status: string;
  locked: boolean;
};

const STATUS: Record<string, { label: string; tone: "neutral" | "brass" | "muse" | "sage" }> = {
  planned: { label: "Planned", tone: "neutral" },
  drafting: { label: "Drafting", tone: "brass" },
  drafted: { label: "Drafted", tone: "muse" },
  revised: { label: "Revised", tone: "sage" },
  final: { label: "Final", tone: "sage" },
};

export function OutlineBoard({
  projectId,
  initial,
}: {
  projectId: string;
  initial: Ch[];
}) {
  const router = useRouter();
  const [chapters, setChapters] = useState<Ch[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  async function moveToSection(id: string, mt: string, label: string) {
    setMenuId(null);
    const res = await convertChapterToMatter(id, mt);
    if (res.ok) {
      setChapters((cs) => cs.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })));
      toast.success(`Moved to “${label}”`, "Edit it any time in the Sections tab.");
    } else {
      toast.error("Couldn't move this chapter");
    }
  }

  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  const goalWords = chapters.reduce((s, c) => s + (c.maxWords || 0), 0);
  const drafted = chapters.filter((c) => c.wordCount > 0).length;

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = chapters.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    const reordered = ids.map((id, i) => ({ ...chapters.find((c) => c.id === id)!, order: i }));
    setChapters(reordered);
    setDragId(null);
    setOverId(null);
    reorderChapters(projectId, ids).catch(() => toast.error("Couldn't save new order"));
  }

  async function add() {
    const id = await addChapter(projectId);
    setChapters((cs) => [
      ...cs,
      {
        id,
        order: cs.length,
        title: `Chapter ${cs.length + 1}`,
        summary: "",
        wordCount: 0,
        minWords: cs[0]?.minWords ?? 0,
        maxWords: cs[0]?.maxWords ?? 0,
        status: "planned",
        locked: false,
      },
    ]);
  }

  async function remove(id: string) {
    await deleteChapter(id);
    setChapters((cs) => cs.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone="brass">
            <BookOpen className="h-3 w-3" /> Outline
          </Badge>
          <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
            The whole book at a glance
          </h1>
          <p className="mt-2 max-w-xl text-ink-soft">
            Drag to reorder, edit titles and summaries inline, and see progress per chapter.
            Summaries feed Book Memory, keeping the AI consistent.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="neutral">{chapters.length} chapters</Badge>
          <Badge tone="neutral">{drafted} drafted</Badge>
          <Badge tone="neutral">{formatNumber(totalWords)} words</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map((c, i) => {
          const goal = c.maxWords || goalWords / Math.max(1, chapters.length);
          const pct = goal > 0 ? Math.min(100, Math.round((c.wordCount / goal) * 100)) : 0;
          const status = STATUS[c.status] ?? STATUS.planned;
          return (
            <motion.div
              layout
              key={c.id}
              draggable
              onDragStart={() => setDragId(c.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(c.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDrop={() => handleDrop(c.id)}
              transition={{ duration: 0.2 }}
              className={cn(
                "group flex flex-col rounded-2xl border bg-paper-raised p-4 shadow-soft transition-all",
                dragId === c.id ? "opacity-40" : "hover:shadow-raised",
                overId === c.id && dragId && dragId !== c.id
                  ? "border-muse/50 ring-2 ring-muse/20"
                  : "border-line",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <GripVertical className="h-4 w-4 cursor-grab text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="font-mono text-xs text-brass">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {c.locked && <Lock className="h-3 w-3 text-brass" />}
                <Badge tone={status.tone} className="ml-auto text-[0.625rem]">
                  {status.label}
                </Badge>
              </div>

              <EditableText
                value={c.title}
                onSave={(v) => {
                  updateChapterMeta(c.id, { title: v });
                  setChapters((cs) => cs.map((x) => (x.id === c.id ? { ...x, title: v } : x)));
                }}
                className="font-display text-base font-semibold leading-snug text-ink"
              />
              <EditableText
                value={c.summary}
                onSave={(v) => {
                  updateChapterMeta(c.id, { summary: v });
                  setChapters((cs) => cs.map((x) => (x.id === c.id ? { ...x, summary: v } : x)));
                }}
                placeholder="Add a summary…"
                multiline
                className="mt-1.5 line-clamp-4 min-h-[3.5rem] text-sm text-ink-soft"
              />

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-sunken">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brass to-muse transition-all duration-500"
                  style={{ width: `${Math.max(c.wordCount > 0 ? 3 : 0, pct)}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[0.6875rem] text-muted">
                <span>
                  {formatNumber(c.wordCount)}
                  {c.maxWords ? ` / ${formatNumber(c.maxWords)}` : ""} words
                </span>
                <span>{pct}%</span>
              </div>

              <div className="relative mt-3 flex items-center gap-1 border-t border-line pt-3">
                {c.wordCount === 0 ? (
                  <Button
                    variant="museSoft"
                    size="sm"
                    onClick={() =>
                      router.push(`/studio/book/${projectId}/write?chapter=${c.id}&generate=1`)
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate
                  </Button>
                ) : (
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => router.push(`/studio/book/${projectId}/write?chapter=${c.id}`)}
                  >
                    <PenLine className="h-3.5 w-3.5" /> Open
                  </Button>
                )}

                <button
                  onClick={() => setMenuId((m) => (m === c.id ? null : c.id))}
                  title="Convert to a front/back-matter section"
                  className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
                >
                  <FolderInput className="h-3.5 w-3.5" /> Move
                </button>
                {chapters.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${c.title}"?`)) remove(c.id);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-clay/10 hover:text-clay"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {menuId === c.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                    <div className="absolute bottom-10 right-0 z-20 w-56 overflow-hidden rounded-xl border border-line bg-paper-raised p-1 shadow-float animate-scale-in">
                      <p className="px-2.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                        Move to section
                      </p>
                      {MOVE_TARGETS.map((t) => (
                        <button
                          key={t.mt}
                          onClick={() => moveToSection(c.id, t.mt, t.label)}
                          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
                        >
                          {t.label}
                        </button>
                      ))}
                      <p className="px-2.5 py-1.5 text-[0.6875rem] text-muted">
                        Removes it from the chapter list and into your book sections.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}

        <button
          onClick={add}
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-muted transition-colors hover:border-brass/40 hover:text-brass-deep"
        >
          <Plus className="h-6 w-6" />
          <span className="text-sm">Add chapter</span>
        </button>
      </div>
    </div>
  );
}
