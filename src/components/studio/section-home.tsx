import type { ComponentProps } from "react";
import Link from "next/link";
import { Plus, Sparkles, Lightbulb, BookOpen, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { ProjectCard } from "@/components/studio/project-card";
import { ResumeCard } from "@/components/studio/resume-card";
import { WritingStatsCard } from "@/components/studio/writing-stats";
import { DeleteSessionButton } from "@/components/studio/delete-session-button";
import { workVocab } from "@/lib/work";
import { timeOfDayGreeting, formatNumber, relativeTime } from "@/lib/utils";
import type { SessionBrief } from "@/lib/actions/brainstorm";

export type SectionWork = {
  id: string;
  title: string;
  recommendedTitle: string;
  bookType: string;
  kind: string;
  status: string;
  coverAccent: string;
  updatedAt: string;
  chapterCount: number;
  words: number;
  goalWords: number;
  coverUrl?: string;
  audience?: string;
  cadence?: string;
};

type Resume = {
  bookTitle: string;
  chapterTitle: string | null;
  href: string;
  updatedAt: string;
  coverUrl?: string;
} | null;

type Stats = ComponentProps<typeof WritingStatsCard>["stats"];

/** The shared, premium home rendered by both the Books and Newsletters spaces. */
export function SectionHome({
  workType,
  authorName,
  works,
  sessions,
  stats,
  resume,
}: {
  workType: "book" | "newsletter";
  authorName: string;
  works: SectionWork[];
  sessions: SessionBrief[];
  stats: Stats;
  resume: Resume;
}) {
  const v = workVocab(workType);
  const news = workType === "newsletter";
  const Icon = news ? Mail : BookOpen;
  const totalWords = works.reduce((s, w) => s + w.words, 0);
  const countLabel = news
    ? `${works.length} ${works.length === 1 ? "newsletter" : "newsletters"}`
    : `${works.length} ${works.length === 1 ? "book" : "books"}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* ——— Hero ——— */}
      <div className="grain relative mb-9 overflow-hidden rounded-3xl border border-line bg-paper-raised p-7 shadow-soft sm:p-9">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 90% at 88% 0%, hsl(var(--muse) / 0.14), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone={news ? "muse" : "brass"}>
              <Icon className="h-3 w-3" /> {news ? "Newsletters" : "Books"}
            </Badge>
            <p className="mt-3 text-sm text-muted">
              {timeOfDayGreeting()}, {authorName}.
            </p>
            <h1 className="mt-1 font-display text-display-md font-semibold text-ink">
              {news ? "Your newsletters" : "Your books"}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <Icon className={`h-4 w-4 ${news ? "text-muse" : "text-brass"}`} />
                {countLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-muse" />
                {formatNumber(totalWords)} words written
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={v.brainstormHref}>
              <Button size="lg" variant="museSoft">
                <Lightbulb className="h-4 w-4" /> Brainstorm
              </Button>
            </Link>
            <Link href={v.newHref}>
              <Button size="lg" variant="brass">
                <Plus className="h-4 w-4" /> {news ? "New newsletter" : "New book"}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {works.length === 0 ? (
        <EmptyState
          icon={<Icon className="h-6 w-6" />}
          title={news ? "Your first newsletter starts here" : "Your first book starts here"}
          description={
            news
              ? "Set up a brand — its voice and audience — and Quire writes you a complete, ready-to-send first issue."
              : "Describe an idea and Quire drafts a full blueprint — titles, an outline, and a reader journey — all yours to edit."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link href={v.brainstormHref}>
                <Button variant="museSoft">
                  <Lightbulb className="h-4 w-4" /> Brainstorm an idea
                </Button>
              </Link>
              <Link href={v.newHref}>
                <Button variant="brass">
                  <Sparkles className="h-4 w-4" /> {news ? "Start a newsletter" : "Start a book"}
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          {resume && (
            <div className="mb-5">
              <ResumeCard
                bookTitle={resume.bookTitle}
                chapterTitle={resume.chapterTitle}
                href={resume.href}
                updatedAt={resume.updatedAt}
                coverUrl={resume.coverUrl}
              />
            </div>
          )}
          <div className="mb-8">
            <WritingStatsCard stats={stats} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((w, i) => (
              <ProjectCard
                key={w.id}
                index={i}
                workType={workType}
                id={w.id}
                title={w.title}
                recommendedTitle={w.recommendedTitle}
                bookType={w.bookType}
                kind={w.kind}
                status={w.status}
                coverAccent={w.coverAccent}
                updatedAt={w.updatedAt}
                chapterCount={w.chapterCount}
                words={w.words}
                goalWords={w.goalWords}
                coverUrl={w.coverUrl}
                audience={w.audience}
                cadence={w.cadence}
              />
            ))}
          </div>
        </>
      )}

      {/* ——— Brainstorms rail ——— */}
      {sessions.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Brainstorms</h2>
              <p className="text-sm text-ink-soft">
                {news ? "Newsletter ideas in progress" : "Book ideas in progress"} — pick one back up.
              </p>
            </div>
            <Link href={v.brainstormHref}>
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
        </section>
      )}
    </main>
  );
}
