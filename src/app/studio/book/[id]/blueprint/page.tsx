import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { aiStatus } from "@/lib/actions/ai";
import { BookHeader } from "@/components/book/book-header";
import { BlueprintView } from "@/components/book/blueprint-view";

export const dynamic = "force-dynamic";

export default async function BlueprintPage({
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
  const { ready } = await aiStatus();

  return (
    <>
      <BookHeader projectId={id} title={project.recommendedTitle || project.title} workType={project.workType} />
      <BlueprintView
        aiReady={ready}
        workType={project.workType}
        project={{
          id: project.id,
          title: project.title,
          idea: project.idea,
          kind: project.kind,
          bookType: project.bookType,
          status: project.status,
          recommendedTitle: project.recommendedTitle,
          subtitle: project.subtitle,
          positioning: project.positioning,
          readerPromise: project.readerPromise,
          blueprintJson: project.blueprintJson,
        }}
        chapters={project.chapters.map((c) => ({
          id: c.id,
          order: c.order,
          title: c.title,
          summary: c.summary,
        }))}
      />
    </>
  );
}
