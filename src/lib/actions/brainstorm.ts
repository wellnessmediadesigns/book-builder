"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeWithFallback, aiChainReady } from "@/lib/ai/context";
import { AiError } from "@/lib/ai/providers";
import { ideaDistillMessages, brainstormSetupMessages } from "@/lib/ai/prompts";
import { generateBlueprint } from "@/lib/actions/ai";
import type { ProjectInput } from "@/lib/actions/projects";

const ACCENTS = ["brass", "muse", "sage"];

export type IdeaCardData = {
  id: string;
  title: string;
  note: string;
  kind: string;
  tags: string[];
  starred: boolean;
  order: number;
};

export type SessionBrief = {
  id: string;
  title: string;
  status: string;
  builtProjectId: string | null;
  ideaCount: number;
  snippet: string;
  updatedAt: string;
};

function parseJson(raw: string): Record<string, unknown> {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

// ————————————————————————————————————————————— Sessions

export async function createSession(): Promise<void> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.create({
    data: { authorId: author.id },
  });
  revalidatePath("/studio/brainstorm");
  redirect(`/studio/brainstorm/${session.id}`);
}

export async function listSessions(): Promise<SessionBrief[]> {
  const author = await getAuthor();
  const rows = await prisma.brainstormSession.findMany({
    where: { authorId: author.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { ideas: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    builtProjectId: s.builtProjectId,
    ideaCount: s._count.ideas,
    snippet: s.messages[0]?.content.slice(0, 120) ?? "",
    updatedAt: s.updatedAt.toISOString(),
  }));
}

export async function renameSession(id: string, title: string): Promise<void> {
  await prisma.brainstormSession.update({
    where: { id },
    data: { title: title.trim().slice(0, 120) || "New brainstorm" },
  });
  revalidatePath("/studio/brainstorm");
}

export async function deleteSession(id: string): Promise<void> {
  await prisma.brainstormSession.delete({ where: { id } });
  revalidatePath("/studio/brainstorm");
}

// ————————————————————————————————————————————— Ideas

function toIdeaData(c: {
  id: string;
  title: string;
  note: string;
  kind: string;
  tagsJson: string | null;
  starred: boolean;
  order: number;
}): IdeaCardData {
  let tags: string[] = [];
  if (c.tagsJson) {
    try {
      const parsed = JSON.parse(c.tagsJson);
      if (Array.isArray(parsed)) tags = parsed.map(String).slice(0, 6);
    } catch {
      /* ignore */
    }
  }
  return { id: c.id, title: c.title, note: c.note, kind: c.kind, tags, starred: c.starred, order: c.order };
}

async function nextOrder(sessionId: string): Promise<number> {
  const max = await prisma.ideaCard.aggregate({ where: { sessionId }, _max: { order: true } });
  return (max._max.order ?? -1) + 1;
}

async function touch(sessionId: string) {
  await prisma.brainstormSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
}

/** Distills a chunk of conversation text into a saved idea card via the AI. */
export async function saveIdeaFromText(
  sessionId: string,
  text: string,
): Promise<{ ok: true; idea: IdeaCardData } | { ok: false; error: string }> {
  if (!text.trim()) return { ok: false, error: "Nothing to save." };
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };

  let data: { title?: string; note?: string; kind?: string; tags?: unknown };
  try {
    const { text: out } = await completeWithFallback(ideaDistillMessages(text));
    data = parseJson(out);
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Couldn't save that idea. Try again.";
    return { ok: false, error: err === "no_key" ? "no_key" : err };
  }

  const tags = Array.isArray(data.tags) ? data.tags.map(String).slice(0, 6) : [];
  const card = await prisma.ideaCard.create({
    data: {
      sessionId,
      title: String(data.title || "Untitled idea").slice(0, 120),
      note: String(data.note || "").slice(0, 600),
      kind: String(data.kind || "concept"),
      tagsJson: JSON.stringify(tags),
      order: await nextOrder(sessionId),
    },
  });
  await touch(sessionId);
  revalidatePath(`/studio/brainstorm/${sessionId}`);
  return { ok: true, idea: toIdeaData(card) };
}

export async function addIdea(
  sessionId: string,
  input: { title: string; note?: string; kind?: string },
): Promise<IdeaCardData> {
  const card = await prisma.ideaCard.create({
    data: {
      sessionId,
      title: input.title.trim().slice(0, 120) || "Untitled idea",
      note: (input.note ?? "").slice(0, 600),
      kind: input.kind ?? "concept",
      tagsJson: "[]",
      order: await nextOrder(sessionId),
    },
  });
  await touch(sessionId);
  revalidatePath(`/studio/brainstorm/${sessionId}`);
  return toIdeaData(card);
}

