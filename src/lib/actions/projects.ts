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
};

const ACCENTS = ["brass", "muse", "sage"];

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
