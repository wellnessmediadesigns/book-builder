"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Play,
  Pause,
  Square,
  Check,
  X,
  Loader2,
  CircleAlert,
  Wand2,
  Clock,
  BookOpenCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn, cleanChapterTitle } from "@/lib/utils";
import { autoWriteChapter } from "@/lib/actions/ai";
import { listMatter, generateMatter, type MatterRow } from "@/lib/actions/matter";

type ChapterLite = {
  id: string;
  order: number;
  title: string;
  wordCount: number;
  locked: boolean;
};

type Item = {
  id: string;
  kind: "chapter" | "matter";
  label: string;
  status: "queued" | "writing" | "done" | "error";
  detail?: string;
};

const PACING = [
  { id: "steady", label: "Steady", sub: "~20s gap", ms: 20_000 },
  { id: "gentle", label: "Gentle", sub: "~60s gap", ms: 60_000 },
  { id: "patient", label: "Patient", sub: "~3 min gap", ms: 180_000 },
];

// Sensible default front/back-matter sections to include.
const DEFAULT_MATTER = new Set([
  "copyright",
  "dedication",
  "introduction",
  "conclusion",
  "about-author",
  "acknowledgments",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AutoWritePanel({
  projectId,
  chapters,
  onClose,
  onChapterWritten,
}: {
  projectId: string;
  chapters: ChapterLite[];
  onClose: () => void;
  onChapterWritten: (id: string, wordCount: number) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"config" | "running" | "paused" | "done">("config");
  const [matter, setMatter] = useState<MatterRow[]>([]);
  const [includeMatter, setIncludeMatter] = useState<Set<string>>(new Set(DEFAULT_MATTER));
  const [pacingMs, setPacingMs] = useState(PACING[0].ms);
  const [summarize, setSummarize] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pauseRef = useRef(false);
  const aliveRef = useRef(true);
  const resumeIndex = useRef(0);

  useEffect(() => {
    aliveRef.current = true;
    listMatter(projectId)
      .then((rows) => setMatter(rows.filter((r) => r.group !== "marketing")))
      .catch(() => {});
    return () => {
      aliveRef.current = false;
    };
  }, [projectId]);

  const emptyChapters = useMemo(
    () => chapters.filter((c) => c.wordCount === 0 && !c.locked).sort((a, b) => a.order - b.order),
    [chapters],
  );

  function buildItems(): Item[] {
    const chapterItems: Item[] = emptyChapters.map((c) => ({
      id: c.id,
      kind: "chapter",
      label: cleanChapterTitle(c.title),
      status: "queued",
    }));
    const matterItems: Item[] = matter
      .filter((m) => includeMatter.has(m.key) && !m.content.trim())
      .map((m) => ({ id: m.id, kind: "matter", label: m.title, status: "queued" }));
    return [...chapterItems, ...matterItems];
  }

  function setStatus(idx: number, status: Item["status"], detail?: string) {
    setItems((cur) => cur.map((it, i) => (i === idx ? { ...it, status, detail } : it)));
  }

  async function pacedDelay(ms: number) {
    let waited = 0;
    const step = 500;
    while (waited < ms) {
      if (pauseRef.current || !aliveRef.current) return;
      await sleep(step);
      waited += step;
    }
  }

  async function runFrom(list: Item[], start: number) {
    setPhase("running");
    setError(null);
    for (let i = start; i < list.length; i++) {
      if (!aliveRef.current) return;
      if (pauseRef.current) {
        resumeIndex.current = i;
        setPhase("paused");
        return;
      }
      setStatus(i, "writing");
      const item = list[i];
      const res =
        item.kind === "chapter"
          ? await autoWriteChapter(item.id, { summarize })
          : await generateMatter(item.id);

      if (!aliveRef.current) return;

      if (res.ok) {
        setStatus(i, "done");
        if (item.kind === "chapter" && "wordCount" in res) onChapterWritten(item.id, res.wordCount);
      } else {
        const msg = res.error === "no_key" ? "Add your AI key in Settings." : res.error;
        setStatus(i, "error", msg);
        resumeIndex.current = i + 1; // skip the failed one on resume, or retry by leaving as i
        setError(
          res.error === "no_key"
            ? "No AI provider is set up. Add a key in Settings, then resume."
            : `Stopped on "${item.label}": ${msg}. You can resume — written chapters are kept.`,
        );
        setPhase("paused");
        return;
      }

      if (i < list.length - 1) await pacedDelay(pacingMs);
    }
    setPhase("done");
    router.refresh();
    toast.success("Book draft complete", "Every chapter is yours to edit.");
  }

  function start() {
    const list = buildItems();
    if (list.length === 0) {
      toast.info("Nothing to write", "All selected chapters and sections already have content.");
      return;
    }
    setItems(list);
    pauseRef.current = false;
    resumeIndex.current = 0;
    runFrom(list, 0);
  }

  function pause() {
    pauseRef.current = true;
  }

  function resume() {
    pauseRef.current = false;
    runFrom(items, resumeIndex.current);
  }

  function stop() {
    pauseRef.current = true;
    aliveRef.current = false;
    onClose();
  }

  const doneCount = items.filter((it) => it.status === "done").length;
  const total = items.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const remaining = total - doneCount;
  const etaMin = Math.ceil((remaining * (45_000 + pacingMs)) / 60_000); // rough: ~45s gen + gap

  const toggleMatter = (key: string) =>
    setIncludeMatter((cur) => {
      const next = new Set(cur);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={phase === "config" || phase === "done" ? onClose : undefined} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-paper-raised shadow-float sm:m-6 sm:rounded-3xl"
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-muse/20 to-brass/10 text-muse">
            {phase === "running" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold text-ink">Write the whole book</h2>
            <p className="text-xs text-muted">
              {phase === "config"
                ? "Quire drafts each chapter in order, then your sections."
                : phase === "done"
                  ? "Done — every chapter drafted."
                  : `${doneCount} of ${total} done${remaining ? ` · ~${etaMin} min left` : ""}`}
            </p>
          </div>
          <button onClick={phase === "running" ? pause : onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-paper-sunken hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* progress bar */}
        {phase !== "config" && (
          <div className="h-1.5 w-full bg-paper-sunken">
            <div className="h-full bg-gradient-to-r from-brass to-muse transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {phase === "config" ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-line bg-paper-sunken/40 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <BookOpenCheck className="h-4 w-4 text-brass" />
                  {emptyChapters.length} chapter{emptyChapters.length === 1 ? "" : "s"} to write
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Empty chapters only, in order — anything you&apos;ve already written is kept.
                </p>
              </div>

              {/* matter checklist */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Also generate these sections
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {matter.length === 0 && <p className="text-xs text-muted">Loading sections…</p>}
                  {matter.map((m) => (
                    <label
                      key={m.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors",
                        includeMatter.has(m.key)
                          ? "border-brass/40 bg-brass-soft text-ink"
                          : "border-line bg-paper-raised text-ink-soft",
                      )}
                    >
                      <input type="checkbox" checked={includeMatter.has(m.key)} onChange={() => toggleMatter(m.key)} className="h-3.5 w-3.5 accent-[hsl(var(--brass))]" />
                      <span className="truncate">{m.title}</span>
                      {m.content.trim() && <Check className="ml-auto h-3 w-3 text-sage" />}
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[0.6875rem] text-muted">
                  Sections that already have content are skipped.
                </p>
              </div>

              {/* pacing */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Clock className="h-3.5 w-3.5" /> Pacing (avoids rate limits)
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PACING.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPacingMs(p.ms)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-center transition-colors",
                        pacingMs === p.ms ? "border-brass/40 bg-brass-soft" : "border-line bg-paper-raised hover:border-brass/30",
                      )}
                    >
                      <p className="text-sm font-medium text-ink">{p.label}</p>
                      <p className="text-[0.6875rem] text-muted">{p.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={summarize} onChange={(e) => setSummarize(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--muse))]" />
                Keep continuity summaries between chapters{" "}
                <span className="text-xs text-muted">(recommended)</span>
              </label>

              <div className="flex items-start gap-2 rounded-xl bg-muse-soft/50 p-3 text-xs text-muse-deep">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Keep this tab open while it writes. You can pause anytime, and closing then
                reopening just resumes where it left off.
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                    it.status === "writing" ? "border-muse/30 bg-muse-soft/40" : "border-line bg-paper-raised",
                  )}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {it.status === "done" && <Check className="h-4 w-4 text-sage" />}
                    {it.status === "writing" && <Loader2 className="h-4 w-4 animate-spin text-muse" />}
                    {it.status === "queued" && <span className="h-2 w-2 rounded-full bg-muted" />}
                    {it.status === "error" && <CircleAlert className="h-4 w-4 text-clay" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{it.label}</p>
                    {it.detail && <p className="truncate text-xs text-clay">{it.detail}</p>}
                  </div>
                  <span className="text-[0.6875rem] capitalize text-muted">
                    {it.kind === "matter" ? "section" : it.status === "done" ? "" : "chapter"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-clay/20 bg-clay/5 p-3 text-sm text-clay">
              {error}
            </div>
          )}
        </div>

        {/* footer controls */}
        <div className="flex items-center gap-2 border-t border-line bg-paper-sunken/30 px-5 py-3.5">
          {phase === "config" && (
            <>
              <Button variant="brass" onClick={start} className="flex-1">
                <Play className="h-4 w-4" /> Start writing
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </>
          )}
          {phase === "running" && (
            <>
              <Button variant="outline" onClick={pause} className="flex-1">
                <Pause className="h-4 w-4" /> Pause
              </Button>
              <Button variant="ghost" onClick={stop}>
                <Square className="h-4 w-4" /> Stop
              </Button>
            </>
          )}
          {phase === "paused" && (
            <>
              <Button variant="brass" onClick={resume} className="flex-1">
                <Play className="h-4 w-4" /> Resume
              </Button>
              <Button variant="ghost" onClick={stop}>Close</Button>
            </>
          )}
          {phase === "done" && (
            <Button variant="brass" onClick={onClose} className="flex-1">
              <Sparkles className="h-4 w-4" /> Done — start editing
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
