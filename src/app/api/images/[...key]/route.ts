import { NextRequest } from "next/server";
import { prisma, getAuthor } from "@/lib/db";
import { getCover } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Serves cover-studio images from R2 (templates + design base/export/thumb),
 *  authorized to the owning author. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const author = await getAuthor();

  let owned = false;
  if (key[0] === "templates" && key[1]) {
    const t = await prisma.coverTemplate.findUnique({ where: { id: key[1] }, select: { authorId: true } });
    owned = !!t && t.authorId === author.id;
  } else if (key[0] === "designs" && key[1]) {
    const d = await prisma.coverDesign.findUnique({ where: { id: key[1] }, select: { authorId: true } });
    owned = !!d && d.authorId === author.id;
  }
  if (!owned) return new Response("Not found", { status: 404 });

  const stored = await getCover(key.join("/"));
  if (!stored) return new Response("Not found", { status: 404 });

  return new Response(stored.body as BodyInit, {
    headers: {
      "Content-Type": stored.contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
