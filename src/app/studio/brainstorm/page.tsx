import Link from "next/link";
import { Plus, Lightbulb, Sparkles, BookOpen, ArrowRight } from "lucide-react";
import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/utils";
import { listSessions, createSession } from "@/lib/actions/brainstorm";

export const dynamic = "force-dynamic";

export default async function BrainstormHomePage() {
  const author = await getAuthor();
  const sessions = await listSessions();

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <main className="mx-auto max-w-5xl px-6 py-10">
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
                Find your next book
              </h1>
              <p className="mt-2 max-w-lg text-ink-soft">
                Bounce ideas back and forth with Muse, save the ones that spark to your board, and
                turn them into a real book in one tap.
              </p>
            </div>
            <form action={createSession}>
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
            description="Start one and chat your way to a book idea — Muse will help you find the angle, the audience, and the hook."
            action={
              <form action={createSession}>
                <Button variant="brass" type="submit">
                  <Sparkles className="h-4 w-4" /> Start brainstorming
                </Button>
              </form>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/studio/brainstorm/${s.id}`}
                className="group flex flex-col rounded-2xl border border-line bg-paper-raised p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-raised"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muse-soft text-muse-deep">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  {s.status === "built" ? (
                    <Badge tone="sage">
                      <BookOpen className="h-3 w-3" /> Built
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
            ))}
          </div>
        )}
      </main>
    </>
  );
}
