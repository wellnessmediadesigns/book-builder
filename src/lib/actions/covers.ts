"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { deleteCover as deleteFromStore, coverKey } from "@/lib/storage";
import { isCoverType, type CoverType } from "@/lib/covers";

export type CoverInfo = {
  type: CoverType;
  contentType: string;
  fileName: string;
  size: number;
  updatedAt: number; // epoch ms — also a cache-buster for the <img> src
};

/** All uploaded cover slots for a project, keyed metadata only (no bytes). */
export async function listCovers(projectId: string): Promise<CoverInfo[]> {
  const rows = await prisma.coverImage.findMany({ where: { projectId } });
  return rows
    .filter((r) => isCoverType(r.type))
    .map((r) => ({
      type: r.type as CoverType,
      contentType: r.contentType,
      fileName: r.fileName,
      size: r.size,
      updatedAt: r.updatedAt.getTime(),
    }));
}

/** Removes a cover slot's file from storage and its metadata row. */
export async function deleteCover(projectId: string, type: string): Promise<{ ok: boolean }> {
  if (!isCoverType(type)) return { ok: false };
  await deleteFromStore(coverKey(projectId, type));
  await prisma.coverImage.deleteMany({ where: { projectId, type } });
  revalidatePath(`/studio/book/${projectId}/cover`);
  return { ok: true };
}
