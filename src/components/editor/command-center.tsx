"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRightToLine,
  Wand2,
  Maximize2,
  Minimize2,
  Heart,
  Waves,
  MessageSquareQuote,
  ListChecks,
  ShieldCheck,
  Repeat,
  PencilLine,
  History,
  Camera,
  RotateCcw,
  PanelRightClose,
  Lock,
  Unlock,
  GitCompareArrows,
  StickyNote,
  BookmarkIcon,
  Trash2,
  Check,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import type { NoteData } from "@/lib/actions/notes";
import { cn, relativeTime, formatNumber } from "@/lib/utils";
import { Spinner } from "@/components/ui/primitives";

export type ChapterAction =
  | { type: "generate" }
  | { type: "continue" }
  | { type: "transform"; cmd: string }
  | { type: "analysis"; cmd: string }
  | { type: "custom"; instruction: string };

type Version = {
  id: string;
  label: string;
  source: string;
  wordCount: number;
  createdAt: string;
};

const WRITE: { label: string; icon: LucideIcon; action: ChapterAction }[] = [
  { label: "Generate chapter", icon: Sparkles, action: { type: "generate" } },
  { label: "Continue writing", icon: ArrowRightToLine, action: { type: "continue" } },
];

const IMPROVE: { label: string; icon: LucideIcon; cmd: string }[] = [
  { label: "Improve", icon: Sparkles, cmd: "improve" },
  { label: "Rewrite", icon: Wand2, cmd: "rewrite" },
  { label: "Expand", icon: Maximize2, cmd: "expand" },
  { label: "Condense", icon: Minimize2, cmd: "condense" },
  { label: "Humanize", icon: Heart, cmd: "humanize" },
  { label: "Improve flow", icon: Waves, cmd: "flow" },
  { label: "Improve pacing", icon: Waves, cmd: "pacing" },
  { label: "Add emotion", icon: Heart, cmd: "emotion" },
  { label: "Add dialogue", icon: MessageSquareQuote, cmd: "dialogue" },
  { label: "Add examples", icon: ListChecks, cmd: "examples" },
];

const ANALYZE: { label: string; icon: LucideIcon; cmd: string }[] = [
  { label: "Check readability", icon: ListChecks, cmd: "readability" },
  { label: "Check continuity", icon: ShieldCheck, cmd: "continuity" },
  { label: "Check repetition", icon: Repeat, cmd: "repetition" },
];

