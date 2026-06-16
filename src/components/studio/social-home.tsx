import Link from "next/link";
import { Plus, Sparkles, Lightbulb, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { DeleteSessionButton } from "@/components/studio/delete-session-button";
import { platformIcon } from "@/components/studio/social-icons";
import { platformLabel } from "@/lib/social";
import { timeOfDayGreeting, relativeTime } from "@/lib/utils";
import type { SocialPostBrief } from "@/lib/actions/social";
import type { SessionBrief } from "@/lib/actions/brainstorm";

export function SocialHome({
  authorName,
  posts,
  sessions,
}: {
  authorName: string;
  posts: SocialPostBrief[];
  sessions: SessionBrief[];
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* ——— Hero ——— */}
      <div className="grain relative mb-9 overflow-hidden rounded-3xl border border-line bg-paper-raised p-7 shadow-soft sm:p-9">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(70% 90% at 88% 0%, hsl(var(--muse) / 0.14), transparent 60%)" }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="muse">
              <Share2 className="h-3 w-3" /> Social
            </Badge>
            <p className="mt-3 text-sm text-muted">{timeOfDayGreeting()}, {authorName}.</p>
            <h1 className="mt-1 font-display text-display-md font-semibold text-ink">Your posts</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-muse" />
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/studio/social/brainstorm">
              <Button size="lg" variant="museSoft">
                <Lightbulb className="h-4 w-4" /> Brainstorm
              </Button>
            </Link>
            <Link href="/studio/social/new">
              <Button size="lg" variant="brass">
                <Plus className="h-4 w-4" /> New post
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<Share2 className="h-6 w-6" />}
          title="Your first post starts here"
          description="Give Quire a topic and pick your platforms — it writes a tailored version for each, on-brand if you choose a brand."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href="/studio/social/brainstorm">
                <Button variant="museSoft">
                  <Lightbulb className="h-4 w-4" /> Brainstorm an idea
                </Button>
              </Link>
              <Link href="/studio/social/new">
                <Button variant="brass">
                  <Sparkles className="h-4 w-4" /> Compose a post
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/studio/social/${p.id}`} className="group block">
              <div className="flex h-full flex-col rounded-2xl border border-line bg-paper-raised p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-raised">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muse-soft text-muse-deep">
                    <Share2 className="h-5 w-5" />
                  </div>
                  {p.brandName && <Badge tone="brass">{p.brandName}</Badge>}
                  <span className="ml-auto text-xs text-muted">{relativeTime(p.updatedAt)}</span>
                </div>
                <h3 className="mt-3 line-clamp-2 font-display text-base font-semibold text-ink">{p.title}</h3>
                {p.idea && <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-soft">{p.idea}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {p.platforms.slice(0, 6).map((k) => {
                    const Icon = platformIcon(k);
                    return (
                      <span key={k} title={platformLabel(k)} className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-paper-sunken text-ink-soft">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    );
                  })}
                  <ArrowRight className="ml-auto h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ——— Brainstorms rail ——— */}
      {sessions.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Brainstorms</h2>
              <p className="text-sm text-ink-soft">Post ideas in progress — pick one back up.</p>
            </div>
            <Link href="/studio/social/brainstorm">
              <Button variant="museSoft" size="sm">
                <Lightbulb className="h-3.5 w-3.5" /> New
              </Button>
            </Link>
          </div>
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
                        <Share2 className="h-3 w-3" /> Built
                      </Badge>
                    ) : (
                      <Badge tone="neutral">{s.directionCount} points</Badge>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-base font-semibold text-ink">{s.title}</h3>
                  {s.snippet && <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-soft">{s.snippet}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>{relativeTime(s.updatedAt)}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
                <DeleteSessionButton id={s.id} title={s.title} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
