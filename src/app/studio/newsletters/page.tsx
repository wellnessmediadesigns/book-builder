import { prisma, getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { SectionHome, type SectionWork } from "@/components/studio/section-home";
import { getResumeTarget } from "@/lib/actions/projects";
import { listSessions } from "@/lib/actions/brainstorm";
import { getWritingStats } from "@/lib/actions/stats";

export const dynamic = "force-dynamic";

export default async function NewslettersPage() {
  const author = await getAuthor();
  const projects = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null, workType: "newsletter" },
    orderBy: { updatedAt: "desc" },
    include: { chapters: { where: { matterType: null }, select: { wordCount: true } } },
  });

  const works: SectionWork[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    recommendedTitle: p.recommendedTitle,
    bookType: p.bookType,
    kind: p.kind,
    status: p.status,
    coverAccent: p.coverAccent,
    updatedAt: p.updatedAt.toISOString(),
    chapterCount: p.chapters.length,
    words: p.chapters.reduce((s, c) => s + c.wordCount, 0),
    goalWords: p.estTotalWords,
    audience: p.audience,
    cadence: p.cadence,
  }));

  const [stats, resume, sessions] = await Promise.all([
    getWritingStats(),
    getResumeTarget("newsletter"),
    listSessions("newsletter"),
  ]);

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <SectionHome
        workType="newsletter"
        authorName={author.name}
        works={works}
        sessions={sessions}
        stats={stats}
        resume={resume}
      />
    </>
  );
}