export function CommandCenter({
  chapterTitle,
  wordCount,
  minWords,
  maxWords,
  locked,
  busy,
  analysis,
  analysisLoading,
  versions,
  notes,
  onAction,
  onSnapshot,
  onRestore,
  onCompare,
  onToggleLock,
  onCollapse,
  onAddComment,
  onToggleComment,
  onDeleteComment,
  onJumpBookmark,
  onDeleteBookmark,
}: {
  chapterTitle: string;
  wordCount: number;
  minWords: number;
  maxWords: number;
  locked: boolean;
  busy: boolean;
  analysis: string | null;
  analysisLoading: boolean;
  versions: Version[];
  notes: NoteData;
  onAction: (a: ChapterAction) => void;
  onSnapshot: () => void;
  onRestore: (id: string) => void;
  onCompare: (id: string) => void;
  onToggleLock: () => void;
  onCollapse: () => void;
  onAddComment: (body: string) => void;
  onToggleComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
  onJumpBookmark: (anchor: string) => void;
  onDeleteBookmark: (id: string) => void;
}) {
  const [tab, setTab] = useState<"ai" | "history" | "notes">("ai");
  const [comment, setComment] = useState("");
  const [custom, setCustom] = useState("");
  const goal = maxWords > 0 ? Math.min(100, Math.round((wordCount / maxWords) * 100)) : 0;

  return (
    <div className="flex h-full flex-col bg-paper-sunken/30">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-paper-sunken/70 p-0.5">
          <TabBtn active={tab === "ai"} onClick={() => setTab("ai")}>
            <Sparkles className="h-3.5 w-3.5" /> AI
          </TabBtn>
          <TabBtn active={tab === "history"} onClick={() => setTab("history")}>
            <History className="h-3.5 w-3.5" /> History
          </TabBtn>
          <TabBtn active={tab === "notes"} onClick={() => setTab("notes")}>
            <StickyNote className="h-3.5 w-3.5" /> Notes
          </TabBtn>
        </div>
        <button
          onClick={onCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink"
          title="Hide panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="truncate">{chapterTitle}</span>
          <span className="font-mono">{formatNumber(wordCount)}w</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-sunken">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brass to-muse transition-all duration-500"
            style={{ width: `${goal}%` }}
          />
        </div>
        {maxWords > 0 && (
          <p className="mt-1 text-[0.6875rem] text-muted">
            Goal: {formatNumber(minWords)}–{formatNumber(maxWords)} words
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {tab === "ai" ? (
          <div className="space-y-4">
            {locked && (
              <div className="flex items-center gap-2 rounded-xl bg-brass-soft px-3 py-2 text-xs text-brass-deep">
                <Lock className="h-3.5 w-3.5" /> Chapter locked — AI is paused here.
              </div>
            )}

            <Group label="Write">
              {WRITE.map((b) => (
                <ActionBtn
                  key={b.label}
                  icon={b.icon}
                  disabled={busy || locked}
                  primary
                  onClick={() => onAction(b.action)}
                >
                  {b.label}
                </ActionBtn>
              ))}
            </Group>

            <Group label="Improve whole chapter">
              <div className="grid grid-cols-2 gap-1.5">
                {IMPROVE.map((b) => (
                  <ActionBtn
                    key={b.cmd}
                    icon={b.icon}
                    small
                    disabled={busy || locked || wordCount === 0}
                    onClick={() => onAction({ type: "transform", cmd: b.cmd })}
                  >
                    {b.label}
                  </ActionBtn>
                ))}
              </div>
            </Group>

            <Group label="Strengthen">
              <div className="grid grid-cols-2 gap-1.5">
                <ActionBtn
                  icon={PencilLine}
                  small
                  disabled={busy || locked || wordCount === 0}
                  onClick={() => onAction({ type: "transform", cmd: "intro" })}
                >
                  Introduction
                </ActionBtn>
                <ActionBtn
                  icon={PencilLine}
                  small
                  disabled={busy || locked || wordCount === 0}
                  onClick={() => onAction({ type: "transform", cmd: "conclusion" })}
                >
                  Conclusion
                </ActionBtn>
              </div>
            </Group>

            <Group label="Analyze">
              {ANALYZE.map((b) => (
                <ActionBtn
                  key={b.cmd}
                  icon={b.icon}
                  disabled={analysisLoading || wordCount === 0}
                  onClick={() => onAction({ type: "analysis", cmd: b.cmd })}
                >
                  {b.label}
                </ActionBtn>
              ))}
            </Group>

            {/* custom */}
            <Group label="Custom request">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (custom.trim()) {
                    onAction({ type: "custom", instruction: custom.trim() });
                    setCustom("");
                  }
                }}
              >
                <textarea
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Tell Quire what to do with this chapter…"
                  disabled={busy || locked || wordCount === 0}
                  className="min-h-[64px] w-full resize-y rounded-xl border border-line bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-muted outline-none focus:border-muse/40 focus:ring-2 focus:ring-muse/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={busy || locked || !custom.trim() || wordCount === 0}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-muse px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-muse-deep disabled:opacity-50"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Run on chapter
                </button>
              </form>
            </Group>

            {/* analysis output */}
            <AnimatePresence>
              {(analysisLoading || analysis) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-muse/20 bg-muse-soft/40 p-3"
                >
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muse-deep">
                    <Sparkles className="h-3.5 w-3.5" /> Analysis
                  </p>
                  {analysisLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-ink-soft">
                      <Spinner className="text-muse" /> Reviewing…
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                      {analysis}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : tab === "history" ? (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <button
                onClick={onSnapshot}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
              >
                <Camera className="h-3.5 w-3.5" /> Snapshot now
              </button>
              <button
                onClick={onToggleLock}
                title={locked ? "Unlock chapter" : "Lock chapter"}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  locked
                    ? "bg-brass text-white hover:bg-brass-deep"
                    : "bg-paper-raised text-ink-soft hover:bg-paper-sunken",
                )}
              >
                {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </button>
            </div>

            {versions.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-muted">
                No versions yet. Snapshots and accepted AI edits appear here.
              </p>
            ) : (
              versions.map((v) => (
                <div
                  key={v.id}
                  className="group flex items-center gap-2 rounded-xl border border-line bg-paper-raised px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {v.label || sourceLabel(v.source)}
                    </p>
                    <p className="text-[0.6875rem] text-muted">
                      {formatNumber(v.wordCount)} words · {relativeTime(v.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onCompare(v.id)}
                    title="Compare with current"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-all hover:bg-muse-soft hover:text-muse-deep sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Restore this version? Your current text is snapshotted first."))
                        onRestore(v.id);
                    }}
                    title="Restore"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-all hover:bg-paper-sunken hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          // notes tab — comments & bookmarks
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (comment.trim()) {
                  onAddComment(comment.trim());
                  setComment("");
                }
              }}
              className="flex gap-1.5"
            >
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note to this chapter…"
                className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-paper-raised px-3 text-sm text-ink placeholder:text-muted outline-none focus:border-muse/40 focus:ring-2 focus:ring-muse/20"
              />
              <button
                type="submit"
                disabled={!comment.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </form>

            {notes.comments.length === 0 && notes.bookmarks.length === 0 && (
              <p className="px-1 py-4 text-center text-sm text-muted">
                Notes and bookmarks live here. Select text and tap the bookmark icon to
                mark a passage.
              </p>
            )}

            {notes.comments.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group rounded-xl border border-line bg-paper-raised px-3 py-2.5",
                  c.resolved && "opacity-60",
                )}
              >
                <p className={cn("text-sm text-ink", c.resolved && "line-through")}>{c.body}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[0.6875rem] text-muted">{relativeTime(c.createdAt)}</span>
                  <button
                    onClick={() => onToggleComment(c.id)}
                    title={c.resolved ? "Reopen" : "Resolve"}
                    className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-sage/10 hover:text-sage"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    title="Delete"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-clay/10 hover:text-clay"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {notes.bookmarks.length > 0 && (
              <div>
                <p className="mb-1.5 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                  Bookmarks
                </p>
                <div className="space-y-1.5">
                  {notes.bookmarks.map((b) => (
                    <div
                      key={b.id}
                      className="group flex items-center gap-2 rounded-xl border border-line bg-paper-raised px-3 py-2"
                    >
                      <BookmarkIcon className="h-3.5 w-3.5 shrink-0 text-brass" />
                      <button
                        onClick={() => onJumpBookmark(b.anchor)}
                        className="min-w-0 flex-1 truncate text-left text-sm text-ink-soft transition-colors hover:text-ink"
                      >
                        {b.label}
                      </button>
                      <button
                        onClick={() => onDeleteBookmark(b.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-clay/10 hover:text-clay sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function sourceLabel(s: string) {
  return (
    { manual: "Manual save", ai: "After AI edit", snapshot: "Snapshot", generation: "Generated" }[s] ??
    "Version"
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
        active ? "bg-paper-raised text-ink shadow-soft" : "text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  children,
  onClick,
  disabled,
  primary,
  small,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 text-left transition-all disabled:opacity-40",
        small ? "py-1.5 text-xs" : "w-full py-2 text-sm",
        primary
          ? "bg-gradient-to-r from-muse to-muse-deep font-medium text-white hover:opacity-90"
          : "border border-line bg-paper-raised text-ink-soft hover:border-muse/30 hover:text-ink",
      )}
    >
      <Icon className={cn(small ? "h-3.5 w-3.5" : "h-4 w-4", "shrink-0", primary ? "text-white" : "text-muse/70")} />
      <span className="truncate">{children}</span>
    </button>
  );
}
