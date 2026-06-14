import { NextRequest } from "next/server";
import { prisma, getAuthor } from "@/lib/db";
import { putCover } from "@/lib/storage";

export const dynamic = "force-dynamic";

const OK_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX = 40 * 1024 * 1024;

/** Upload a reusable cover template image. Route handler so it isn't bound by the
 *  4MB Server Action body limit. */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const name = String(form.get("name") ?? "Template").slice(0, 120) || "Template";
  const file = form.get("file");
  const width = Math.max(0, Math.round(Number(form.get("width") ?? 0)));
  const height = Math.max(0, Math.round(Number(form.get("height") ?? 0)));

  if (!(file instanceof File)) return Response.json({ error: "Missing file" }, { status: 400 });
  if (!OK_TYPES.has(file.type)) return Response.json({ error: "Use a PNG, JPEG, or WebP image." }, { status: 415 });
  if (file.size > MAX) return Response.json({ error: "Image is larger than 40MB." }, { status: 413 });

  const author = await getAuthor();
  const row = await prisma.coverTemplate.create({
    data: { authorId: author.id, name, r2Key: "", contentType: file.type, width, height },
  });
  const key = `templates/${row.id}`;
  await putCover(key, new Uint8Array(await file.arrayBuffer()), file.type);
  await prisma.coverTemplate.update({ where: { id: row.id }, data: { r2Key: key } });

  return Response.json({
    ok: true,
    template: { id: row.id, name: row.name, width, height, createdAt: row.createdAt.toISOString() },
  });
}
