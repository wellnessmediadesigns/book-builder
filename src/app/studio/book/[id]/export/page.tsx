import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookHeader } from "@/components/book/book-header";
import { ExportView } from "@/components/book/export-view";
import { NewsletterExport } from "@/components/book/newsletter-export";
import { THEMES } from "@/lib/export/themes";

export const dynamic = "force-dynamic";

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      chapters: {
        where: { matterType: null },
        orderBy: { order: "asc" },
        select: { id: true, title: true, wordCount: true, order: true },
      },
    },
  });
  if (!project) notFound();

  const title = project.recommendedTitle || project.title;

  if (project.workType === "newsletter") {
    return (
      <>
        <BookHeader projectId={id} title={title} workType={project.workType} />
        <NewsletterExport
          projectId={id}
          brand={title}
          issues={project.chapters.map((c) => ({ id: c.id, title: c.title, wordCount: c.wordCount, order: c.order }))}
        />
      </>
    );
  }

  const wordCount = project.chapters.reduce((s, c) => s + c.wordCount, 0);
  const writtenCount = project.chapters.filter((c) => c.wordCount > 0).length;

  return (
    <>
      <BookHeader projectId={id} title={title} workType={project.workType} />
      <ExportView
        projectId={id}
        title={title}
        chapterCount={project.chapters.length}
        wordCount={wordCount}
        writtenCount={writtenCount}
        currentTheme={project.formatTheme}
        themes={THEMES.map((t) => ({ id: t.id, name: t.name, description: t.description }))}
      />
    </>
  );
}
