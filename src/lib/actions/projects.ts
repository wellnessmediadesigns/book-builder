"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProjectInput = {
  title: string;
  idea: string;
  theme: string;
  genre: string;
  kind: string;
  audience: string;
  tone: string;
  style: string;
  readingLevel: string;
  include: string;
  avoid: string;
  notes: string;
  inspiration: string;
  goals: string;
  bookType: string;
  chapterCount: number;
  minWords: number;
  maxWords: number;
  narrativeStyle: string;
  pov: string;
  publishFormat: string;
  seriesName: string;
  styleNotes: string;
};

const ACCENTS = ["brass", "muse", "sage"];

/** The most-recently-touched book + chapter, for a dashboard "Continue" card. */
export async function getResumeTarget(): Promise<{
  projectId: string;
  bookTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  href: string;
  updatedAt: string;
} | null> {
  const author = await getAuthor();
  const project = await prisma.project.findFirst({
    where: { authorId: author.id, status: { not: "draft" } },
    orderBy: { updatedAt: "desc" },
  });
  if (!project) return null;
  // Prefer the most recently edited body chapter that has content.
  const chapter =
    (await prisma.chapter.findFirst({
      where: { projectId: project.id, matterType: null, wordCount: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    })) ??
    (await prisma.chapter.findFirst({
      where: { projectId: project.id, matterType: null },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    }));
  return {
    projectId: project.id,
    bookTitle: project.recommendedTitle || project.title,
    chapterId: chapter?.id ?? null,
    chapterTitle: chapter?.title ?? null,
    href: chapter
      ? `/studio/book/${project.id}/write?chapter=${chapter.id}`
      : `/studio/book/${project.id}/write`,
    updatedAt: project.updatedAt.toISOString(),
  };
}

/** Full setup of every existing book, for the "copy from a book" picker. */
export async function listProjectSetups(): Promise<
  { id: string; label: string; setup: ProjectInput }[]
> {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  return rows.map((p) => ({
    id: p.id,
    label: p.recommendedTitle || p.title || "Untitled book",
    setup: {
      title: p.title,
      idea: p.idea,
      theme: p.theme,
      genre: p.genre,
      kind: p.kind,
      audience: p.audience,
      tone: p.tone,
      style: p.style,
      readingLevel: p.readingLevel,
      include: p.include,
      avoid: p.avoid,
      notes: p.notes,
      inspiration: p.inspiration,
      goals: p.goals,
      bookType: p.bookType,
      chapterCount: p.chapterCount,
      minWords: p.minWords,
      maxWords: p.maxWords,
      narrativeStyle: p.narrativeStyle,
      pov: p.pov,
      publishFormat: p.publishFormat,
      seriesName: p.seriesName,
      styleNotes: p.styleNotes,
    },
  }));
}

/** Existing series names + a sibling's style, so a new book in the series matches. */
export async function getSeriesInfo(): Promise<{
  names: string[];
  styles: Record<string, Partial<ProjectInput>>;
}> {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id, seriesName: { not: "" } },
    orderBy: { updatedAt: "desc" },
  });
  const names: string[] = [];
  const styles: Record<string, Partial<ProjectInput>> = {};
  for (const p of rows) {
    if (names.includes(p.seriesName)) continue;
    names.push(p.seriesName);
    styles[p.seriesName] = {
      kind: p.kind,
      genre: p.genre,
      bookType: p.bookType,
      audience: p.audience,
      tone: p.tone,
      style: p.style,
      readingLevel: p.readingLevel,
      narrativeStyle: p.narrativeStyle,
      pov: p.pov,
      theme: p.theme,
      styleNotes: p.styleNotes,
    };
  }
  return { names, styles };
}

export async function createProject(input: ProjectInput) {
  const author = await getAuthor();
  const count = await prisma.project.count();
  const project = await prisma.project.create({
    data: {
      authorId: author.id,
      ...input,
      estTotalWords: Math.round(
        ((input.minWords + input.maxWords) / 2) * input.chapterCount,
      ),
      coverAccent: ACCENTS[count % ACCENTS.length],
    },
  });
  revalidatePath("/studio");
  redirect(`/studio/book/${project.id}/blueprint`);
}

export async function listProjectsBrief() {
  const author = await getAuthor();
  const projects = await prisma.project.findMany({
    where: { authorId: author.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, recommendedTitle: true, status: true },
    take: 30,
  });
  return projects.map((p) => ({
    id: p.id,
    title: p.recommendedTitle || p.title,
    status: p.status,
  }));
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  await prisma.project.update({ where: { id }, data });
  revalidatePath(`/studio/book/${id}`, "layout");
}

/** Edits the Step 1/2 setup fields after creation and recomputes the estimate. */
export async function updateProjectSetup(id: string, input: Partial<ProjectInput>) {
  const data: Record<string, unknown> = { ...input };
  if (
    input.minWords !== undefined ||
    input.maxWords !== undefined ||
    input.chapterCount !== undefined
  ) {
    const current = await prisma.project.findUniqueOrThrow({
      where: { id },
      select: { minWords: true, maxWords: true, chapterCount: true },
    });
    const minWords = input.minWords ?? current.minWords;
    const maxWords = input.maxWords ?? current.maxWords;
    const chapterCount = input.chapterCount ?? current.chapterCount;
    data.estTotalWords = Math.round(((minWords + maxWords) / 2) * chapterCount);
  }
  await prisma.project.update({ where: { id }, data });
  revalidatePath(`/studio/book/${id}`, "layout");
  return { ok: true };
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/studio");
}

export async function duplicateProject(id: string) {
  const src = await prisma.project.findUniqueOrThrow({
    where: { id },
    include: { chapters: true, memory: true },
  });
  const author = await getAuthor();
  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = src;
  const copy = await prisma.project.create({
    data: {
      ...rest,
      authorId: author.id,
      title: `${src.title} (copy)`,
      chapters: {
        create: src.chapters.map((c) => ({
          order: c.order,
          title: c.title,
          summary: c.summary,
          status: "planned",
          minWords: c.minWords,
          maxWords: c.maxWords,
          matterType: c.matterType,
        })),
      },
      memory: {
        create: src.memory.map((m) => ({
          kind: m.kind,
          title: m.title,
          body: m.body,
          dataJson: m.dataJson,
          pinned: m.pinned,
          order: m.order,
        })),
      },
    },
  });
  revalidatePath("/studio");
  redirect(`/studio/book/${copy.id}/blueprint`);
}
