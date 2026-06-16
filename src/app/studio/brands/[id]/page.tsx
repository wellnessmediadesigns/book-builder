import { notFound } from "next/navigation";
import { prisma, getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { BrandActions } from "@/components/studio/brand-actions";
import { MemoryView } from "@/components/book/memory-view";

export const dynamic = "force-dynamic";

export default async function BrandProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const author = await getAuthor();
  const project = await prisma.project.findUnique({
    where: { id },
    include: { memory: { orderBy: [{ pinned: "desc" }, { order: "asc" }] } },
  });
  if (!project || project.authorId !== author.id || project.workType !== "brand") notFound();

  const source = await prisma.brainstormSession.findFirst({
    where: { builtProjectId: project.id },
    select: { id: true },
  });
  const brainstormHref = source ? `/studio/brainstorm/${source.id}` : null;

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <BrandActions
        projectId={project.id}
        name={project.recommendedTitle || project.title}
        positioning={project.positioning}
        brainstormHref={brainstormHref}
      />
      <MemoryView
        projectId={project.id}
        workType="brand"
        entries={project.memory.map((m) => ({ id: m.id, kind: m.kind, title: m.title, body: m.body }))}
      />
    </>
  );
}
