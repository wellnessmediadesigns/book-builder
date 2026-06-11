"use server";

import { prisma } from "@/lib/db";

export type NoteData = {
  comments: { id: string; body: string; resolved: boolean; createdAt: string }[];
  bookmarks: { id: string; label: string; anchor: string; createdAt: string }[];
};

export async function listNotes(chapterId: string): Promise<NoteData> {
  const [comments, bookmarks] = await Promise.all([
    prisma.comment.findMany({ where: { chapterId }, orderBy: { createdAt: "desc" } }),
    prisma.bookmark.findMany({ where: { chapterId }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      resolved: c.resolved,
      createdAt: c.createdAt.toISOString(),
    })),
    bookmarks: bookmarks.map((b) => ({
      id: b.id,
      label: b.label,
      anchor: b.anchor,
      createdAt: b.createdAt.toISOString(),
    })),
  };
}

export async function addComment(chapterId: string, body: string, anchor = "") {
  await prisma.comment.create({ data: { chapterId, body, anchor } });
}

export async function toggleCommentResolved(id: string) {
  const c = await prisma.comment.findUniqueOrThrow({ where: { id } });
  await prisma.comment.update({ where: { id }, data: { resolved: !c.resolved } });
}

export async function deleteComment(id: string) {
  await prisma.comment.delete({ where: { id } });
}

export async function addBookmark(chapterId: string, label: string, anchor: string) {
  await prisma.bookmark.create({ data: { chapterId, label, anchor } });
}

export async function deleteBookmark(id: string) {
  await prisma.bookmark.delete({ where: { id } });
}
