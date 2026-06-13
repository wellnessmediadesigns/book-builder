import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookHeader } from "@/components/book/book-header";
import { CoverView } from "@/components/book/cover-view";
import { listCovers } from "@/lib/actions/covers";

export const dynamic = "force-dynamic";

export default async function CoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { chapters: { where: { matterType: null }, select: { wordCount: true } } },
  });
  if (!project) notFound();

  const covers = await listCovers(id);
  const wordCount = project.chapters.reduce((s, c) => s + c.wordCount, 0);
  const writtenCount = project.chapters.filter((c) => c.wordCount > 0).length;
  const title = project.recommendedTitle || project.title;

  return (
    <>
      <BookHeader projectId={id} title={title} />
      <CoverView
        projectId={id}
        title={title}
        covers={covers}
        chapterCount={project.chapters.length}
        writtenCount={writtenCount}
        wordCount={wordCount}
      />
    </>
  );
}
