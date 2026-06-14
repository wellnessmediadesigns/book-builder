"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCover, putCover, deleteCover, coverKey } from "@/lib/storage";
import { isCoverType } from "@/lib/covers";
import { presetLayer } from "@/lib/cover-design";

export type TemplateInfo = {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
};

export type DesignInfo = {
  id: string;
  name: string;
  width: number;
  height: number;
  hasExport: boolean;
  updatedAt: string;
};

// ————————————————————————————————————————————— Templates

export async function listTemplates(): Promise<TemplateInfo[]> {
  const author = await getAuthor();
  const rows = await prisma.coverTemplate.findMany({
    where: { authorId: author.id },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    width: t.width,
    height: t.height,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function deleteTemplate(id: string): Promise<{ ok: boolean }> {
  const author = await getAuthor();
  const t = await prisma.coverTemplate.findUnique({ where: { id } });
  if (!t || t.authorId !== author.id) return { ok: false };
  await deleteCover(t.r2Key);
  await prisma.coverTemplate.delete({ where: { id } });
  revalidatePath("/studio/covers");
  return { ok: true };
}

/** Copies a template's image into a fresh design and opens the editor. */
export async function createDesignFromTemplate(templateId: string): Promise<void> {
  const author = await getAuthor();
  const t = await prisma.coverTemplate.findUnique({ where: { id: templateId } });
  if (!t || t.authorId !== author.id) return;

  const design = await prisma.coverDesign.create({
    data: {
      authorId: author.id,
      name: `${t.name} design`,
      templateId: t.id,
      baseR2Key: "", // set after we know the id
      contentType: t.contentType,
      width: t.width,
      height: t.height,
    },
  });
  const baseKey = `designs/${design.id}/base`;
  const img = await getCover(t.r2Key);
  if (img) await putCover(baseKey, img.body, img.contentType);

  // Seed with a Title + Author layer to start from.
  const layers = [
    presetLayer("title", t.width || 1600, t.height || 2560),
    presetLayer("author", t.width || 1600, t.height || 2560),
  ];
  await prisma.coverDesign.update({
    where: { id: design.id },
    data: { baseR2Key: baseKey, layersJson: JSON.stringify(layers) },
  });

  redirect(`/studio/covers/editor/${design.id}`);
}

// ————————————————————————————————————————————— Designs

export async function listDesigns(): Promise<DesignInfo[]> {
  const author = await getAuthor();
  const rows = await prisma.coverDesign.findMany({
    where: { authorId: author.id },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((d) => ({
    id: d.id,
    name: d.name,
    width: d.width,
    height: d.height,
    hasExport: Boolean(d.exportR2Key),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function renameDesign(id: string, name: string): Promise<void> {
  const author = await getAuthor();
  const d = await prisma.coverDesign.findUnique({ where: { id } });
  if (!d || d.authorId !== author.id) return;
  await prisma.coverDesign.update({ where: { id }, data: { name: name.trim().slice(0, 120) || "Untitled cover" } });
  revalidatePath("/studio/covers");
}

export async function deleteDesign(id: string): Promise<{ ok: boolean }> {
  const author = await getAuthor();
  const d = await prisma.coverDesign.findUnique({ where: { id } });
  if (!d || d.authorId !== author.id) return { ok: false };
  await deleteCover(d.baseR2Key);
  if (d.exportR2Key) await deleteCover(d.exportR2Key);
  if (d.thumbR2Key) await deleteCover(d.thumbR2Key);
  await prisma.coverDesign.delete({ where: { id } });
  revalidatePath("/studio/covers");
  return { ok: true };
}

/** Writes a design's rendered export into a book's cover slot (front/back/wrap). */
export async function assignDesignToBook(
  designId: string,
  projectId: string,
  slot: string,
): Promise<{ ok: boolean; error?: string }> {
  const author = await getAuthor();
  if (!isCoverType(slot)) return { ok: false, error: "Bad slot" };
  const d = await prisma.coverDesign.findUnique({ where: { id: designId } });
  if (!d || d.authorId !== author.id) return { ok: false, error: "Design not found" };
  if (!d.exportR2Key) return { ok: false, error: "Export the design first (Save) before assigning." };
  const project = await prisma.project.findFirst({ where: { id: projectId, authorId: author.id }, select: { id: true } });
  if (!project) return { ok: false, error: "Book not found" };

  const img = await getCover(d.exportR2Key);
  if (!img) return { ok: false, error: "Rendered image missing — re-save the design." };

  const key = coverKey(projectId, slot);
  await putCover(key, img.body, img.contentType);
  await prisma.coverImage.upsert({
    where: { projectId_type: { projectId, type: slot } },
    create: { projectId, type: slot, r2Key: key, contentType: img.contentType, fileName: `${d.name}.png`, size: img.body.length },
    update: { r2Key: key, contentType: img.contentType, fileName: `${d.name}.png`, size: img.body.length },
  });
  revalidatePath(`/studio/book/${projectId}/cover`);
  revalidatePath("/studio");
  return { ok: true };
}

/** Books available as assignment targets. */
export async function listAssignableBooks(): Promise<{ id: string; title: string }[]> {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, recommendedTitle: true },
    take: 50,
  });
  return rows.map((p) => ({ id: p.id, title: p.recommendedTitle || p.title }));
}
