import { prisma, getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { SectionHome, type SectionWork } from "@/components/studio/section-home";
import { getResumeTarget } from "@/lib/actions/projects";
import { listSessions } from "@/lib/actions/brainstorm";
import { getWritingStats } from "@/lib/actions/stats";

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

  const works: SectionWork[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    recommendedTitle: p.recommendedTitle,
    bookType: p.bookType,
    kind: p.kind,
    status: p.status,
    coverAccent: p.coverAccent,
    updatedAt: p.updatedAt.toISOString(),
    chapterCount: p.chapters.length || p.chapterCount,
    words: p.chapters.reduce((s, c) => s + c.wordCount, 0),
    goalWords: p.estTotalWords,
    coverUrl: coverFor(p),
  }));

  const [stats, resume, sessions] = await Promise.all([
    getWritingStats(),
    getResumeTarget("book"),
    listSessions("book"),
  ]);

  const resumeWithCover = resume
    ? {
        bookTitle: resume.bookTitle,
        chapterTitle: resume.chapterTitle,
        href: resume.href,
        updatedAt: resume.updatedAt,
        coverUrl: coverFor(projects.find((p) => p.id === resume.projectId) ?? { id: "", covers: [] }),
      }
    : null;

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <SectionHome
        workType="book"
        authorName={author.name}
        works={works}
        sessions={sessions}
        stats={stats}
        resume={resumeWithCover}
      />
    </>
  );
}
