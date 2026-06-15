import Link from "next/link";
import { Plus, Sparkles, BookMarked, Lightbulb, Mail, ArrowRight } from "lucide-react";
import { prisma, getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { ProjectCard } from "@/components/studio/project-card";
import { WritingStatsCard } from "@/components/studio/writing-stats";
import { ResumeCard } from "@/components/studio/resume-card";
import { getResumeTarget } from "@/lib/actions/projects";
import { getWritingStats } from "@/lib/actions/stats";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { timeOfDayGreeting, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const author = await getAuthor();
  const projects = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null, workType: "book" },
    orderBy: { updatedAt: "desc" },
    include: {
      chapters: { where: { matterType: null }, select: { wordCount: true } },
      covers: { where: { type: "front" }, select: { updatedAt: true } },
    },
  });

  const coverFor = (p: { id: string; covers: { updatedAt: Date }[] }) =>
    p.covers.length ? `/api/covers/${p.id}/front?v=${p.covers[0].updatedAt.getTime()}` : undefined;

  const totalWords = projects.reduce(
    (sum, p) => sum + p.chapters.reduce((s, c) => s + c.wordCount, 0),
    0,
  );

  const [stats, resume] = await Promise.all([getWritingStats(), getResumeTarget()]);

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* greeting */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted">{timeOfDayGreeting()}, {author.name}.</p>
            <h1 className="mt-1 font-display text-display-md font-semibold text-ink">
              Your library
            </h1>
            <div className="mt-3 flex items-center gap-4 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <BookMarked className="h-4 w-4 text-brass" />
                {projects.length} {projects.length === 1 ? "book" : "books"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-muse" />
                {formatNumber(totalWords)} words written
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {/* Newsletters — mirrors the book actions */}
            <div>
              <Link
                href="/studio/newsletters"
                className="mb-1.5 inline-flex items-center gap-1 text-[0.625rem] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink"
              >
                Newsletters <ArrowRight className="h-3 w-3" />
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/studio/brainstorm/new?mode=newsletter">
                  <Button size="lg" variant="museSoft" className="group">
                    <Lightbulb className="h-4 w-4" /> Brainstorm
                  </Button>
                </Link>
                <Link href="/studio/newsletters/new">
                  <Button size="lg" variant="primary" className="group">
                    <Mail className="h-4 w-4" /> New newsletter
                  </Button>
                </Link>
              </div>
            </div>
            {/* Books */}
            <div>
              <p className="mb-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-muted">Books</p>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/studio/brainstorm">
                  <Button size="lg" variant="museSoft" className="group">
                    <Lightbulb className="h-4 w-4" /> Brainstorm
                  </Button>
                </Link>
                <Link href="/studio/new">
                  <Button size="lg" variant="primary" className="group">
                    <Plus className="h-4 w-4" /> New book
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<BookMarked className="h-6 w-6" />}
            title="Your first book starts here"
            description="Describe an idea and Quire will draft a complete blueprint — titles, an outline, and a reader journey — all yours to edit."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/studio/brainstorm">
                  <Button variant="museSoft">
                    <Lightbulb className="h-4 w-4" /> Brainstorm an idea
                  </Button>
                </Link>
                <Link href="/studio/new">
                  <Button variant="brass">
                    <Sparkles className="h-4 w-4" /> Start a book
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
                  coverUrl={coverFor(
                    projects.find((p) => p.id === resume.projectId) ?? { id: "", covers: [] },
                  )}
                />
              </div>
            )}
            <div className="mb-8">
              <WritingStatsCard stats={stats} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <ProjectCard
                key={p.id}
                index={i}
                id={p.id}
                title={p.title}
                recommendedTitle={p.recommendedTitle}
                bookType={p.bookType}
                kind={p.kind}
                status={p.status}
                coverAccent={p.coverAccent}
                updatedAt={p.updatedAt.toISOString()}
                chapterCount={p.chapters.length || p.chapterCount}
                words={p.chapters.reduce((s, c) => s + c.wordCount, 0)}
                goalWords={p.estTotalWords}
                coverUrl={coverFor(p)}
              />
            ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
