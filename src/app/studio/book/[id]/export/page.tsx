import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookHeader } from "@/components/book/book-header";
import { ExportView } from "@/components/book/export-view";

export const dynamic = "force-dynamic";

export default async function ExportPage({
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

  const wordCount = project.chapters.reduce((s, c) => s + c.wordCount, 0);
  const writtenCount = project.chapters.filter((c) => c.wordCount > 0).length;
  const title = project.recommendedTitle || project.title;

  return (
    <>
      <BookHeader projectId={id} title={title} />
      <ExportView
        projectId={id}
        title={title}
        chapterCount={project.chapters.length}
        wordCount={wordCount}
        writtenCount={writtenCount}
      />
    </>
  );
}
