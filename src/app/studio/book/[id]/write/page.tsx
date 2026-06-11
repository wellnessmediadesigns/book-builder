import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { aiStatus } from "@/lib/actions/ai";
import { Writer } from "@/components/editor/writer";

export const dynamic = "force-dynamic";

export default async function WritePage({
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
  if (project.status === "draft" || project.chapters.length === 0) {
    redirect(`/studio/book/${id}/blueprint`);
  }
  const { ready } = await aiStatus();

  return (
    <Writer
      projectId={project.id}
      bookTitle={project.recommendedTitle || project.title}
      aiReady={ready}
      initialChapters={project.chapters.map((c) => ({
        id: c.id,
        order: c.order,
        title: c.title,
        summary: c.summary,
        wordCount: c.wordCount,
        minWords: c.minWords,
        maxWords: c.maxWords,
        locked: c.locked,
        status: c.status,
        contentJson: c.contentJson,
      }))}
    />
  );
}
