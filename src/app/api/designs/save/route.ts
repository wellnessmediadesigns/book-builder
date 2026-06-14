import { NextRequest } from "next/server";
import { prisma, getAuthor } from "@/lib/db";
import { putCover } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Saves a design: stores the rendered full-res export + a thumbnail in R2 and
 *  persists the text layers. Route handler so large PNGs bypass the 4MB cap. */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const designId = String(form.get("designId") ?? "");
  const name = form.get("name");
  const layersJson = String(form.get("layersJson") ?? "[]");
  const exportFile = form.get("export");
  const thumbFile = form.get("thumb");

  const author = await getAuthor();
  const design = await prisma.coverDesign.findUnique({ where: { id: designId } });
  if (!design || design.authorId !== author.id) {
    return Response.json({ error: "Design not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { layersJson };
  if (typeof name === "string" && name.trim()) data.name = name.trim().slice(0, 120);

  if (exportFile instanceof File) {
    const key = `designs/${designId}/export`;
    await putCover(key, new Uint8Array(await exportFile.arrayBuffer()), exportFile.type || "image/png");
    data.exportR2Key = key;
  }
  if (thumbFile instanceof File) {
    const key = `designs/${designId}/thumb`;
    await putCover(key, new Uint8Array(await thumbFile.arrayBuffer()), thumbFile.type || "image/png");
    data.thumbR2Key = key;
  }

  await prisma.coverDesign.update({ where: { id: designId }, data });
  return Response.json({ ok: true });
}
