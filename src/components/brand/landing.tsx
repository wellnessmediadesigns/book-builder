"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  PenLine,
  Library,
  Lock,
  History,
  Wand2,
  BookOpen,
  ArrowRight,
  Quote,
} from "lucide-react";
import { QuireLogo, QuireMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const features = [
  {
    icon: Sparkles,
    title: "Blueprint, instantly",
    body: "Turn a single idea into titles, a positioning, a reader promise, and a full chapter-by-chapter outline — every word editable.",
  },
  {
    icon: PenLine,
    title: "Write chapter by chapter",
    body: "Generate one chapter at a time, each aware of your outline, characters, and everything written before it. Never a wall of text.",
  },
  {
    icon: Wand2,
    title: "Highlight & ask AI",
    body: "Select any passage and rewrite, expand, humanize, add tension, or ask for anything — only the selection changes, only when you accept.",
  },
  {
    icon: Library,
    title: "Book Memory",
    body: "A living memory of your premise, voice, characters, and timeline keeps every chapter consistent with the last.",
  },
  {
    icon: Lock,
    title: "Lock what's finished",
    body: "Protect finalized sentences and chapters. Locked content is yours — AI won't touch it until you say so.",
  },
  {
    icon: History,
    title: "Version history",
    body: "Snapshot, compare, and restore. Like Git for writers — every revision is recoverable.",
  },
];

const steps = [
  { n: "01", t: "Describe your book", d: "Idea, audience, tone, goals — the seed of the whole thing." },
  { n: "02", t: "Generate the blueprint", d: "A complete, editable outline and reader journey." },
  { n: "03", t: "Write with the AI", d: "One chapter at a time, in a calm, beautiful canvas." },
  { n: "04", t: "Export & publish", d: "Clean, publishing-ready manuscripts with no cleanup." },
];

export function Landing() {
  return (
    <div className="grain min-h-screen bg-paper">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <QuireLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/studio">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Open studio
              </Button>
            </Link>
            <Link href="/studio/new">
              <Button variant="primary" size="sm">
                Start writing
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, hsl(var(--muse)/0.14), transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <motion.div {...fade(0)}>
            <Badge tone="muse" className="mx-auto">
              <Sparkles className="h-3 w-3" /> The AI Writing Studio
            </Badge>
          </motion.div>
          <motion.h1
            {...fade(0.06)}
            className="mt-6 font-display text-display-xl font-semibold text-balance text-ink"
          >
            From a spark to a <span className="muse-text">finished book.</span>
          </motion.h1>
          <motion.p
            {...fade(0.12)}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-ink-soft"
          >
            Quire is a calm, premium studio for writing real books. You hold the pen.
            Quire holds the outline, the memory, the continuity, and the busywork — so
            every sentence stays unmistakably yours.
          </motion.p>
          <motion.div
            {...fade(0.18)}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/studio/new">
              <Button size="lg" variant="primary" className="group">
                Start your book
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/studio">
              <Button size="lg" variant="outline">
                <BookOpen className="h-4 w-4" /> Explore the studio
              </Button>
            </Link>
          </motion.div>
          <motion.p {...fade(0.24)} className="mt-4 text-xs text-muted">
            Bring your own AI key · Your words never leave for training · Export anywhere
          </motion.p>
        </div>

        {/* canvas mock */}
        <motion.div
          {...fade(0.2)}
          className="mx-auto max-w-5xl px-6 pb-24"
        >
          <div className="overflow-hidden rounded-3xl border border-line bg-paper-raised shadow-raised">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-clay/60" />
                <span className="h-3 w-3 rounded-full bg-brass/60" />
                <span className="h-3 w-3 rounded-full bg-sage/60" />
              </div>
              <div className="mx-auto flex items-center gap-2 text-xs text-muted">
                <QuireMark className="h-4 w-4 text-brass" />
                The Quiet Tide — Chapter 3
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-[200px_1fr]">
              <aside className="hidden border-r border-line p-4 md:block">
                {["Blueprint", "1 · Arrival", "2 · The Letter", "3 · The Quiet Tide", "4 · Undertow"].map(
                  (c, i) => (
                    <div
                      key={c}
                      className={`mb-1 rounded-lg px-3 py-2 text-xs ${
                        i === 3
                          ? "bg-muse-soft font-medium text-muse-deep"
                          : "text-ink-soft"
                      }`}
                    >
                      {c}
                    </div>
                  ),
                )}
              </aside>
              <div className="relative p-8 md:p-12">
                <div className="mx-auto max-w-prose font-serif text-[1.05rem] leading-loose text-ink">
                  <h3 className="mb-4 font-display text-2xl font-semibold">
                    The Quiet Tide
                  </h3>
                  <p className="mb-4">
                    The harbor had a way of keeping secrets. Mara watched the water fold
                    over itself in the half-light,{" "}
                    <span className="rounded bg-muse-soft px-1 text-muse-deep">
                      each wave a sentence the sea refused to finish
                    </span>
                    .
                  </p>
                  <p className="text-ink-soft">
                    She had come back for one reason, and the letter in her coat pocket
                    was heavier than the tide…
                  </p>
                </div>
                <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-muse/20 bg-paper-raised px-1 py-1 shadow-float">
                  {["Rewrite", "Expand", "Add emotion", "Ask AI"].map((a, i) => (
                    <span
                      key={a}
                      className={`rounded-full px-3 py-1 text-xs ${
                        i === 3
                          ? "bg-muse text-white"
                          : "text-ink-soft hover:bg-paper-sunken"
                      }`}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...fade()} className="mb-14 text-center">
          <h2 className="font-display text-display-md font-semibold text-ink">
            Everything a book needs. Nothing in your way.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-soft">
            The best of Scrivener, Sudowrite, and Notion — rebuilt around one idea:
            the author is always in control.
          </p>
        </motion.div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fade(i * 0.05)}
              className="group rounded-2xl border border-line bg-paper-raised p-6 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-raised"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-paper-sunken text-brass transition-colors group-hover:bg-muse-soft group-hover:text-muse-deep">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* steps */}
      <section className="border-y border-line bg-paper-sunken/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.h2
            {...fade()}
            className="mb-14 text-center font-display text-display-md font-semibold text-ink"
          >
            Idea to manuscript, in four calm steps.
          </motion.h2>
          <div className="grid gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div key={s.n} {...fade(i * 0.06)}>
                <div className="font-mono text-sm text-brass">{s.n}</div>
                <h3 className="mt-2 font-display text-lg font-semibold text-ink">{s.t}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* philosophy quote */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <motion.div {...fade()}>
          <Quote className="mx-auto mb-6 h-8 w-8 text-brass/50" />
          <p className="font-display text-2xl font-medium leading-relaxed text-balance text-ink sm:text-3xl">
            “The AI is the assistant. You are the author. Every sentence stays yours —
            editable, lockable, unmistakably human.”
          </p>
          <p className="mt-6 text-sm text-muted">The Quire principle</p>
        </motion.div>
      </section>

      {/* cta */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <motion.div
          {...fade()}
          className="relative overflow-hidden rounded-3xl border border-line bg-ink px-8 py-16 text-center shadow-raised"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(50% 80% at 50% 0%, hsl(var(--muse)/0.5), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-display-md font-semibold text-paper">
              Your book is one idea away.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-paper/70">
              Start a project, generate a blueprint, and write your first chapter in
              minutes.
            </p>
            <Link href="/studio/new" className="mt-8 inline-block">
              <Button size="lg" variant="brass" className="group">
                Start writing — it's your story
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <QuireLogo size="sm" />
          <p className="text-xs text-muted">
            Quire — From a spark to a finished book.
          </p>
        </div>
      </footer>
    </div>
  );
}
