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
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";

import { Lock } from "@/components/editor/extensions/lock";
import { FloatingToolbar, type SelInfo } from "@/components/editor/floating-toolbar";
import { RevisionCard, type PendingRevision } from "@/components/editor/revision-card";
import { ChapterRail, type ChapterMeta } from "@/components/editor/chapter-rail";
import { CommandCenter, type ChapterAction } from "@/components/editor/command-center";
import { BookHeader } from "@/components/book/book-header";
import { toast } from "@/components/ui/toast";
import { cn, textToDoc, countWords, relativeTime, cleanChapterTitle } from "@/lib/utils";
import {
  saveChapterContent,
  createSnapshot,
  restoreVersion,
  toggleChapterLock,
  addChapter,
  deleteChapter,
  restoreChapter,
  reorderChapters,
  resolveRevision,
  listChapterVersions,
  getVersionDetail,
} from "@/lib/actions/chapters";
import {
  listNotes,
  addComment,
  toggleCommentResolved,
  deleteComment,
  addBookmark,
  deleteBookmark,
  type NoteData,
} from "@/lib/actions/notes";
import { DiffModal } from "@/components/editor/diff-modal";
import { FindReplace } from "@/components/editor/find-replace";
import { runSelectionCommand, runChapterAnalysis, summarizeChapter } from "@/lib/actions/ai";
import { updateSettings } from "@/lib/actions/settings";

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
  initialReadingFont = "serif",
  initialChapterId,
  autoGenerate = false,
}: {
  projectId: string;
  bookTitle: string;
  aiReady: boolean;
  initialChapters: FullChapter[];
  initialReadingFont?: "serif" | "sans";
  initialChapterId?: string;
  autoGenerate?: boolean;
}) {
  const [chapters, setChapters] = useState<FullChapter[]>(initialChapters);
  const [activeId, setActiveId] = useState(
    initialChapterId ?? initialChapters[0]?.id ?? "",
  );
  const [railOpen, setRailOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [readingFont, setReadingFont] = useState<"serif" | "sans">(initialReadingFont);
  const [isMobile, setIsMobile] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  // On phones the rails become overlay drawers and start closed.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    if (mq.matches) {
      setRailOpen(false);
      setPanelOpen(false);
    }
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const [sel, setSel] = useState<SelInfo | null>(null);
  const [revision, setRevision] = useState<PendingRevision | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [notes, setNotes] = useState<NoteData>({ comments: [], bookmarks: [] });
  const [diff, setDiff] = useState<{
    versionId: string;
    label: string;
    date: string;
    text: string;
  } | null>(null);

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
        const { wordCount } = await saveChapterContent(id, json, { day: localDay() });
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
      await saveChapterContent(id, json, { day: localDay() });
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
    loadNotes(id);
    if (isMobile) setRailOpen(false);
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

  const loadNotes = useCallback(async (id: string) => {
    try {
      setNotes(await listNotes(id));
    } catch {
      setNotes({ comments: [], bookmarks: [] });
    }
  }, []);

  useEffect(() => {
    if (activeId) {
      loadVersions(activeId);
      loadNotes(activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link from the Outline: auto-generate an empty chapter once on open.
  const autoGenDone = useRef(false);
  useEffect(() => {
    if (!autoGenerate || autoGenDone.current || !editor) return;
    autoGenDone.current = true;
    const ch = chapters.find((c) => c.id === activeId);
    if (ch && ch.wordCount === 0 && !ch.locked && aiReady) {
      setTimeout(() => streamGenerate("generate"), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

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
    saveChapterContent(activeId, json, { snapshot: true, source: "ai", day: localDay() }).then(() => {
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
    if (a.type === "summarize") {
      if (!ensureAi()) return;
      await flushSave();
      const id = active.id;
      toast.info("Updating continuity memory…");
      const r = await summarizeChapter(id);
      if (r.ok && r.summary) {
        setChapters((cs) => cs.map((c) => (c.id === id ? { ...c, summary: r.summary! } : c)));
        toast.success("Continuity memory updated", "Later chapters will stay consistent.");
      } else {
        toast.error("Couldn't summarize", "Try again in a moment.");
      }
      return;
    }
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
      saveChapterContent(activeId, json, { snapshot: true, source: "ai", day: localDay() }).then(() => loadVersions(activeId));
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
    // Continue rewrites the final paragraph (so a finished chapter doesn't get a
    // second ending), so flush first and keep everything *before* the last paragraph.
    if (mode === "continue") await flushSave();
    setGeneratingId(active.id);
    setBusy(true);
    let base = "";
    if (mode === "continue") {
      const paras = editor.getText().split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      paras.pop(); // drop the last paragraph — the AI rewrites it into a longer, properly-ended close
      base = paras.join("\n\n");
    }
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
        day: localDay(),
      });
      setChapters((cs) =>
        cs.map((c) =>
          c.id === active.id ? { ...c, wordCount, status: "drafted", contentJson: JSON.stringify(json) } : c,
        ),
      );
      setSave({ status: "saved", at: Date.now() });
      loadVersions(active.id);
      toast.success(mode === "continue" ? "Chapter extended" : "Chapter drafted", "Edit any word — it's yours.");
      // Update continuity memory in the background so later chapters know what happened.
      summarizeChapter(active.id)
        .then((r) => {
          if (r.ok && r.summary)
            setChapters((cs) =>
              cs.map((c) => (c.id === active.id ? { ...c, summary: r.summary! } : c)),
            );
        })
        .catch(() => {});
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
    const removed = chapters.find((c) => c.id === id);
    const deleted = await deleteChapter(id);
    const remaining = chapters.filter((c) => c.id !== id);
    setChapters(remaining);
    if (id === activeId && remaining[0]) selectChapter(remaining[0].id);
    toast.action(
      `Deleted "${cleanChapterTitle(removed?.title ?? "chapter")}"`,
      {
        label: "Undo",
        onClick: async () => {
          const { id: newId } = await restoreChapter(deleted);
          setChapters((cs) =>
            [
              ...cs,
              {
                id: newId,
                order: deleted.order,
                title: deleted.title,
                summary: deleted.summary,
                wordCount: deleted.wordCount,
                minWords: deleted.minWords,
                maxWords: deleted.maxWords,
                locked: deleted.locked,
                status: deleted.status,
                contentJson: deleted.contentJson,
              },
            ].sort((a, b) => a.order - b.order),
          );
          toast.success("Chapter restored");
        },
      },
      { tone: "info" },
    );
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

  // ——— notes & bookmarks ———
  async function handleAddComment(body: string) {
    await addComment(activeId, body);
    loadNotes(activeId);
  }
  async function handleToggleComment(id: string) {
    await toggleCommentResolved(id);
    loadNotes(activeId);
  }
  async function handleDeleteComment(id: string) {
    await deleteComment(id);
    loadNotes(activeId);
  }
  async function handleBookmarkSelection() {
    if (!sel) return;
    const label = sel.text.length > 64 ? sel.text.slice(0, 64) + "…" : sel.text;
    const anchor = sel.text.split("\n")[0].slice(0, 120);
    await addBookmark(activeId, label, anchor);
    setSel(null);
    loadNotes(activeId);
    toast.success("Bookmarked", "Find it in the Notes tab.");
  }
  async function handleDeleteBookmark(id: string) {
    await deleteBookmark(id);
    loadNotes(activeId);
  }
  function jumpToBookmark(anchor: string) {
    if (!editor || !anchor) return;
    const found = posOfSnippet(editor, anchor);
    if (!found) {
      toast.info("Passage not found", "The text may have changed since it was bookmarked.");
      return;
    }
    if (isMobile) setPanelOpen(false);
    editor
      .chain()
      .focus()
      .setTextSelection(found)
      .scrollIntoView()
      .run();
  }

  // ——— version compare ———
  async function handleCompare(versionId: string) {
    try {
      const v = await getVersionDetail(versionId);
      setDiff({
        versionId,
        label: v.label || sourceName(v.source),
        date: v.createdAt,
        text: v.contentText,
      });
    } catch {
      toast.error("Could not load that version");
    }
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
      }
      if (e.key === "Escape") setFindOpen(false);
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
        {/* Chapter rail — inline on desktop, overlay drawer on phones */}
        {(() => {
          const rail = (
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
                if (isMobile) setRailOpen(false);
                if (id !== activeId) selectChapter(id).then(() => setTimeout(() => streamGenerate("generate"), 60));
                else streamGenerate("generate");
              }}
              onCollapse={() => setRailOpen(false)}
            />
          );
          if (isMobile) {
            return (
              <AnimatePresence>
                {railOpen && !focusMode && (
                  <div className="fixed inset-0 z-40">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
                      onClick={() => setRailOpen(false)}
                    />
                    <motion.div
                      initial={{ x: -300 }}
                      animate={{ x: 0 }}
                      exit={{ x: -300 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] border-r border-line bg-paper shadow-float"
                    >
                      {rail}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            );
          }
          return (
            <AnimatePresence initial={false}>
              {railOpen && !focusMode && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 264, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="shrink-0 overflow-hidden border-r border-line"
                >
                  <div className="h-full w-[264px]">{rail}</div>
                </motion.aside>
              )}
            </AnimatePresence>
          );
        })()}

        {/* Canvas */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <button
            className="skip-link rounded-lg bg-ink px-3 py-2 text-sm text-paper shadow-float"
            onClick={() => editor?.commands.focus()}
          >
            Skip to writing
          </button>
          {/* canvas toolbar */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-line/60 px-2 py-2 no-scrollbar sm:px-4">
            {!railOpen && !focusMode && (
              <IconBtn title="Show chapters" onClick={() => setRailOpen(true)}>
                <PanelLeftOpen className="h-4 w-4" />
              </IconBtn>
            )}
            <FormatBar editor={editor} />
            <div className="ml-auto flex items-center gap-1">
              <IconBtn title="Find & replace (⌘F)" onClick={() => setFindOpen(true)} active={findOpen}>
                <SearchIcon className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                title="Toggle reading font"
                onClick={() =>
                  setReadingFont((f) => {
                    const next = f === "serif" ? "sans" : "serif";
                    updateSettings({ readingFont: next }).catch(() => {});
                    return next;
                  })
                }
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

          <AnimatePresence>
            {findOpen && editor && (
              <FindReplace editor={editor} onClose={() => setFindOpen(false)} />
            )}
          </AnimatePresence>

          <div className="manuscript min-h-0 flex-1 overflow-y-auto" onClick={() => editor?.commands.focus()}>
            <div
              className={cn("mx-auto px-5 py-10 transition-all duration-300 sm:px-6 sm:py-14", focusMode ? "max-w-2xl sm:py-24" : "max-w-3xl", isMobile && !focusMode && "pb-28")}
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
                {cleanChapterTitle(active?.title ?? "")}
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

        {/* Command center — inline on desktop, overlay drawer on phones */}
        {(() => {
          const panel = (
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
              notes={notes}
              onAction={(a) => {
                if (isMobile && (a.type === "generate" || a.type === "continue")) setPanelOpen(false);
                handleChapterAction(a);
              }}
              onSnapshot={handleSnapshot}
              onRestore={handleRestore}
              onCompare={handleCompare}
              onToggleLock={toggleLock}
              onCollapse={() => setPanelOpen(false)}
              onAddComment={handleAddComment}
              onToggleComment={handleToggleComment}
              onDeleteComment={handleDeleteComment}
              onJumpBookmark={jumpToBookmark}
              onDeleteBookmark={handleDeleteBookmark}
            />
          );
          if (isMobile) {
            return (
              <AnimatePresence>
                {panelOpen && !focusMode && (
                  <div className="fixed inset-0 z-40">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
                      onClick={() => setPanelOpen(false)}
                    />
                    <motion.div
                      initial={{ x: 340 }}
                      animate={{ x: 0 }}
                      exit={{ x: 340 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-y-0 right-0 w-[320px] max-w-[88vw] border-l border-line bg-paper shadow-float"
                    >
                      {panel}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            );
          }
          return (
            <AnimatePresence initial={false}>
              {panelOpen && !focusMode && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 312, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="shrink-0 overflow-hidden border-l border-line"
                >
                  <div className="h-full w-[312px]">{panel}</div>
                </motion.aside>
              )}
            </AnimatePresence>
          );
        })()}
      </div>

      {/* Floating selection toolbar */}
      {sel && !revision && (
        <FloatingToolbar
          sel={sel}
          busy={busy}
          onCommand={(cmd) => runCommand(cmd)}
          onAsk={(instruction) => runCommand("custom", instruction)}
          onToggleLock={toggleSelectionLock}
          onBookmark={handleBookmarkSelection}
        />
      )}

      {/* Version compare */}
      {diff && (
        <DiffModal
          versionLabel={diff.label}
          versionDate={diff.date}
          versionText={diff.text}
          currentText={editor?.getText() ?? ""}
          onRestore={() => {
            const id = diff.versionId;
            setDiff(null);
            handleRestore(id);
          }}
          onClose={() => setDiff(null)}
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

      {/* Mobile bottom navigation — one-tap chapter switch + add-more */}
      {isMobile && !focusMode && !railOpen && !panelOpen && !revision && !sel && (
        <MobileBottomBar
          chapters={chapters}
          activeId={activeId}
          generatingId={generatingId}
          busy={busy}
          saveStatus={save.status}
          onPrev={() => {
            const i = chapters.findIndex((c) => c.id === activeId);
            if (i > 0) selectChapter(chapters[i - 1].id);
          }}
          onNext={() => {
            const i = chapters.findIndex((c) => c.id === activeId);
            if (i >= 0 && i < chapters.length - 1) selectChapter(chapters[i + 1].id);
          }}
          onList={() => setRailOpen(true)}
          onAddMore={() =>
            streamGenerate((active?.wordCount ?? 0) === 0 ? "generate" : "continue")
          }
        />
      )}
    </div>
  );
}

function MobileBottomBar({
  chapters,
  activeId,
  generatingId,
  busy,
  saveStatus,
  onPrev,
  onNext,
  onList,
  onAddMore,
}: {
  chapters: FullChapter[];
  activeId: string;
  generatingId: string | null;
  busy: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onPrev: () => void;
  onNext: () => void;
  onList: () => void;
  onAddMore: () => void;
}) {
  const i = chapters.findIndex((c) => c.id === activeId);
  const active = chapters[i];
  const empty = (active?.wordCount ?? 0) === 0;
  const generating = generatingId === activeId;
  const locked = active?.locked ?? false;
  const saveText =
    saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved";
  const saveColor =
    saveStatus === "error" ? "text-clay" : saveStatus === "saving" ? "text-muted" : "text-sage";
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className={cn("flex items-center justify-center gap-1 py-1 text-[0.625rem]", saveColor)}>
        {saveStatus === "saving" ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : saveStatus === "error" ? <CloudOff className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
        {saveText}
      </div>
      <div className="flex items-center gap-1.5 px-2 pb-2">
        <button
          onClick={onPrev}
          disabled={i <= 0}
          aria-label="Previous chapter"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors active:bg-paper-sunken disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onList}
          className="flex h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-2 active:bg-paper-sunken"
        >
          <span className="font-mono text-[0.625rem] leading-none text-muted">
            {i >= 0 ? `${i + 1} / ${chapters.length}` : ""}
          </span>
          <span className="mt-0.5 line-clamp-1 max-w-full text-[0.8125rem] font-medium leading-tight text-ink">
            {cleanChapterTitle(active?.title ?? "Chapter")}
          </span>
        </button>
        <button
          onClick={onNext}
          disabled={i < 0 || i >= chapters.length - 1}
          aria-label="Next chapter"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors active:bg-paper-sunken disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          onClick={onAddMore}
          disabled={busy || generating || locked}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-muse to-muse-deep px-3.5 font-medium text-white transition-opacity active:opacity-90 disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : empty ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="text-sm">{empty ? "Generate" : "Add more"}</span>
        </button>
      </div>
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

/** Maps a plain-text snippet to document positions by walking text nodes. */
function posOfSnippet(editor: Editor, snippet: string): { from: number; to: number } | null {
  const positions: number[] = [];
  let text = "";
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) positions.push(pos + i);
      text += node.text;
    } else if (node.isBlock && text.length && !text.endsWith("\n")) {
      positions.push(pos);
      text += "\n";
    }
    return true;
  });
  const idx = text.indexOf(snippet);
  if (idx === -1 || idx + snippet.length > positions.length) return null;
  return { from: positions[idx], to: positions[idx + snippet.length - 1] + 1 };
}

function sourceName(s: string) {
  return (
    { manual: "Manual save", ai: "After AI edit", snapshot: "Snapshot", generation: "Generated" }[s] ??
    "Version"
  );
}

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
