"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addMemory(
  projectId: string,
  kind: string,
  title: string,
  body: string,
) {
  const max = await prisma.memoryEntry.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  await prisma.memoryEntry.create({
    data: { projectId, kind, title, body, order: (max._max.order ?? 0) + 1 },
  });
  revalidatePath(`/studio/book/${projectId}/memory`);
}

export async function updateMemory(
  id: string,
  data: { title?: string; body?: string; kind?: string; pinned?: boolean },
) {
  const m = await prisma.memoryEntry.update({ where: { id }, data });
  revalidatePath(`/studio/book/${m.projectId}/memory`);
}

export async function deleteMemory(id: string) {
  const m = await prisma.memoryEntry.delete({ where: { id } });
  revalidatePath(`/studio/book/${m.projectId}/memory`);
}
