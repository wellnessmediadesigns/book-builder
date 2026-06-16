import Link from "next/link";
import { Plus, Lightbulb, Sparkles, BookOpen, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/utils";
import { listSessions, createSession } from "@/lib/actions/brainstorm";
import { DeleteSessionButton } from "@/components/studio/delete-session-button";

/** Shared brainstorm-sessions home, scoped to a mode (book | newsletter). */
export async function BrainstormHome({ mode }: { mode: "book" | "newsletter" }) {
  const news = mode === "newsletter";
  const sessions = await listSessions(mode);
  const Icon = news ? Mail : BookOpen;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* hero */}
      <div className="relative mb-9 overflow-hidden rounded-3xl border border-line bg-paper-raised p-7 shadow-soft sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-muse/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-brass/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="muse">
              <Sparkles className="h-3 w-3" /> Brainstorm
            </Badge>
            <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
              {news ? "Shape your next newsletter" : "Find your next book"}
            </h1>
            <p className="mt-2 max-w-lg text-ink-soft">
              {news
                ? "Bounce ideas back and forth with Muse, agree on the angle and audience, then turn it into a complete, ready-to-send newsletter in one tap."
                : "Bounce ideas back and forth with Muse, save the ones that spark to your board, and turn them into a real book in one tap."}
            </p>
          </div>
          <form action={createSession.bind(null, mode)}>
            <Button size="lg" variant="muse" type="submit">
              <Plus className="h-4 w-4" /> New brainstorm
            </Button>
          </form>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-6 w-6" />}
          title="No brainstorms yet"
          description={
            news
              ? "Start one and chat your way to a newsletter — Muse helps you find the angle, the subscriber, and the hook."
              : "Start one and chat your way to a book idea — Muse will help you find the angle, the audience, and the hook."
          }
          action={
            <form action={createSession.bind(null, mode)}>
              <Button variant="brass" type="submit">
                <Sparkles className="h-4 w-4" /> Start brainstorming
              </Button>
            </form>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <div key={s.id} className="group relative">
              <Link
                href={`/studio/brainstorm/${s.id}`}
                className="flex flex-col rounded-2xl border border-line bg-paper-raised p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-raised"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muse-soft text-muse-deep">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  {s.status === "built" ? (
                    <Badge tone="sage">
                      <Icon className="h-3 w-3" /> Built
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{s.directionCount} points</Badge>
                  )}
                </div>
                <h3 className="mt-3 line-clamp-2 font-display text-base font-semibold text-ink">
                  {s.title}
                </h3>
                {s.snippet && (
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-soft">{s.snippet}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{relativeTime(s.updatedAt)}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
              <DeleteSessionButton id={s.id} title={s.title} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
