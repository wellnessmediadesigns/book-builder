"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeWithFallback, aiChainReady } from "@/lib/ai/context";
import { AiError } from "@/lib/ai/providers";
import { directionMessages, brainstormSetupMessages } from "@/lib/ai/prompts";
import { generateBlueprint } from "@/lib/actions/ai";
import type { ProjectInput } from "@/lib/actions/projects";
import { parseDirection, bulletId, type Direction } from "@/lib/brainstorm";

const ACCENTS = ["brass", "muse", "sage"];

export type SessionBrief = {
  id: string;
  title: string;
  status: string;
  builtProjectId: string | null;
  directionCount: number;
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
  const session = await prisma.brainstormSession.create({ data: { authorId: author.id } });
  revalidatePath("/studio/brainstorm");
  redirect(`/studio/brainstorm/${session.id}`);
}

export async function listSessions(): Promise<SessionBrief[]> {
  const author = await getAuthor();
  const rows = await prisma.brainstormSession.findMany({
    where: { authorId: author.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    builtProjectId: s.builtProjectId,
    directionCount: parseDirection(s.directionJson).bullets.length,
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

// ————————————————————————————————————————————— Direction

/** Re-derives the agreed direction from the conversation (AI), persists, returns it. */
export async function refreshDirection(
  sessionId: string,
): Promise<{ ok: true; direction: Direction } | { ok: false; error: string }> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.authorId !== author.id) return { ok: false, error: "Session not found." };
  if (session.messages.length === 0) return { ok: true, direction: parseDirection(session.directionJson) };
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };

  const existing = parseDirection(session.directionJson);
  const transcript = session.messages
    .map((m) => `${m.role === "user" ? "Author" : "Muse"}: ${m.content}`)
    .join("\n");

  try {
    const { text } = await completeWithFallback(
      directionMessages({ title: existing.title, bullets: existing.bullets.map((b) => b.text) }, transcript),
    );
    const raw = parseJson(text) as { title?: string; bullets?: unknown };
    const bullets = Array.isArray(raw.bullets)
      ? raw.bullets.map((b) => ({ id: bulletId(), text: String(b).slice(0, 240) })).filter((b) => b.text.trim()).slice(0, 12)
      : existing.bullets;
    const direction: Direction = { title: String(raw.title ?? existing.title).slice(0, 140), bullets };
    await prisma.brainstormSession.update({
      where: { id: sessionId },
      data: { directionJson: JSON.stringify(direction) },
    });
    revalidatePath(`/studio/brainstorm/${sessionId}`);
    return { ok: true, direction };
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Couldn't update the direction.";
    // Keep the previous direction on failure.
    return err === "no_key" ? { ok: false, error: "no_key" } : { ok: false, error: err };
  }
}

/** Persists the author's manual edits to the direction. */
export async function setDirection(sessionId: string, direction: Direction): Promise<void> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.findUnique({ where: { id: sessionId }, select: { authorId: true } });
  if (!session || session.authorId !== author.id) return;
  const clean: Direction = {
    title: (direction.title ?? "").slice(0, 140),
    bullets: (direction.bullets ?? [])
      .map((b) => ({ id: String(b.id || bulletId()), text: String(b.text ?? "").slice(0, 240) }))
      .filter((b) => b.text.trim())
      .slice(0, 20),
  };
  await prisma.brainstormSession.update({ where: { id: sessionId }, data: { directionJson: JSON.stringify(clean) } });
  revalidatePath(`/studio/brainstorm/${sessionId}`);
}

// ————————————————————————————————————————————— Build this book

/** Turns the session's agreed direction (+ transcript) into a real project,
 *  generates its blueprint, and redirects into the normal book flow. */
export async function buildBookFromBrainstorm(
  sessionId: string,
): Promise<{ ok: false; error: string } | void> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.authorId !== author.id) return { ok: false, error: "Session not found." };
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };

  const direction = parseDirection(session.directionJson);
  const transcript = session.messages
    .map((m) => `${m.role === "user" ? "Author" : "Muse"}: ${m.content}`)
    .join("\n");

  let raw: Record<string, unknown>;
  try {
    const { text } = await completeWithFallback(
      brainstormSetupMessages({ title: direction.title, bullets: direction.bullets.map((b) => b.text) }, transcript),
    );
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
    title: str("title", direction.title || "Untitled Book"),
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

  await generateBlueprint(project.id).catch(() => {});

  await prisma.brainstormSession.update({
    where: { id: sessionId },
    data: { status: "built", builtProjectId: project.id },
  });
  revalidatePath("/studio");
  redirect(`/studio/book/${project.id}/blueprint`);
}
