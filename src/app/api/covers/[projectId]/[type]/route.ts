import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCover, coverKey } from "@/lib/storage";
import { isCoverType, extForType } from "@/lib/covers";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Streams a stored cover for <img> display, or as a download with `?download=1`. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; type: string }> },
) {
  const { projectId, type } = await params;
  if (!isCoverType(type)) return new Response("Not found", { status: 404 });

  const row = await prisma.coverImage.findUnique({
    where: { projectId_type: { projectId, type } },
  });
  if (!row) return new Response("Not found", { status: 404 });

  const stored = await getCover(row.r2Key ?? coverKey(projectId, type));
  if (!stored) return new Response("Not found", { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Content-Type": stored.contentType,
    "Cache-Control": "private, max-age=300",
  };
  if (download) {
    const ext = extForType(stored.contentType);
    headers["Content-Disposition"] = `attachment; filename="${slugify(`cover-${type}`)}.${ext}"`;
  }
  return new Response(stored.body as BodyInit, { headers });
}
