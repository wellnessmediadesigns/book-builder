"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftOpen,
  PanelRightOpen,
  Focus,
  Check,
  Cloud,
  CloudOff,
  Loader2,
  Type,
} from "lucide-react";

import { Lock } from "@/components/editor/extensions/lock";
import { FloatingToolbar, type SelInfo } from "@/components/editor/floating-toolbar";
import { RevisionCard, type PendingRevision } from "@/components/editor/revision-card";
import { ChapterRail, type ChapterMeta } from "@/components/editor/chapter-rail";
import { CommandCenter, type ChapterAction } from "@/components/editor/command-center";
import { BookHeader } from "@/components/book/book-header";
import { toast } from "@/components/ui/toast";
import { cn, textToDoc, countWords, relativeTime } from "@/lib/utils";
import {
  saveChapterContent,
  createSnapshot,
  restoreVersion,
  toggleChapterLock,
  addChapter,
  deleteChapter,
  reorderChapters,
  resolveRevision,
  listChapterVersions,
} from "@/lib/actions/chapters";
import { runSelectionCommand, runChapterAnalysis } from "@/lib/actions/ai";

type FullChapter = ChapterMeta & {
  summary: string;
  contentJson: string | null;
};

type Version = { id: string; label: string; source: string; wordCount: number; createdAt: string };

const STRENGTHEN: Record<string, string> = {
  intro: "Strengthen the opening of this passage so it hooks the reader immediately.",
  conclusion: "Strengthen the ending of this passage so it lands with impact.",
};

