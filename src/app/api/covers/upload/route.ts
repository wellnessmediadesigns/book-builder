import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { putCover, coverKey } from "@/lib/storage";
import { isCoverType, COVER_MIME, COVER_MAX_BYTES } from "@/lib/covers";

export const dynamic = "force-dynamic";

/**
 * Cover upload — a route handler (not a Server Action) so it isn't bound by the
 * 4MB Server Action body limit in next.config.mjs; print covers run larger.
 * Gated by the password middleware like the rest of /api.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const projectId = form.get("projectId");
  const type = form.get("type");
  const file = form.get("file");

  if (typeof projectId !== "string" || typeof type !== "string" || !(file instanceof File)) {
    return Response.json({ error: "Missing projectId, type, or file" }, { status: 400 });
  }
  if (!isCoverType(type)) {
    return Response.json({ error: "Invalid cover type" }, { status: 400 });
  }
  if (!COVER_MIME[file.type]) {
    return Response.json(
      { error: "Unsupported file type. Use PNG, JPEG, WebP, or PDF." },
      { status: 415 },
    );
  }
  if (file.size > COVER_MAX_BYTES) {
    return Response.json({ error: "File is larger than 40MB." }, { status: 413 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = coverKey(projectId, type);
  await putCover(key, bytes, file.type);

  const row = await prisma.coverImage.upsert({
    where: { projectId_type: { projectId, type } },
    create: { projectId, type, r2Key: key, contentType: file.type, fileName: file.name, size: file.size },
    update: { r2Key: key, contentType: file.type, fileName: file.name, size: file.size },
  });

  return Response.json({
    ok: true,
    cover: {
      type,
      contentType: row.contentType,
      fileName: row.fileName,
      size: row.size,
      updatedAt: row.updatedAt.getTime(),
    },
  });
}
