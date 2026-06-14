import Link from "next/link";
import { Mail, Plus, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { relativeTime, formatNumber } from "@/lib/utils";
import { listPublications } from "@/lib/actions/projects";

export const dynamic = "force-dynamic";

const ACCENT: Record<string, string> = {
  brass: "from-brass/20 to-brass/5 text-brass-deep",
  muse: "from-muse/20 to-muse/5 text-muse-deep",
  sage: "from-sage/20 to-sage/5 text-sage",
};

export default async function NewslettersPage() {
  const author = await getAuthor();
  const pubs = await listPublications();

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* hero */}
        <div className="relative mb-9 overflow-hidden rounded-3xl border border-line bg-paper-raised p-7 shadow-soft sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brass/15 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge tone="brass">
                <Mail className="h-3 w-3" /> Newsletters
              </Badge>
              <h1 className="mt-3 font-display text-display-md font-semibold text-ink">Your newsletters</h1>
              <p className="mt-2 max-w-lg text-ink-soft">
                A brand holds your voice and knowledge; every issue inherits it. Set one up, plan your
                issues, write them, and copy each into your email.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/studio/brainstorm/new?mode=newsletter">
                <Button size="lg" variant="museSoft">
                  <Lightbulb className="h-4 w-4" /> Brainstorm
                </Button>
              </Link>
              <Link href="/studio/newsletters/new">
                <Button size="lg" variant="brass">
                  <Plus className="h-4 w-4" /> New newsletter
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {pubs.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-6 w-6" />}
            title="No newsletters yet"
            description="Set up a brand — its voice and audience — then Quire helps you plan and write a series of on-brand issues."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/studio/brainstorm/new?mode=newsletter">
                  <Button variant="museSoft">
                    <Lightbulb className="h-4 w-4" /> Brainstorm one
                  </Button>
                </Link>
                <Link href="/studio/newsletters/new">
                  <Button variant="brass">
                    <Sparkles className="h-4 w-4" /> Start a newsletter
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pubs.map((p) => {
              const href = p.status === "draft" ? `/studio/book/${p.id}/blueprint` : `/studio/book/${p.id}/write`;
              return (
                <Link key={p.id} href={href} className="group block">
                  <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-raised">
                    <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${ACCENT[p.coverAccent] ?? ACCENT.brass}`}>
                      <Mail className="h-8 w-8 opacity-80" />
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-ink">{p.title}</h3>
                      {p.audience && <p className="mt-1 line-clamp-1 text-xs text-muted">For {p.audience}</p>}
                      <div className="mt-4 flex items-center gap-3 text-xs text-ink-soft">
                        <span>{p.written}/{p.issueCount} issues</span>
                        <span>{formatNumber(p.words)} words</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-muted">
                          {relativeTime(p.updatedAt)}
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