export async function updateIdea(
  id: string,
  data: { title?: string; note?: string; kind?: string },
): Promise<void> {
  const card = await prisma.ideaCard.update({ where: { id }, data });
  revalidatePath(`/studio/brainstorm/${card.sessionId}`);
}

export async function toggleStar(id: string): Promise<void> {
  const card = await prisma.ideaCard.findUnique({ where: { id } });
  if (!card) return;
  await prisma.ideaCard.update({ where: { id }, data: { starred: !card.starred } });
  revalidatePath(`/studio/brainstorm/${card.sessionId}`);
}

export async function deleteIdea(id: string): Promise<{ ok: boolean }> {
  const card = await prisma.ideaCard.delete({ where: { id } });
  revalidatePath(`/studio/brainstorm/${card.sessionId}`);
  return { ok: true };
}

/** Re-creates a deleted idea (for the Undo toast). */
export async function restoreIdea(sessionId: string, data: IdeaCardData): Promise<IdeaCardData> {
  const card = await prisma.ideaCard.create({
    data: {
      sessionId,
      title: data.title,
      note: data.note,
      kind: data.kind,
      tagsJson: JSON.stringify(data.tags ?? []),
      starred: data.starred,
      order: data.order,
    },
  });
  revalidatePath(`/studio/brainstorm/${sessionId}`);
  return toIdeaData(card);
}

export async function reorderIdeas(sessionId: string, ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id, i) => prisma.ideaCard.update({ where: { id }, data: { order: i } })),
  );
  revalidatePath(`/studio/brainstorm/${sessionId}`);
}

// ————————————————————————————————————————————— Build this book

/** Turns the session's saved ideas + transcript into a real project, generates
 *  its blueprint, and redirects into the normal book flow. */
export async function buildBookFromBrainstorm(
  sessionId: string,
): Promise<{ ok: false; error: string } | void> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.findUnique({
    where: { id: sessionId },
    include: {
      ideas: { orderBy: [{ starred: "desc" }, { order: "asc" }] },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!session) return { ok: false, error: "Session not found." };
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };

  const transcript = session.messages
    .map((m) => `${m.role === "user" ? "Author" : "Muse"}: ${m.content}`)
    .join("\n");
  const ideas = session.ideas.map((i) => ({ title: i.title, note: i.note, starred: i.starred }));

  let raw: Record<string, unknown>;
  try {
    const { text } = await completeWithFallback(brainstormSetupMessages(ideas, transcript));
    raw = parseJson(text);
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Couldn't build the book. Try again.";
    return { ok: false, error: err === "no_key" ? "no_key" : err };
  }

  const str = (k: string, fallback = "") => String(raw[k] ?? fallback);
  const num = (k: string, fallback: number) => {
    const n = Number(raw[k]);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
  };
  const minWords = num("minWords", 1200);
  const maxWords = Math.max(minWords, num("maxWords", 2500));
  const input: ProjectInput = {
    title: str("title", session.ideas[0]?.title || "Untitled Book"),
    idea: str("idea"),
    theme: str("theme"),
    genre: str("genre"),
    kind: str("kind", "nonfiction").toLowerCase().includes("fic") && !str("kind").toLowerCase().includes("non") ? "fiction" : str("kind", "nonfiction"),
    audience: str("audience"),
    tone: str("tone", "Warm & encouraging"),
    style: str("style"),
    readingLevel: str("readingLevel", "General adult"),
    include: str("include"),
    avoid: str("avoid"),
    notes: "",
    inspiration: "",
    goals: str("goals"),
    bookType: str("bookType", "Self-help"),
    chapterCount: Math.min(40, Math.max(1, num("chapterCount", 10))),
    minWords,
    maxWords,
    narrativeStyle: str("narrativeStyle"),
    pov: str("pov"),
    publishFormat: "Ebook + Print",
    seriesName: "",
    styleNotes: "",
  };

  const count = await prisma.project.count();
  const project = await prisma.project.create({
    data: {
      authorId: author.id,
      ...input,
      estTotalWords: Math.round(((minWords + maxWords) / 2) * input.chapterCount),
      coverAccent: ACCENTS[count % ACCENTS.length],
    },
  });

  // Best-effort blueprint so the author lands on a populated page.
  await generateBlueprint(project.id).catch(() => {});

  await prisma.brainstormSession.update({
    where: { id: sessionId },
    data: { status: "built", builtProjectId: project.id },
  });
  revalidatePath("/studio");
  redirect(`/studio/book/${project.id}/blueprint`);
}
