import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookHeader } from "@/components/book/book-header";
import { OutlineBoard } from "@/components/book/outline-board";

export const dynamic = "force-dynamic";

export default async function OutlinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      chapters: { where: { matterType: null }, orderBy: { order: "asc" } },
    },
  });
  if (!project) notFound();
  if (project.status === "draft") redirect(`/studio/book/${id}/blueprint`);

  return (
    <>
      <BookHeader projectId={id} title={project.recommendedTitle || project.title} />
      <OutlineBoard
        projectId={id}
        initial={project.chapters.map((c) => ({
          id: c.id,
          order: c.order,
          title: c.title,
          summary: c.summary,
          wordCount: c.wordCount,
          minWords: c.minWords,
          maxWords: c.maxWords,
          status: c.status,
          locked: c.locked,
        }))}
      />
    </>
  );
}