export function Writer({
  projectId,
  bookTitle,
  aiReady,
  initialChapters,
}: {
  projectId: string;
  bookTitle: string;
  aiReady: boolean;
  initialChapters: FullChapter[];
}) {
  const [chapters, setChapters] = useState<FullChapter[]>(initialChapters);
  const [activeId, setActiveId] = useState(initialChapters[0]?.id ?? "");
  const [railOpen, setRailOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [readingFont, setReadingFont] = useState<"serif" | "sans">("serif");

  const [sel, setSel] = useState<SelInfo | null>(null);
  const [revision, setRevision] = useState<PendingRevision | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);

  const [save, setSave] = useState<{ status: "idle" | "saving" | "saved" | "error"; at: number }>({
    status: "idle",
    at: 0,
  });

  const active = chapters.find((c) => c.id === activeId);
  const activeIdRef = useRef(activeId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRect = useRef<SelInfo["rect"]>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Lock,
      Typography,
      CharacterCount,
      Placeholder.configure({
        placeholder: "Begin writing, or generate this chapter from the panel on the right…",
      }),
    ],
    editorProps: {
      attributes: { class: "min-h-[60vh] focus:outline-none" },
    },
    content: active?.contentJson ? safeParse(active.contentJson) : emptyDoc(),
    onUpdate: ({ editor }) => scheduleSave(editor),
    onSelectionUpdate: ({ editor }) => updateSelection(editor),
  });

  // ——— selection tracking ———
  const updateSelection = useCallback((ed: Editor) => {
    const { from, to, empty } = ed.state.selection;
    if (empty || to - from < 1) {
      setSel(null);
      return;
    }
    const text = ed.state.doc.textBetween(from, to, " ");
    if (!text.trim()) {
      setSel(null);
      return;
    }
    let rect: SelInfo["rect"] = lastRect.current;
    const domSel = typeof window !== "undefined" ? window.getSelection() : null;
    if (domSel && domSel.rangeCount > 0) {
      const r = domSel.getRangeAt(0).getBoundingClientRect();
      if (r.width || r.height) {
        rect = { top: r.top, left: r.left, width: r.width };
        lastRect.current = rect;
      }
    }
    const locked = ed.isActive("lock");
    setSel({ text, from, to, rect, locked });
  }, []);

  // ——— autosave ———
  const scheduleSave = useCallback((ed: Editor) => {
    setSave((s) => ({ ...s, status: "saving" }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const id = activeIdRef.current;
    saveTimer.current = setTimeout(async () => {
      try {
        const json = ed.getJSON();
        const { wordCount } = await saveChapterContent(id, json);
        setChapters((cs) =>
          cs.map((c) => (c.id === id ? { ...c, wordCount, contentJson: JSON.stringify(json) } : c)),
        );
        setSave({ status: "saved", at: Date.now() });
      } catch {
        setSave({ status: "error", at: Date.now() });
      }
    }, 1100);
  }, []);

  async function flushSave() {
    if (!editor) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const id = activeIdRef.current;
    const json = editor.getJSON();
    try {
      await saveChapterContent(id, json);
      setChapters((cs) =>
        cs.map((c) =>
          c.id === id ? { ...c, wordCount: countWords(editor.getText()), contentJson: JSON.stringify(json) } : c,
        ),
      );
    } catch {
      /* ignore */
    }
  }

  // ——— switch chapter ———
  async function selectChapter(id: string) {
    if (id === activeId || !editor) return;
    await flushSave();
    setSel(null);
    setRevision(null);
    setAnalysis(null);
    activeIdRef.current = id;
    setActiveId(id);
    const next = chapters.find((c) => c.id === id);
    editor.commands.setContent(next?.contentJson ? safeParse(next.contentJson) : emptyDoc(), false);
    loadVersions(id);
  }

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadVersions = useCallback(async (id: string) => {
    try {
      setVersions(await listChapterVersions(id));
    } catch {
      setVersions([]);
    }
  }, []);

  useEffect(() => {
    if (activeId) loadVersions(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— selection AI command ———
  async function runCommand(cmd: string, instruction = "") {
    if (!editor || !sel) return;
    if (!ensureAi()) return;
    const { from, to, text, rect } = sel;
    const surrounding = editor.state.doc.textBetween(
      Math.max(0, from - 600),
      Math.min(editor.state.doc.content.size, to + 600),
      " ",
    );
    setSel(null);
    setRevision({ from, to, command: instruction ? "custom" : cmd, instruction, original: text, proposed: "", loading: true, rect });
    const res = await runSelectionCommand(activeId, instruction ? "custom" : cmd, instruction, text, surrounding);
    setRevision((r) =>
      r
        ? res.ok
          ? { ...r, proposed: res.data.proposed, loading: false }
          : { ...r, loading: false, error: res.error === "no_key" ? "Add your AI key in Settings." : res.error }
        : null,
    );
  }

  function acceptRevision() {
    if (!editor || !revision) return;
    const { from, to, proposed, command, instruction, original } = revision;
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, proposed)
      .run();
    setRevision(null);
    resolveRevision(activeId, command, instruction, original, proposed, "accepted").catch(() => {});
    // snapshot after AI edit
    const json = editor.getJSON();
    saveChapterContent(activeId, json, { snapshot: true, source: "ai" }).then(() => {
      loadVersions(activeId);
      setSave({ status: "saved", at: Date.now() });
    });
    toast.success("Revision accepted");
  }

  function rejectRevision() {
    if (revision) resolveRevision(activeId, revision.command, revision.instruction, revision.original, revision.proposed, "rejected").catch(() => {});
    setRevision(null);
  }

  // ——— lock ———
  function toggleSelectionLock() {
    if (!editor) return;
    editor.chain().focus().toggleLock().run();
    setSel((s) => (s ? { ...s, locked: !s.locked } : s));
  }

  async function toggleLock() {
    const res = await toggleChapterLock(activeId);
    setChapters((cs) => cs.map((c) => (c.id === activeId ? { ...c, locked: res.locked } : c)));
    toast.success(res.locked ? "Chapter locked" : "Chapter unlocked");
  }

  // ——— chapter actions ———
  async function handleChapterAction(a: ChapterAction) {
    if (!editor || !active) return;
    if (a.type === "analysis") return runAnalysis(a.cmd);
    if (!ensureAi()) return;

    if (a.type === "generate" || a.type === "continue") {
      return streamGenerate(a.type);
    }

    // transform / custom — operate on whole chapter as a revision
    const whole = editor.getText();
    if (!whole.trim()) return;
    const from = 1;
    const to = editor.state.doc.content.size - 1;
    let cmd = "improve";
    let instruction = "";
    if (a.type === "custom") {
      cmd = "custom";
      instruction = a.instruction;
    } else if (a.cmd in STRENGTHEN) {
      cmd = "custom";
      instruction = STRENGTHEN[a.cmd];
    } else {
      cmd = a.cmd;
    }
    setBusy(true);
    setRevision({
      from,
      to,
      command: instruction ? "custom" : cmd,
      instruction,
      original: whole.length > 280 ? whole.slice(0, 280) + "…" : whole,
      proposed: "",
      loading: true,
      rect: { top: 120, left: window.innerWidth / 2 - 200, width: 0 },
    });
    const res = await runSelectionCommand(activeId, instruction ? "custom" : cmd, instruction, whole, "");
    setBusy(false);
    setRevision((r) =>
      r
        ? res.ok
          ? { ...r, proposed: res.data.proposed.length > 280 ? res.data.proposed.slice(0, 280) + "…" : res.data.proposed, loading: false, original: whole.slice(0, 280) + (whole.length > 280 ? "…" : "") }
          : { ...r, loading: false, error: res.error }
        : null,
    );
    // store full proposed for accept
    if (res.ok) fullProposed.current = { from, to, text: res.data.proposed };
  }

  const fullProposed = useRef<{ from: number; to: number; text: string } | null>(null);

  // override accept when a full-chapter proposal is staged
  function acceptAny() {
    if (fullProposed.current && editor) {
      const { from, to, text } = fullProposed.current;
      editor.chain().focus().insertContentAt({ from, to }, textToDoc(text).content).run();
      fullProposed.current = null;
      setRevision(null);
      const json = editor.getJSON();
      saveChapterContent(activeId, json, { snapshot: true, source: "ai" }).then(() => loadVersions(activeId));
      toast.success("Chapter updated");
      return;
    }
    acceptRevision();
  }

  function rejectAny() {
    fullProposed.current = null;
    rejectRevision();
  }

  // ——— streaming generation ———
  async function streamGenerate(mode: "generate" | "continue") {
    if (!editor || !active) return;
    setGeneratingId(active.id);
    setBusy(true);
    const base = mode === "continue" ? editor.getText() : "";
    if (mode === "generate") editor.commands.setContent(emptyDoc(), false);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: active.id, mode }),
      });
      if (res.status === 428) {
        toast.error("Add your AI key first", "Open Settings to connect a provider.");
        return;
      }
      if (res.status === 423) {
        toast.error("Chapter is locked", "Unlock it to generate.");
        return;
      }
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let raf = 0;
      const render = () => {
        const text = (base ? base + "\n\n" : "") + acc;
        editor.commands.setContent(textToDoc(text), false);
        editor.commands.focus("end");
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (acc.includes("[[QUIRE_ERROR]]")) {
          const msg = acc.split("[[QUIRE_ERROR]]")[1];
          acc = acc.split("[[QUIRE_ERROR]]")[0];
          render();
          toast.error("Generation stopped", msg);
          break;
        }
        if (!raf) {
          raf = requestAnimationFrame(() => {
            render();
            raf = 0;
          });
        }
      }
      cancelAnimationFrame(raf);
      render();

      const json = editor.getJSON();
      const { wordCount } = await saveChapterContent(active.id, json, {
        snapshot: true,
        source: "generation",
      });
      setChapters((cs) =>
        cs.map((c) =>
          c.id === active.id ? { ...c, wordCount, status: "drafted", contentJson: JSON.stringify(json) } : c,
        ),
      );
      setSave({ status: "saved", at: Date.now() });
      loadVersions(active.id);
      toast.success(mode === "continue" ? "Chapter extended" : "Chapter drafted", "Edit any word — it's yours.");
    } catch {
      toast.error("Generation failed", "Check your connection and try again.");
    } finally {
      setGeneratingId(null);
      setBusy(false);
    }
  }

  async function runAnalysis(cmd: string) {
    if (!ensureAi()) return;
    setAnalysis(null);
    setAnalysisLoading(true);
    const res = await runChapterAnalysis(activeId, cmd);
    setAnalysisLoading(false);
    if (res.ok) setAnalysis(res.data.report);
    else toast.error("Analysis failed", res.error);
  }

  // ——— rail ops ———
  async function handleAdd() {
    const id = await addChapter(projectId);
    setChapters((cs) => [
      ...cs,
      {
        id,
        order: cs.length,
        title: `Chapter ${cs.length + 1}`,
        summary: "",
        wordCount: 0,
        minWords: active?.minWords ?? 0,
        maxWords: active?.maxWords ?? 0,
        locked: false,
        status: "planned",
        contentJson: null,
      },
    ]);
  }

  async function handleDelete(id: string) {
    await deleteChapter(id);
    const remaining = chapters.filter((c) => c.id !== id);
    setChapters(remaining);
    if (id === activeId && remaining[0]) selectChapter(remaining[0].id);
  }

  async function handleReorder(ids: string[]) {
    setChapters((cs) => ids.map((id, i) => ({ ...cs.find((c) => c.id === id)!, order: i })));
    await reorderChapters(projectId, ids);
  }

  async function handleSnapshot() {
    await flushSave();
    await createSnapshot(activeId, "");
    loadVersions(activeId);
    toast.success("Snapshot saved");
  }

  async function handleRestore(versionId: string) {
    const { contentJson } = await restoreVersion(versionId);
    if (editor && contentJson) editor.commands.setContent(safeParse(contentJson), false);
    setChapters((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, wordCount: countWords(editor?.getText() ?? "") } : c)),
    );
    loadVersions(activeId);
    toast.success("Version restored", "Previous text was snapshotted first.");
  }

  function ensureAi(): boolean {
    if (!aiReady) {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
      return false;
    }
    return true;
  }

  // keyboard: cmd+s snapshot, cmd+\ focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSnapshot();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setFocusMode((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const wordCount = editor?.storage.characterCount
    ? editor.storage.characterCount.words()
    : active?.wordCount ?? 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <BookHeader
        projectId={projectId}
        title={bookTitle}
        right={<SaveBadge status={save.status} at={save.at} />}
      />

      <div className="flex min-h-0 flex-1">
        {/* Chapter rail */}
        <AnimatePresence initial={false}>
          {railOpen && !focusMode && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 264, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 overflow-hidden border-r border-line"
            >
              <div className="h-full w-[264px]">
                <ChapterRail
                  projectId={projectId}
                  bookTitle={bookTitle}
                  chapters={chapters}
                  activeId={activeId}
                  generatingId={generatingId}
                  onSelect={selectChapter}
                  onAdd={handleAdd}
                  onDelete={handleDelete}
                  onReorder={handleReorder}
                  onGenerate={(id) => {
                    if (id !== activeId) selectChapter(id).then(() => setTimeout(() => streamGenerate("generate"), 60));
                    else streamGenerate("generate");
                  }}
                  onCollapse={() => setRailOpen(false)}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Canvas */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {/* canvas toolbar */}
          <div className="flex items-center gap-1 border-b border-line/60 px-4 py-2">
            {!railOpen && !focusMode && (
              <IconBtn title="Show chapters" onClick={() => setRailOpen(true)}>
                <PanelLeftOpen className="h-4 w-4" />
              </IconBtn>
            )}
            <FormatBar editor={editor} />
            <div className="ml-auto flex items-center gap-1">
              <IconBtn
                title="Toggle reading font"
                onClick={() => setReadingFont((f) => (f === "serif" ? "sans" : "serif"))}
              >
                <Type className="h-4 w-4" />
              </IconBtn>
              <IconBtn title="Focus mode (⌘\\)" onClick={() => setFocusMode((f) => !f)} active={focusMode}>
                <Focus className="h-4 w-4" />
              </IconBtn>
              {!panelOpen && !focusMode && (
                <IconBtn title="Show AI panel" onClick={() => setPanelOpen(true)}>
                  <PanelRightOpen className="h-4 w-4" />
                </IconBtn>
              )}
            </div>
          </div>

          <div className="manuscript min-h-0 flex-1 overflow-y-auto" onClick={() => editor?.commands.focus()}>
            <div
              className={cn("mx-auto px-6 py-14 transition-all duration-300", focusMode ? "max-w-2xl py-24" : "max-w-3xl")}
              style={{
                ["--reading-measure" as string]: focusMode ? "40rem" : "38rem",
              }}
            >
              <h1
                className={cn(
                  "mx-auto mb-2 max-w-[38rem] font-display text-3xl font-semibold text-ink",
                  active?.locked && "opacity-90",
                )}
              >
                {active?.title}
              </h1>
              <div className="mx-auto mb-8 flex max-w-[38rem] items-center gap-2 text-xs text-muted">
                <span>{wordCount} words</span>
                {active?.locked && (
                  <span className="inline-flex items-center gap-1 text-brass">· locked</span>
                )}
              </div>
              <div className={readingFont === "sans" ? "[&_.ProseMirror]:font-sans" : ""}>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {focusMode && (
            <button
              onClick={() => setFocusMode(false)}
              className="absolute right-4 top-16 rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs text-ink-soft shadow-soft transition-colors hover:text-ink"
            >
              Exit focus
            </button>
          )}
        </main>

        {/* Command center */}
        <AnimatePresence initial={false}>
          {panelOpen && !focusMode && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 312, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 overflow-hidden border-l border-line"
            >
              <div className="h-full w-[312px]">
                <CommandCenter
                  chapterTitle={active?.title ?? ""}
                  wordCount={wordCount}
                  minWords={active?.minWords ?? 0}
                  maxWords={active?.maxWords ?? 0}
                  locked={active?.locked ?? false}
                  busy={busy || generatingId !== null}
                  analysis={analysis}
                  analysisLoading={analysisLoading}
                  versions={versions}
                  onAction={handleChapterAction}
                  onSnapshot={handleSnapshot}
                  onRestore={handleRestore}
                  onToggleLock={toggleLock}
                  onCollapse={() => setPanelOpen(false)}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Floating selection toolbar */}
      {sel && !revision && (
        <FloatingToolbar
          sel={sel}
          busy={busy}
          onCommand={(cmd) => runCommand(cmd)}
          onAsk={(instruction) => runCommand("custom", instruction)}
          onToggleLock={toggleSelectionLock}
        />
      )}

      {/* Revision card */}
      {revision && (
        <RevisionCard rev={revision} onAccept={acceptAny} onReject={rejectAny} onRetry={() => {
          if (fullProposed.current) return;
          const r = revision;
          setRevision(null);
          setTimeout(() => runCommand(r.command, r.instruction), 30);
        }} />
      )}
    </div>
  );
}

