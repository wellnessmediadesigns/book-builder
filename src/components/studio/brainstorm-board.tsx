"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Send,
  Plus,
  Star,
  Trash2,
  Lightbulb,
  PanelLeft,
  X,
  Hammer,
  Loader2,
  GripVertical,
  BookOpen,
  ArrowRight,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { QuireMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { celebrate } from "@/lib/confetti";
import { cn, relativeTime } from "@/lib/utils";
import {
  createSession,
  saveIdeaFromText,
  addIdea,
  updateIdea,
  toggleStar,
  deleteIdea,
  restoreIdea,
  reorderIdeas,
  buildBookFromBrainstorm,
  type IdeaCardData,
  type SessionBrief,
} from "@/lib/actions/brainstorm";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const STARTERS = [
  "Brainstorm 5 nonfiction book ideas about habits and focus",
  "I have a vague idea — help me sharpen it into a book",
  "What could I write for new parents who feel overwhelmed?",
  "Find a fresh angle on personal finance nobody's done",
];

const FOLLOWUPS = ["Give me 3 title options", "Who exactly is this for?", "What's the hook?", "Make it bolder"];

const KIND_TONE: Record<string, "brass" | "muse" | "sage" | "neutral" | "clay"> = {
  concept: "muse",
  theme: "brass",
  title: "sage",
  audience: "neutral",
  hook: "clay",
  angle: "neutral",
};

export function BrainstormBoard({
  session,
  sessions,
  initialMessages,
  initialIdeas,
  aiReady,
}: {
  session: { id: string; title: string; status: string; builtProjectId: string | null };
  sessions: SessionBrief[];
  initialMessages: Msg[];
  initialIdeas: IdeaCardData[];
  aiReady: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [ideas, setIdeas] = useState<IdeaCardData[]>(initialIdeas);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState("");
  const [building, setBuilding] = useState(false);
  const [, startNav] = useTransition();

  const [railOpen, setRailOpen] = useState(false); // mobile sessions drawer
  const [sheetOpen, setSheetOpen] = useState(false); // mobile ideas sheet

  const scrollRef = useRef<HTMLDivElement>(null);
  const built = session.status === "built";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, partial]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    if (!aiReady) {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
      return;
    }
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: message }]);
    setStreaming(true);
    setPartial("");

    try {
      const res = await fetch("/api/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, message }),
      });
      if (res.status === 428) {
        toast.error("Add your AI key first", "Open Settings to connect a provider.");
        setStreaming(false);
        return;
      }
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let raf = 0;
      const flush = () => {
        setPartial(acc);
        raf = 0;
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (acc.includes("[[QUIRE_ERROR]]")) {
          const msg = acc.split("[[QUIRE_ERROR]]")[1];
          acc = acc.split("[[QUIRE_ERROR]]")[0];
          toast.error("Brainstorm stopped", msg);
          break;
        }
        if (!raf) raf = requestAnimationFrame(flush);
      }
      cancelAnimationFrame(raf);
      const finalText = acc.trim();
      if (finalText) {
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: finalText }]);
      }
    } catch {
      toast.error("Brainstorm failed", "Check your connection and try again.");
    } finally {
      setStreaming(false);
      setPartial("");
    }
  }

  async function saveIdea(text: string) {
    const res = await saveIdeaFromText(session.id, text);
    if (!res.ok) {
      toast.error(res.error === "no_key" ? "Add your AI key first" : "Couldn't save idea", res.error === "no_key" ? "Open Settings to connect a provider." : res.error);
      return;
    }
    setIdeas((i) => [...i, res.idea]);
    celebrate("goal");
    toast.success("Idea saved to the board");
    setSheetOpen(true);
  }

  async function addManual() {
    const title = window.prompt("Name this idea");
    if (!title?.trim()) return;
    const card = await addIdea(session.id, { title: title.trim() });
    setIdeas((i) => [...i, card]);
  }

  function removeIdea(card: IdeaCardData) {
    setIdeas((i) => i.filter((c) => c.id !== card.id));
    deleteIdea(card.id).catch(() => {});
    toast.action("Idea removed", {
      label: "Undo",
      onClick: async () => {
        const restored = await restoreIdea(session.id, card);
        setIdeas((i) => [...i, restored].sort((a, b) => a.order - b.order));
      },
    });
  }

  function star(card: IdeaCardData) {
    setIdeas((i) => i.map((c) => (c.id === card.id ? { ...c, starred: !c.starred } : c)));
    toggleStar(card.id).catch(() => {});
  }

  function build() {
    if (ideas.length === 0 || building) return;
    setBuilding(true);
    celebrate("book");
    startNav(async () => {
      const res = await buildBookFromBrainstorm(session.id);
      // On success the action redirects; only a failure returns here.
      if (res && !res.ok) {
        toast.error(res.error === "no_key" ? "Add your AI key first" : "Couldn't build the book", res.error === "no_key" ? "Open Settings to connect a provider." : res.error);
        setBuilding(false);
      }
    });
  }

  const showEmpty = messages.length === 0 && !streaming;

  return (
    <div className="grid h-[calc(100dvh-4rem)] grid-cols-1 lg:grid-cols-[230px_1fr_340px]">
      {/* ——— Sessions rail (desktop) ——— */}
      <aside className="hidden border-r border-line bg-paper-sunken/30 lg:block">
        <SessionsRail sessions={sessions} activeId={session.id} />
      </aside>

      {/* ——— Chat ——— */}
      <section className="flex min-h-0 flex-col">
        {/* board header */}
        <header className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <button
            onClick={() => setRailOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink lg:hidden"
            aria-label="Open sessions"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <Sparkles className="hidden h-4 w-4 text-muse sm:block" />
          <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-ink">
            {session.title}
          </span>
          {built && session.builtProjectId && (
            <Link href={`/studio/book/${session.builtProjectId}/blueprint`}>
              <Badge tone="sage">
                <BookOpen className="h-3 w-3" /> Built
              </Badge>
            </Link>
          )}
          <button
            onClick={() => setSheetOpen(true)}
            className="relative flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink lg:hidden"
            aria-label="Open ideas"
          >
            <Lightbulb className="h-4 w-4 text-brass" /> {ideas.length}
          </button>
        </header>

        {!aiReady && (
          <div className="flex items-center gap-2 border-b border-line bg-brass-soft/60 px-4 py-2 text-xs text-brass-deep">
            <Settings className="h-3.5 w-3.5" />
            Connect an AI provider in{" "}
            <Link href="/studio/settings" className="font-medium underline">
              Settings
            </Link>{" "}
            to brainstorm.
          </div>
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {showEmpty ? (
              <div className="pt-6">
                <div className="mb-5 flex flex-col items-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muse-soft text-muse-deep shadow-soft">
                    <Lightbulb className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-ink">Let&apos;s find your next book</h2>
                  <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
                    Bounce ideas around with Muse. Save the ones that spark, then build your book.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={!aiReady}
                      className="group flex items-center gap-2.5 rounded-xl border border-line bg-paper-raised px-4 py-3 text-left text-sm text-ink-soft transition-all hover:border-muse/30 hover:bg-muse-soft/40 hover:text-ink disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4 shrink-0 text-muse" />
                      <span className="flex-1">{s}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <Bubble key={m.id} msg={m} onSave={() => saveIdea(m.content)} canSave={aiReady} />
                ))}
                {streaming && (
                  <Bubble
                    msg={{ id: "streaming", role: "assistant", content: partial }}
                    streaming
                  />
                )}
                {!streaming && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
                  <div className="flex flex-wrap gap-2 pl-11">
                    {FOLLOWUPS.map((f) => (
                      <button
                        key={f}
                        onClick={() => send(f)}
                        className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-muse/30 hover:text-ink"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="border-t border-line px-3 py-3 sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex max-w-2xl items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={aiReady ? "Bounce an idea… (Enter to send, Shift+Enter for a new line)" : "Connect an AI provider to brainstorm"}
              disabled={!aiReady || streaming}
              className="max-h-40 min-h-[44px] w-full resize-none rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/70 shadow-sm outline-none transition-all focus:border-muse/40 focus:ring-2 focus:ring-muse/20 disabled:opacity-60"
            />
            <Button type="submit" variant="muse" size="icon" disabled={!input.trim() || streaming || !aiReady} aria-label="Send">
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </section>

      {/* ——— Ideas rail (desktop) ——— */}
      <aside className="hidden border-l border-line bg-paper-sunken/20 lg:flex lg:flex-col">
        <IdeasRail
          ideas={ideas}
          onStar={star}
          onRemove={removeIdea}
          onAdd={addManual}
          onUpdate={(id, data) => {
            setIdeas((i) => i.map((c) => (c.id === id ? { ...c, ...data } : c)));
            updateIdea(id, data).catch(() => {});
          }}
          onReorder={(next) => {
            setIdeas(next);
            reorderIdeas(session.id, next.map((c) => c.id)).catch(() => {});
          }}
          onBuild={build}
          building={building}
          built={built}
        />
      </aside>

      {/* ——— Mobile: sessions drawer ——— */}
      <AnimatePresence>
        {railOpen && (
          <Overlay onClose={() => setRailOpen(false)} side="left">
            <SessionsRail sessions={sessions} activeId={session.id} onNavigate={() => setRailOpen(false)} />
          </Overlay>
        )}
      </AnimatePresence>

      {/* ——— Mobile: ideas sheet ——— */}
      <AnimatePresence>
        {sheetOpen && (
          <Overlay onClose={() => setSheetOpen(false)} side="bottom">
            <IdeasRail
              ideas={ideas}
              onStar={star}
              onRemove={removeIdea}
              onAdd={addManual}
              onUpdate={(id, data) => {
                setIdeas((i) => i.map((c) => (c.id === id ? { ...c, ...data } : c)));
                updateIdea(id, data).catch(() => {});
              }}
              onReorder={(next) => {
                setIdeas(next);
                reorderIdeas(session.id, next.map((c) => c.id)).catch(() => {});
              }}
              onBuild={build}
              building={building}
              built={built}
            />
          </Overlay>
        )}
      </AnimatePresence>

      {/* building overlay */}
      <AnimatePresence>
        {building && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-paper/85 backdrop-blur-md"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muse-soft text-muse-deep shadow-glow">
              <Hammer className="h-8 w-8" />
            </div>
            <p className="mt-4 font-display text-lg font-semibold text-ink">Building your book…</p>
            <p className="mt-1 text-sm text-ink-soft">Turning your ideas into a blueprint.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bubble({
  msg,
  streaming,
  onSave,
  canSave,
}: {
  msg: Msg;
  streaming?: boolean;
  onSave?: () => void;
  canSave?: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          isUser ? "bg-brass/15 text-brass-deep" : "bg-muse-soft text-muse-deep",
        )}
      >
        {isUser ? <span className="text-xs font-semibold">You</span> : <QuireMark className="h-4 w-4" />}
      </div>
      <div className={cn("group min-w-0 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed",
            isUser ? "bg-brass-soft text-ink" : "border border-line bg-paper-raised text-ink",
          )}
        >
          {msg.content}
          {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse-soft bg-muse align-middle" />}
        </div>
        {!isUser && !streaming && onSave && (
          <div className="mt-1">
            <button
              onClick={onSave}
              disabled={!canSave}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted opacity-0 transition-all hover:bg-muse-soft hover:text-muse-deep group-hover:opacity-100 disabled:opacity-30"
            >
              <Sparkles className="h-3 w-3" /> Save as idea
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SessionsRail({
  sessions,
  activeId,
  onNavigate,
}: {
  sessions: SessionBrief[];
  activeId: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button
          variant="muse"
          className="w-full"
          onClick={() => start(() => createSession())}
        >
          <Plus className="h-4 w-4" /> New brainstorm
        </Button>
      </div>
      <p className="px-4 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
        Sessions
      </p>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 && <p className="px-2 py-3 text-xs text-muted">No sessions yet.</p>}
        {sessions.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => {
                onNavigate?.();
                router.push(`/studio/brainstorm/${s.id}`);
              }}
              className={cn(
                "group w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                active ? "bg-paper-raised shadow-soft" : "hover:bg-paper-raised/60",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("truncate text-sm", active ? "font-medium text-ink" : "text-ink-soft")}>
                  {s.title}
                </span>
                {s.status === "built" && <BookOpen className="ml-auto h-3 w-3 shrink-0 text-sage" />}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[0.6875rem] text-muted">
                <span className="inline-flex items-center gap-0.5">
                  <Lightbulb className="h-3 w-3" /> {s.ideaCount}
                </span>
                <span>·</span>
                <span>{relativeTime(s.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IdeasRail({
  ideas,
  onStar,
  onRemove,
  onAdd,
  onUpdate,
  onReorder,
  onBuild,
  building,
  built,
}: {
  ideas: IdeaCardData[];
  onStar: (c: IdeaCardData) => void;
  onRemove: (c: IdeaCardData) => void;
  onAdd: () => void;
  onUpdate: (id: string, data: { title?: string; note?: string }) => void;
  onReorder: (next: IdeaCardData[]) => void;
  onBuild: () => void;
  building: boolean;
  built: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = ideas.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    const next = [...ideas];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next.map((c, i) => ({ ...c, order: i })));
    setDragId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-brass" />
          <span className="font-display text-sm font-semibold text-ink">Ideas</span>
          <Badge tone="neutral">{ideas.length}</Badge>
        </div>
        <button
          onClick={onAdd}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink"
          aria-label="Add idea"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {ideas.length === 0 ? (
          <div className="px-2 pt-8">
            <EmptyState
              icon={<Lightbulb className="h-5 w-5" />}
              title="No ideas saved yet"
              description="Tap “Save as idea” on a reply, or add your own. They collect here."
            />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {ideas.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                draggable
                onDragStart={() => setDragId(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(c.id)}
                className={cn(
                  "group rounded-xl border bg-paper-raised p-3 shadow-soft transition-all",
                  c.starred ? "border-brass/40 ring-1 ring-brass/20" : "border-line",
                  dragId === c.id && "opacity-40",
                )}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted opacity-0 group-hover:opacity-100" />
                  <div className="min-w-0 flex-1">
                    <input
                      defaultValue={c.title}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== c.title && onUpdate(c.id, { title: e.target.value.trim() })}
                      className="w-full bg-transparent text-sm font-medium text-ink outline-none"
                    />
                    {c.note && <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{c.note}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Badge tone={KIND_TONE[c.kind] ?? "neutral"} className="text-[0.625rem]">
                        {c.kind}
                      </Badge>
                      {c.tags.map((t) => (
                        <span key={t} className="rounded-full bg-paper-sunken px-1.5 py-0.5 text-[0.625rem] text-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      onClick={() => onStar(c)}
                      aria-label={c.starred ? "Unstar" : "Mark as primary"}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                        c.starred ? "text-brass" : "text-muted hover:bg-paper-sunken hover:text-brass",
                      )}
                    >
                      <Star className={cn("h-3.5 w-3.5", c.starred && "fill-brass")} />
                    </button>
                    <button
                      onClick={() => onRemove(c)}
                      aria-label="Remove idea"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-clay/10 hover:text-clay"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t border-line p-3">
        <Button
          variant="brass"
          className="w-full"
          disabled={ideas.length === 0 || building}
          onClick={onBuild}
        >
          {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
          {built ? "Build again" : "Build this book"}
        </Button>
        {ideas.length === 0 && (
          <p className="mt-2 text-center text-[0.6875rem] text-muted">Save at least one idea to build.</p>
        )}
      </div>
    </div>
  );
}

function Overlay({
  children,
  onClose,
  side,
}: {
  children: React.ReactNode;
  onClose: () => void;
  side: "left" | "bottom";
}) {
  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={side === "left" ? { x: "-100%" } : { y: "100%" }}
        animate={side === "left" ? { x: 0 } : { y: 0 }}
        exit={side === "left" ? { x: "-100%" } : { y: "100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "absolute border-line bg-paper shadow-float",
          side === "left" ? "inset-y-0 left-0 w-[82%] max-w-xs border-r" : "inset-x-0 bottom-0 max-h-[80dvh] rounded-t-3xl border-t",
        )}
      >
        <div className="flex items-center justify-end p-2">
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-paper-sunken hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn(side === "bottom" && "max-h-[70dvh] overflow-hidden")}>{children}</div>
      </motion.div>
    </div>
  );
}
