"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NEWSLETTER_LENGTHS } from "@/lib/newsletter";
import { generateBlueprint, autoWriteChapter, generateBrandIdentity } from "@/lib/actions/ai";

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
  workType?: string; // "book" (default) | "newsletter"
  cadence?: string; // newsletters: weekly | biweekly | monthly
  authorName?: string; // per-book byline / pen name; blank = account name
};

const ACCENTS = ["brass", "muse", "sage"];

/** The most-recently-touched work + chapter/issue, for a dashboard "Continue" card. */
export async function getResumeTarget(workType: string = "book"): Promise<{
  projectId: string;
  bookTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  href: string;
  updatedAt: string;
} | null> {
  const author = await getAuthor();
  const project = await prisma.project.findFirst({
    where: { authorId: author.id, status: { not: "draft" }, deletedAt: null, workType },
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

/** Best-guess "what it's about" for the copy-setup picker: prefer the real idea,
 *  else compose one from the book's positioning / reader promise / theme so the
 *  copied draft is never blank. */
function bestGuessIdea(p: {
  idea: string;
  positioning: string;
  readerPromise: string;
  theme: string;
  audience: string;
  bookType: string;
  kind: string;
}): string {
  if (p.idea.trim()) return p.idea.trim();
  const rich = [p.positioning, p.readerPromise].map((s) => s.trim()).filter(Boolean);
  if (rich.length) return rich.join(" ");
  const parts: string[] = [];
  if (p.theme) parts.push(`exploring ${p.theme}`);
  if (p.audience) parts.push(`for ${p.audience}`);
  const kind = p.kind && p.kind !== "nonfiction" ? p.kind : "";
  const lead = `A ${[kind, p.bookType || "book"].filter(Boolean).join(" ")}`;
  return `${lead}${parts.length ? ` ${parts.join(" ")}` : ""}.`.trim();
}

/** Full setup of every existing book, for the "copy from a book" picker. */
export async function listProjectSetups(): Promise<
  { id: string; label: string; setup: ProjectInput }[]
> {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null, workType: "book" },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  return rows.map((p) => ({
    id: p.id,
    label: p.recommendedTitle || p.title || "Untitled book",
    setup: {
      title: p.title,
      idea: bestGuessIdea(p),
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
      authorName: p.authorName,
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
    where: { authorId: author.id, seriesName: { not: "" }, deletedAt: null },
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

/** Newsletter publications (brands) for the Newsletters home. */
export async function listPublications() {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null, workType: "newsletter" },
    orderBy: { updatedAt: "desc" },
    include: { chapters: { where: { matterType: null }, select: { wordCount: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.recommendedTitle || p.title,
    status: p.status,
    coverAccent: p.coverAccent,
    audience: p.audience,
    updatedAt: p.updatedAt.toISOString(),
    issueCount: p.chapters.length,
    written: p.chapters.filter((c) => c.wordCount > 0).length,
    words: p.chapters.reduce((s, c) => s + c.wordCount, 0),
  }));
}

/** Brands (a Project with workType "brand") for the Brands home. */
export async function listBrands() {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null, workType: "brand" },
    orderBy: { updatedAt: "desc" },
    include: { memory: { select: { id: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.recommendedTitle || p.title,
    status: p.status,
    coverAccent: p.coverAccent,
    positioning: p.positioning,
    audience: p.audience,
    updatedAt: p.updatedAt.toISOString(),
    points: p.memory.length,
  }));
}

/** Creates a brand (a Project with workType "brand"), generates its identity, lands on the profile. */
export async function createBrand(input: {
  name: string;
  about: string;
  audience: string;
  styleNotes?: string;
}) {
  const author = await getAuthor();
  const count = await prisma.project.count();
  const project = await prisma.project.create({
    data: {
      authorId: author.id,
      title: input.name.trim() || "Untitled brand",
      idea: input.about,
      audience: input.audience,
      styleNotes: input.styleNotes || "",
      workType: "brand",
      bookType: "Brand",
      coverAccent: ACCENTS[count % ACCENTS.length],
    },
  });
  await generateBrandIdentity(project.id).catch(() => {});
  revalidatePath("/studio/brands");
  redirect(`/studio/brands/${project.id}`);
}

/** Creates a newsletter brand (a Project with workType "newsletter") + lands on the plan. */
export async function createNewsletter(input: {
  name: string;
  about: string;
  audience: string;
  tone: string;
  styleNotes: string;
  issueLength: "short" | "standard" | "long";
  plannedIssues: number;
  cadence?: string;
}) {
  const [minWords, maxWords] = NEWSLETTER_LENGTHS[input.issueLength] ?? NEWSLETTER_LENGTHS.short;
  const full: ProjectInput = {
    title: input.name.trim() || "Untitled newsletter",
    idea: input.about,
    theme: "",
    genre: "",
    kind: "nonfiction",
    audience: input.audience,
    tone: input.tone || "Warm, clear, direct",
    style: "",
    readingLevel: "General adult",
    include: "",
    avoid: "",
    notes: "",
    inspiration: "",
    goals: "",
    bookType: "Newsletter",
    chapterCount: Math.min(24, Math.max(1, input.plannedIssues || 6)),
    minWords,
    maxWords,
    narrativeStyle: "",
    pov: "",
    publishFormat: "Email",
    seriesName: "",
    styleNotes: input.styleNotes || "",
    workType: "newsletter",
    cadence: input.cadence || "weekly",
  };

  const author = await getAuthor();
  const count = await prisma.project.count();
  const project = await prisma.project.create({
    data: {
      authorId: author.id,
      ...full,
      estTotalWords: Math.round(((full.minWords + full.maxWords) / 2) * full.chapterCount),
      coverAccent: ACCENTS[count % ACCENTS.length],
    },
  });

  // Hand back a finished, send-ready newsletter: build the plan, then write the
  // first issue so the author lands on real content, not an empty outline.
  await generateBlueprint(project.id).catch(() => {});
  const first = await prisma.chapter.findFirst({
    where: { projectId: project.id, matterType: null },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  if (first) await autoWriteChapter(first.id, { summarize: true }).catch(() => {});

  revalidatePath("/studio/newsletters");
  redirect(first ? `/studio/book/${project.id}/write?chapter=${first.id}` : `/studio/book/${project.id}/blueprint`);
}

export async function listProjectsBrief() {
  const author = await getAuthor();
  const projects = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null, workType: "book" },
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

/** Soft-delete: moves the book to Trash (restorable) rather than erasing it. */
export async function deleteProject(id: string) {
  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/studio");
  revalidatePath("/studio/trash");
}

export async function restoreProject(id: string) {
  await prisma.project.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/studio");
  revalidatePath("/studio/trash");
}

/** Permanently removes a trashed book (cascades to its chapters/memory). */
export async function purgeProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/studio/trash");
}

export async function listTrashed(workType?: string) {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: { not: null }, ...(workType ? { workType } : {}) },
    orderBy: { deletedAt: "desc" },
    include: { chapters: { where: { matterType: null }, select: { wordCount: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    title: p.recommendedTitle || p.title,
    bookType: p.bookType,
    workType: p.workType,
    deletedAt: (p.deletedAt ?? new Date()).toISOString(),
    chapterCount: p.chapters.length,
    words: p.chapters.reduce((s, c) => s + c.wordCount, 0),
  }));
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