// ——————————————————————————————————————————————

function SaveBadge({ status, at }: { status: string; at: number }) {
  const map = {
    idle: { icon: <Cloud className="h-3.5 w-3.5" />, text: "All changes saved", tone: "text-muted" },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: "Saving…", tone: "text-muted" },
    saved: { icon: <Check className="h-3.5 w-3.5" />, text: at ? `Saved ${relativeTime(at)}` : "Saved", tone: "text-sage" },
    error: { icon: <CloudOff className="h-3.5 w-3.5" />, text: "Save failed — retrying", tone: "text-clay" },
  }[status] ?? { icon: <Cloud className="h-3.5 w-3.5" />, text: "Saved", tone: "text-muted" };
  return (
    <span className={cn("hidden items-center gap-1.5 text-xs sm:inline-flex", map.tone)}>
      {map.icon} {map.text}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        active ? "bg-muse-soft text-muse-deep" : "text-ink-soft hover:bg-paper-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function FormatBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const Btn = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg px-2.5 text-sm transition-colors",
        on ? "bg-paper-sunken font-semibold text-ink" : "text-ink-soft hover:bg-paper-sunken/60",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-0.5">
      <Btn on={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" />
      <Btn on={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" />
      <div className="mx-1 h-5 w-px bg-line" />
      <Btn on={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
      <Btn on={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
      <Btn on={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="❝" />
    </div>
  );
}

function emptyDoc() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}
function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return emptyDoc();
  }
}
