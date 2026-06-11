"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { countWords, docToText } from "@/lib/utils";

export async function saveChapterContent(
  chapterId: string,
  contentJson: unknown,
  options?: { snapshot?: boolean; source?: string },
) {
  const text = docToText(contentJson);
  const wordCount = countWords(text);
  const chapter = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      contentJson: JSON.stringify(contentJson),
      contentText: text,
      wordCount,
      status: wordCount > 0 ? "drafted" : "planned",
    },
  });
  if (options?.snapshot) {
    await prisma.chapterVersion.create({
      data: {
        chapterId,
        label: "Snapshot",
        source: options.source ?? "manual",
        contentJson: JSON.stringify(contentJson),
        contentText: text,
        wordCount,
      },
    });
  }
  return { wordCount, updatedAt: chapter.updatedAt };
}

export async function createSnapshot(chapterId: string, label: string) {
  const c = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } });
  await prisma.chapterVersion.create({
    data: {
      chapterId,
      label: label || "Manual snapshot",
      source: "snapshot",
      contentJson: c.contentJson,
      contentText: c.contentText,
      wordCount: c.wordCount,
    },
  });
  revalidatePath(`/studio/book/${c.projectId}/write`);
}

export async function restoreVersion(versionId: string) {
  const v = await prisma.chapterVersion.findUniqueOrThrow({ where: { id: versionId } });
  const c = await prisma.chapter.findUniqueOrThrow({ where: { id: v.chapterId } });
  // Snapshot current before restoring, so nothing is lost.
  await prisma.chapterVersion.create({
    data: {
      chapterId: v.chapterId,
      label: "Before restore",
      source: "manual",
      contentJson: c.contentJson,
      contentText: c.contentText,
      wordCount: c.wordCount,
    },
  });
  await prisma.chapter.update({
    where: { id: v.chapterId },
    data: {
      contentJson: v.contentJson,
      contentText: v.contentText,
      wordCount: v.wordCount,
    },
  });
  revalidatePath(`/studio/book/${c.projectId}/write`);
  return { contentJson: v.contentJson };
}

export async function updateChapterMeta(
  chapterId: string,
  data: { title?: string; summary?: string; minWords?: number; maxWords?: number; status?: string },
) {
  const c = await prisma.chapter.update({ where: { id: chapterId }, data });
  revalidatePath(`/studio/book/${c.projectId}/write`);
}

export async function toggleChapterLock(chapterId: string) {
  const c = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } });
  await prisma.chapter.update({ where: { id: chapterId }, data: { locked: !c.locked } });
  revalidatePath(`/studio/book/${c.projectId}/write`);
  return { locked: !c.locked };
}

export async function addChapter(projectId: string, afterOrder?: number) {
  const chapters = await prisma.chapter.findMany({
    where: { projectId, matterType: null },
    orderBy: { order: "asc" },
  });
  const insertAt = afterOrder === undefined ? chapters.length : afterOrder + 1;
  // shift subsequent chapters
  await prisma.$transaction(
    chapters
      .filter((c) => c.order >= insertAt)
      .map((c) =>
        prisma.chapter.update({ where: { id: c.id }, data: { order: c.order + 1 } }),
      ),
  );
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const created = await prisma.chapter.create({
    data: {
      projectId,
      order: insertAt,
      title: `Chapter ${insertAt + 1}`,
      minWords: project.minWords,
      maxWords: project.maxWords,
    },
  });
  revalidatePath(`/studio/book/${projectId}/write`);
  return created.id;
}

export async function deleteChapter(chapterId: string) {
  const c = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } });
  await prisma.chapter.delete({ where: { id: chapterId } });
  revalidatePath(`/studio/book/${c.projectId}/write`);
}

export async function reorderChapters(projectId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.chapter.update({ where: { id }, data: { order: idx } }),
    ),
  );
  revalidatePath(`/studio/book/${projectId}/write`);
}

export async function getVersionDetail(versionId: string) {
  const v = await prisma.chapterVersion.findUniqueOrThrow({ where: { id: versionId } });
  return {
    id: v.id,
    label: v.label,
    source: v.source,
    wordCount: v.wordCount,
    contentText: v.contentText,
    createdAt: v.createdAt.toISOString(),
  };
}

export async function listChapterVersions(chapterId: string) {
  const versions = await prisma.chapterVersion.findMany({
    where: { chapterId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, label: true, source: true, wordCount: true, createdAt: true },
  });
  return versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }));
}

export async function resolveRevision(
  chapterId: string,
  command: string,
  instruction: string,
  original: string,
  proposed: string,
  status: "accepted" | "rejected",
) {
  await prisma.aiRevision.create({
    data: { chapterId, command, instruction, original, proposed, status },
  });
}
