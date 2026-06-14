import { notFound } from "next/navigation";
import { prisma, getAuthor } from "@/lib/db";
import { CoverEditor } from "@/components/studio/cover-editor";
import { parseLayers } from "@/lib/cover-design";
import { googleFontsHref } from "@/lib/cover-fonts";

export const dynamic = "force-dynamic";

export default async function CoverEditorPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;
  const author = await getAuthor();
  const design = await prisma.coverDesign.findUnique({ where: { id: designId } });
  if (!design || design.authorId !== author.id) notFound();

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={googleFontsHref()} />
      <CoverEditor
        designId={design.id}
        name={design.name}
        width={design.width || 1600}
        height={design.height || 2560}
        baseUrl={`/api/images/designs/${design.id}/base`}
        initialLayers={parseLayers(design.layersJson)}
      />
    </>
  );
}
