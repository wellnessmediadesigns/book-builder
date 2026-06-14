import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookHeader } from "@/components/book/book-header";
import { MemoryView } from "@/components/book/memory-view";

export const dynamic = "force-dynamic";

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { memory: { orderBy: [{ pinned: "desc" }, { order: "asc" }] } },
  });
  if (!project) notFound();

  return (
    <>
      <BookHeader projectId={id} title={project.recommendedTitle || project.title} workType={project.workType} />
      <MemoryView
        projectId={id}
        entries={project.memory.map((m) => ({
          id: m.id,
          kind: m.kind,
          title: m.title,
          body: m.body,
        }))}
      />
    </>
  );
}
