import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { aiStatus } from "@/lib/actions/ai";
import { listMatter } from "@/lib/actions/matter";
import { BookHeader } from "@/components/book/book-header";
import { MatterView } from "@/components/book/matter-view";

export const dynamic = "force-dynamic";

export default async function MatterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, title: true, recommendedTitle: true, workType: true },
  });
  if (!project) notFound();
  const [rows, { ready }] = await Promise.all([listMatter(id), aiStatus()]);

  return (
    <>
      <BookHeader projectId={id} title={project.recommendedTitle || project.title} workType={project.workType} />
      <MatterView projectId={id} initial={rows} aiReady={ready} />
    </>
  );
}
