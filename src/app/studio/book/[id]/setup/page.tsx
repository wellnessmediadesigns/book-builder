import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookHeader } from "@/components/book/book-header";
import { SetupEditor } from "@/components/book/setup-editor";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p) notFound();

  return (
    <>
      <BookHeader projectId={id} title={p.recommendedTitle || p.title} />
      <SetupEditor
        projectId={id}
        hasBlueprint={p.status !== "draft"}
        initial={{
          title: p.title,
          idea: p.idea,
          theme: p.theme,
          genre: p.genre,
          kind: p.kind,
          audience: p.audience,
          tone: p.tone,
          style: p.style,
          readingLevel: p.readingLevel,
          include: p.include,
          avoid: p.avoid,
          notes: p.notes,
          inspiration: p.inspiration,
          goals: p.goals,
          bookType: p.bookType,
          chapterCount: p.chapterCount,
          minWords: p.minWords,
          maxWords: p.maxWords,
          narrativeStyle: p.narrativeStyle,
          pov: p.pov,
          publishFormat: p.publishFormat,
        }}
      />
    </>
  );
}
