"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type FolderNode = { id: string; name: string; parentId: string | null; order: number };
export type NoteNode = {
  id: string;
  folderId: string | null;
  title: string;
  order: number;
  contentJson: string | null;
};

export async function listTree(): Promise<{ folders: FolderNode[]; notes: NoteNode[] }> {
  const author = await getAuthor();
  const [folders, notes] = await Promise.all([
    prisma.noteFolder.findMany({ where: { authorId: author.id }, orderBy: { order: "asc" } }),
    prisma.note.findMany({ where: { authorId: author.id }, orderBy: { order: "asc" } }),
  ]);
  return {
    folders: folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId, order: f.order })),
    notes: notes.map((n) => ({ id: n.id, folderId: n.folderId, title: n.title, order: n.order, contentJson: n.contentJson })),
  };
}

export async function createFolder(parentId: string | null = null): Promise<{ id: string }> {
  const author = await getAuthor();
  const count = await prisma.noteFolder.count({ where: { authorId: author.id, parentId } });
  const folder = await prisma.noteFolder.create({ data: { authorId: author.id, parentId, order: count } });
  revalidatePath("/studio/notes");
  return { id: folder.id };
}

export async function createNote(folderId: string | null = null): Promise<{ id: string }> {
  const author = await getAuthor();
  const count = await prisma.note.count({ where: { authorId: author.id, folderId } });
  const note = await prisma.note.create({ data: { authorId: author.id, folderId, order: count } });
  revalidatePath("/studio/notes");
  return { id: note.id };
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const author = await getAuthor();
  const f = await prisma.noteFolder.findUnique({ where: { id }, select: { authorId: true } });
  if (!f || f.authorId !== author.id) return;
  await prisma.noteFolder.update({ where: { id }, data: { name: name.trim().slice(0, 120) || "Untitled folder" } });
  revalidatePath("/studio/notes");
}

export async function renameNote(id: string, title: string): Promise<void> {
  const author = await getAuthor();
  const n = await prisma.note.findUnique({ where: { id }, select: { authorId: true } });
  if (!n || n.authorId !== author.id) return;
  await prisma.note.update({ where: { id }, data: { title: title.trim().slice(0, 200) || "Untitled note" } });
  revalidatePath("/studio/notes");
}

export async function saveNote(
  id: string,
  data: { title?: string; contentJson: string; contentText: string },
): Promise<void> {
  const author = await getAuthor();
  const n = await prisma.note.findUnique({ where: { id }, select: { authorId: true } });
  if (!n || n.authorId !== author.id) return;
  await prisma.note.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim().slice(0, 200) || "Untitled note" } : {}),
      contentJson: data.contentJson,
      contentText: data.contentText,
    },
  });
}

/** Moves a note to a folder (or root) at a given order. */
export async function moveNote(id: string, folderId: string | null, order: number): Promise<void> {
  const author = await getAuthor();
  const n = await prisma.note.findUnique({ where: { id }, select: { authorId: true } });
  if (!n || n.authorId !== author.id) return;
  await prisma.note.update({ where: { id }, data: { folderId, order } });
  revalidatePath("/studio/notes");
}

/** Moves a folder under a new parent (or root). Guards against cycles. */
export async function moveFolder(id: string, parentId: string | null, order: number): Promise<void> {
  const author = await getAuthor();
  const folders = await prisma.noteFolder.findMany({ where: { authorId: author.id }, select: { id: true, parentId: true } });
  if (!folders.some((f) => f.id === id)) return;
  if (parentId) {
    let cur: string | null = parentId;
    const byId = new Map(folders.map((f) => [f.id, f.parentId]));
    while (cur) {
      if (cur === id) return; // would create a cycle
      cur = byId.get(cur) ?? null;
    }
  }
  await prisma.noteFolder.update({ where: { id }, data: { parentId, order } });
  revalidatePath("/studio/notes");
}

export async function deleteNote(id: string): Promise<void> {
  const author = await getAuthor();
  const n = await prisma.note.findUnique({ where: { id }, select: { authorId: true } });
  if (!n || n.authorId !== author.id) return;
  await prisma.note.delete({ where: { id } });
  revalidatePath("/studio/notes");
}

/** Deletes a folder and everything inside it (subfolders + notes). */
export async function deleteFolder(id: string): Promise<void> {
  const author = await getAuthor();
  const folders = await prisma.noteFolder.findMany({ where: { authorId: author.id }, select: { id: true, parentId: true } });
  if (!folders.some((f) => f.id === id)) return;
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  const idList = Array.from(ids);
  await prisma.note.deleteMany({ where: { authorId: author.id, folderId: { in: idList } } });
  await prisma.noteFolder.deleteMany({ where: { authorId: author.id, id: { in: idList } } });
  revalidatePath("/studio/notes");
}
