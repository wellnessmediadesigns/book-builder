"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Target,
  PanelLeft,
  X,
  Hammer,
  Loader2,
  GripVertical,
  BookOpen,
  ArrowRight,
  Settings,
  Lightbulb,
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
  refreshDirection,
  setDirection as saveDirection,
  buildBookFromBrainstorm,
  type SessionBrief,
} from "@/lib/actions/brainstorm";
import type { Direction, Bullet } from "@/lib/brainstorm";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const STARTERS = [
  "Brainstorm 5 nonfiction book ideas about habits and focus",
  "I have a vague idea — help me sharpen it into a book",
  "What could I write for new parents who feel overwhelmed?",
  "Find a fresh angle on personal finance nobody's done",
];

const FOLLOWUPS = ["Give me 3 title options", "Who exactly is this for?", "What's the hook?", "Make it bolder"];

let tmpSeq = 0;
function tmpId() {
  tmpSeq += 1;
  return `t${Date.now().toString(36)}${tmpSeq}`;
}

/** Lightweight inline markdown for chat bubbles: **bold**, *italic*, `code`. */
function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) nodes.push(<strong key={k++} className="font-semibold">{m[1]}</strong>);
    else if (m[2] !== undefined) nodes.push(<em key={k++}>{m[2]}</em>);
    else if (m[3] !== undefined) nodes.push(<code key={k++} className="rounded bg-paper-sunken px-1 py-0.5 font-mono text-[0.85em]">{m[3]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function BrainstormBoard({
  session,
  sessions,
  initialMessages,
  initialDirection,
  aiReady,
}: {
  session: { id: string; title: string; status: string; builtProjectId: string | null; mode?: string };
  sessions: SessionBrief[];
  initialMessages: Msg[];
  initialDirection: Direction;
  aiReady: boolean;
}) {
  const newsletter = session.mode === "newsletter";
  const buildLabel = newsletter ? "Build this newsletter" : "Build this book";
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [direction, setDirectionLocal] = useState<Direction>(initialDirection);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [, startNav] = useTransition();

  const [railOpen, setRailOpen] = useState(false); // mobile sessions drawer
  const [sheetOpen, setSheetOpen] = useState(false); // mobile direction sheet

  const scrollRef = useRef<HTMLDivElement>(null);
  const built = session.status === "built";
  const hasDirection = Boolean(direction.title.trim() || direction.bullets.length);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, partial]);

  // ——— direction persistence ———
  function commitDirection(next: Direction) {
    setDirectionLocal(next);
    saveDirection(session.id, next).catch(() => {});
  }

  async function updateDirectionFromAI() {
    setRefreshing(true);
    try {
      const r = await refreshDirection(session.id);
      if (r.ok) setDirectionLocal(r.direction);
    } catch {
      /* keep previous */
    } finally {
      setRefreshing(false);
    }
  }

  // ——— chat ———
  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    if (!aiReady) {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
      return;
    }
    setInput("");
    setMessages((m) => [...m, { id: tmpId(), role: "user", content: message }]);
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
        setMessages((m) => [...m, { id: tmpId(), role: "assistant", content: finalText }]);
        // Re-derive the agreed direction in the background.
        updateDirectionFromAI();
      }
    } catch {
      toast.error("Brainstorm failed", "Check your connection and try again.");
    } finally {
      setStreaming(false);
      setPartial("");
    }
  }

  // ——— build ———
  function build() {
    if (!hasDirection || building) {
      if (!hasDirection) toast.info("Keep chatting", "Agree on a few details with Muse first, then build.");
      return;
    }
    setBuilding(true);
    celebrate("book");
    startNav(async () => {
      const res = await buildBookFromBrainstorm(session.id);
      if (res && !res.ok) {
        toast.error(res.error === "no_key" ? "Add your AI key first" : "Couldn't build the book", res.error === "no_key" ? "Open Settings to connect a provider." : res.error);
        setBuilding(false);
      }
    });
  }

  const showEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-x-hidden lg:grid lg:grid-cols-[230px_1fr_340px]">
      {/* ——— Sessions rail (desktop) ——— */}
      <aside className="hidden border-r border-line bg-paper-sunken/30 lg:block">
        <SessionsRail sessions={sessions} activeId={session.id} />
      </aside>

      {/* ——— Chat ——— */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
          <button
            onClick={() => setRailOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper-raised text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink lg:hidden"
            aria-label="Open sessions"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <Sparkles className="hidden h-4 w-4 text-muse sm:block" />
          <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-ink">{session.title}</span>

          {built && session.builtProjectId ? (
            <Link href={`/studio/book/${session.builtProjectId}/blueprint`}>
              <Badge tone="sage">
                <BookOpen className="h-3 w-3" /> Built
              </Badge>
            </Link>
          ) : (
            <Button variant="brass" size="sm" onClick={build} disabled={building || !hasDirection} className="shrink-0">
              {building ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hammer className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{buildLabel}</span>
              <span className="sm:hidden">Build</span>
            </Button>
          )}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink lg:hidden"
            aria-label="Open direction"
          >
            <Target className="h-4 w-4 text-brass" /> Direction
            <span className="rounded-full bg-brass-soft px-1.5 text-xs font-semibold text-brass-deep">{direction.bullets.length}</span>
          </button>
        </header>

        {!aiReady && (
          <div className="flex items-center gap-2 border-b border-line bg-brass-soft/60 px-4 py-2 text-xs text-brass-deep">
            <Settings className="h-3.5 w-3.5" />
            Connect an AI provider in{" "}
            <Link href="/studio/settings" className="font-medium underline">Settings</Link>{" "}
            to brainstorm.
          </div>
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {showEmpty ? (
              <div className="pt-6">
                <div className="mb-5 flex flex-col items-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muse-soft text-muse-deep shadow-soft">
                    <Lightbulb className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-xl font-semibold text-ink">Let&apos;s find your next book</h2>
                  <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
                    Chat with Muse. As you agree on the concept, title, and key points, they collect in your
                    Direction — then build the book in one tap.
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
                  <Bubble key={m.id} msg={m} />
                ))}
                {streaming && <Bubble msg={{ id: "streaming", role: "assistant", content: partial }} streaming />}
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
        <div className="border-t border-line px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mx-auto flex max-w-2xl min-w-0 items-end gap-2"
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
              placeholder={aiReady ? "Bounce an idea…" : "Connect an AI provider to brainstorm"}
              disabled={!aiReady || streaming}
              className="max-h-40 min-h-[48px] w-full min-w-0 resize-none rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-sm text-ink placeholder:text-ink-soft/70 shadow-sm outline-none transition-all focus:border-muse/40 focus:ring-2 focus:ring-muse/20 disabled:opacity-60"
            />
            <Button type="submit" variant="muse" disabled={!input.trim() || streaming || !aiReady} aria-label="Send" className="h-12 w-12 shrink-0 rounded-xl p-0">
              {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
      </section>

      {/* ——— Direction rail (desktop) ——— */}
      <aside className="hidden border-l border-line bg-paper-sunken/20 lg:flex lg:flex-col">
        <DirectionPanel
          direction={direction}
          refreshing={refreshing}
          onCommit={commitDirection}
          onBuild={build}
          building={building}
          built={built}
          buildLabel={buildLabel}
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

      {/* ——— Mobile: direction sheet ——— */}
      <AnimatePresence>
        {sheetOpen && (
          <Overlay onClose={() => setSheetOpen(false)} side="bottom">
            <DirectionPanel
              direction={direction}
              refreshing={refreshing}
              onCommit={commitDirection}
              onBuild={build}
              building={building}
              built={built}
              buildLabel={buildLabel}
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
            <p className="mt-4 font-display text-lg font-semibold text-ink">{newsletter ? "Building your newsletter…" : "Building your book…"}</p>
            <p className="mt-1 text-sm text-ink-soft">Turning your direction into a {newsletter ? "content plan" : "blueprint"}.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bubble({ msg, streaming }: { msg: Msg; streaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex gap-2.5 sm:gap-3", isUser && "flex-row-reverse")}
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", isUser ? "bg-brass/15 text-brass-deep" : "bg-muse-soft text-muse-deep")}>
        {isUser ? <span className="text-xs font-semibold">You</span> : <QuireMark className="h-4 w-4" />}
      </div>
      <div className={cn("min-w-0 max-w-[88%] sm:max-w-[85%]", isUser && "text-right")}>
        <div className={cn("inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-relaxed [overflow-wrap:anywhere]", isUser ? "bg-brass-soft text-ink" : "border border-line bg-paper-raised text-ink")}>
          {renderMarkdown(msg.content)}
          {streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse-soft bg-muse align-middle" />}
        </div>
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
        <Button variant="muse" className="w-full" onClick={() => start(() => createSession())}>
          <Plus className="h-4 w-4" /> New brainstorm
        </Button>
      </div>
      <p className="px-4 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Sessions</p>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3">
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
              className={cn("group w-full rounded-xl px-3 py-2.5 text-left transition-colors", active ? "bg-paper-raised shadow-soft" : "hover:bg-paper-raised/60")}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("truncate text-sm", active ? "font-medium text-ink" : "text-ink-soft")}>{s.title}</span>
                {s.status === "built" && <BookOpen className="ml-auto h-3 w-3 shrink-0 text-sage" />}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[0.6875rem] text-muted">
                <span className="inline-flex items-center gap-0.5">
                  <Target className="h-3 w-3" /> {s.directionCount}
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

function DirectionPanel({
  direction,
  refreshing,
  onCommit,
  onBuild,
  building,
  built,
  buildLabel,
}: {
  direction: Direction;
  refreshing: boolean;
  onCommit: (d: Direction) => void;
  onBuild: () => void;
  building: boolean;
  built: boolean;
  buildLabel: string;
}) {
  // Local working copy so typing is smooth; persist on blur / structural change.
  const [local, setLocal] = useState<Direction>(direction);
  const [dragId, setDragId] = useState<string | null>(null);

  // Sync when the AI refreshes the direction (id list changes).
  useEffect(() => {
    setLocal(direction);
  }, [direction]);

  const hasContent = Boolean(local.title.trim() || local.bullets.length);

  function setTitle(title: string) {
    setLocal((d) => ({ ...d, title }));
  }
  function setBulletText(id: string, text: string) {
    setLocal((d) => ({ ...d, bullets: d.bullets.map((b) => (b.id === id ? { ...b, text } : b)) }));
  }
  function commit(next?: Direction) {
    onCommit(next ?? local);
  }
  function addBullet() {
    const b: Bullet = { id: `u${Date.now().toString(36)}`, text: "" };
    const next = { ...local, bullets: [...local.bullets, b] };
    setLocal(next);
    onCommit(next);
  }
  function removeBullet(id: string) {
    const next = { ...local, bullets: local.bullets.filter((b) => b.id !== id) };
    setLocal(next);
    onCommit(next);
  }
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = local.bullets.map((b) => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    const bullets = [...local.bullets];
    bullets.splice(to, 0, bullets.splice(from, 1)[0]);
    const next = { ...local, bullets };
    setLocal(next);
    onCommit(next);
    setDragId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-brass" />
          <span className="font-display text-sm font-semibold text-ink">Direction</span>
          {refreshing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muse" />}
        </div>
        <button onClick={addBullet} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink" aria-label="Add point">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        {/* working title */}
        <div className="rounded-xl border border-line bg-paper-raised p-3">
          <p className="mb-1 text-[0.625rem] font-semibold uppercase tracking-wide text-muted">Working title</p>
          <input
            value={local.title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => commit()}
            placeholder="Untitled — agree on one with Muse"
            className="w-full bg-transparent font-display text-base font-semibold text-ink outline-none placeholder:text-ink-soft/50 placeholder:font-normal placeholder:font-sans placeholder:text-sm"
          />
        </div>

        <p className="px-1 text-[0.625rem] font-semibold uppercase tracking-wide text-muted">What we&apos;re agreeing on</p>

        {local.bullets.length === 0 ? (
          <div className="px-1 pt-2">
            <EmptyState
              icon={<Target className="h-5 w-5" />}
              title="Nothing locked in yet"
              description="As you and Muse agree on the concept, audience, and key points, they collect here. Add your own with ＋."
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            {local.bullets.map((b) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => setDragId(b.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(b.id)}
                className={cn("group flex items-start gap-1.5 rounded-xl border border-line bg-paper-raised p-2 transition-all", dragId === b.id && "opacity-40")}
              >
                <GripVertical className="mt-1.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted opacity-40 sm:opacity-0 sm:group-hover:opacity-100" />
                <textarea
                  value={b.text}
                  onChange={(e) => setBulletText(b.id, e.target.value)}
                  onBlur={() => commit()}
                  rows={1}
                  className="min-h-[28px] w-full resize-none bg-transparent text-sm leading-snug text-ink outline-none"
                  placeholder="A point…"
                />
                <button onClick={() => removeBullet(b.id)} aria-label="Remove point" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-clay/10 hover:text-clay">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <Button variant="brass" className="w-full" disabled={!hasContent || building} onClick={onBuild}>
          {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
          {built ? "Build again" : buildLabel}
        </Button>
        {!hasContent && <p className="mt-2 text-center text-[0.6875rem] text-muted">Agree on a few details, then build.</p>}
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
  // Lock the page behind the sheet so touch-scrolling doesn't fall through.
  useEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevOverflow;
      html.style.overscrollBehavior = prevOverscroll;
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={side === "left" ? { x: "-100%" } : { y: "100%" }}
        animate={side === "left" ? { x: 0 } : { y: 0 }}
        exit={side === "left" ? { x: "-100%" } : { y: "100%" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn("absolute border-line bg-paper shadow-float", side === "left" ? "inset-y-0 left-0 w-[82%] max-w-xs border-r" : "inset-x-0 bottom-0 flex max-h-[80dvh] flex-col rounded-t-3xl border-t pb-[env(safe-area-inset-bottom)]")}
      >
        <div className="flex items-center justify-end p-2">
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-paper-sunken hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn(side === "bottom" && "min-h-0 flex-1 overflow-hidden")}>{children}</div>
      </motion.div>
    </div>
  );
}
