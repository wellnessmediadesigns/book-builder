"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeWithFallback, aiChainReady } from "@/lib/ai/context";
import { AiError } from "@/lib/ai/providers";
import { directionMessages, brainstormSetupMessages } from "@/lib/ai/prompts";
import { generateBlueprint, autoWriteChapter, generateBrandIdentity } from "@/lib/actions/ai";
import { buildSocialFromBrainstorm } from "@/lib/actions/social";
import type { ProjectInput } from "@/lib/actions/projects";
import { parseDirection, parseDismissed, bulletId, type Direction } from "@/lib/brainstorm";
import { NEWSLETTER_LENGTHS, NEWSLETTER_DEFAULTS } from "@/lib/newsletter";

const ACCENTS = ["brass", "muse", "sage"];

export type SessionBrief = {
  id: string;
  title: string;
  status: string;
  mode: string;
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

const MODES = new Set(["book", "newsletter", "brand", "social"]);

export async function createSession(mode: string = "book"): Promise<void> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.create({
    data: { authorId: author.id, mode: MODES.has(mode) ? mode : "book" },
  });
  revalidatePath("/studio/brainstorm");
  redirect(`/studio/brainstorm/${session.id}`);
}

export async function listSessions(mode?: string): Promise<SessionBrief[]> {
  const author = await getAuthor();
  const rows = await prisma.brainstormSession.findMany({
    where: { authorId: author.id, ...(mode ? { mode } : {}) },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    mode: s.mode,
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
  const author = await getAuthor();
  const s = await prisma.brainstormSession.findUnique({ where: { id }, select: { authorId: true } });
  if (!s || s.authorId !== author.id) return;
  await prisma.brainstormSession.delete({ where: { id } });
  revalidatePath("/studio/brainstorm");
  revalidatePath("/studio/newsletters");
}

/** Persists a manual ordering of the author's sessions. */
export async function reorderSessions(ids: string[]): Promise<void> {
  const author = await getAuthor();
  const owned = await prisma.brainstormSession.findMany({
    where: { id: { in: ids }, authorId: author.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((o) => o.id));
  await Promise.all(
    ids.filter((id) => ownedIds.has(id)).map((id, i) =>
      prisma.brainstormSession.update({ where: { id }, data: { order: i } }),
    ),
  );
  revalidatePath("/studio/brainstorm");
  revalidatePath("/studio/newsletters");
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
  const dismissed = parseDismissed(session.dismissedJson);
  const dismissedSet = new Set(dismissed.map((d) => d.toLowerCase()));
  const transcript = session.messages
    .map((m) => `${m.role === "user" ? "Author" : "Muse"}: ${m.content}`)
    .join("\n");

  try {
    const { text } = await completeWithFallback(
      directionMessages({ title: existing.title, bullets: existing.bullets.map((b) => b.text) }, transcript),
    );
    const raw = parseJson(text) as { title?: string; newPoints?: unknown; bullets?: unknown };
    // Accept either the new `newPoints` shape or a legacy `bullets` array — both
    // are treated as points to ADD. We never remove or rewrite existing points.
    const candidates = Array.isArray(raw.newPoints)
      ? raw.newPoints
      : Array.isArray(raw.bullets)
        ? raw.bullets
        : [];
    const seen = new Set(existing.bullets.map((b) => b.text.trim().toLowerCase()));
    const additions = candidates
      .map((p) => String(p).slice(0, 240).trim())
      // never re-add a point the author deliberately removed
      .filter((t) => t && !seen.has(t.toLowerCase()) && !dismissedSet.has(t.toLowerCase()))
      // de-dupe within the batch too
      .filter((t, i, a) => a.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
      .map((t) => ({ id: bulletId(), text: t }));

    const merged = [...existing.bullets, ...additions].slice(0, 24);
    // Title sticks once set; only fill it in when we don't have one yet.
    const title = existing.title.trim() || String(raw.title ?? "").slice(0, 140);
    const direction: Direction = { title, bullets: merged };

    // Safety: never write an empty direction over a non-empty saved one.
    if (merged.length === 0 && existing.bullets.length > 0) {
      return { ok: true, direction: existing };
    }

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

/** Records a topic the author removed so it never returns: it's filtered out of
 *  the additive refresh and excluded (added to `avoid`) from the built work. */
export async function dismissPoint(sessionId: string, text: string): Promise<void> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.findUnique({
    where: { id: sessionId },
    select: { authorId: true, dismissedJson: true },
  });
  if (!session || session.authorId !== author.id) return;
  const clean = String(text ?? "").slice(0, 240).trim();
  if (!clean) return;
  const dismissed = parseDismissed(session.dismissedJson);
  if (dismissed.some((d) => d.toLowerCase() === clean.toLowerCase())) return;
  const next = [...dismissed, clean].slice(-40);
  await prisma.brainstormSession.update({
    where: { id: sessionId },
    data: { dismissedJson: JSON.stringify(next) },
  });
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
  const dismissed = parseDismissed(session.dismissedJson);
  const transcript = session.messages
    .map((m) => `${m.role === "user" ? "Author" : "Muse"}: ${m.content}`)
    .join("\n");

  const newsletter = session.mode === "newsletter";

  // Social posts build into a SocialPost (not a Project) — delegate.
  if (session.mode === "social") {
    return buildSocialFromBrainstorm(sessionId);
  }

  // Brands don't produce chapters/issues — they build a reusable identity and
  // seed Brand identity memory, then land on the brand profile.
  if (session.mode === "brand") {
    const title = direction.title?.trim() || "Untitled brand";
    const live = session.builtProjectId
      ? await prisma.project.findFirst({
          where: { id: session.builtProjectId, authorId: author.id, deletedAt: null },
          select: { id: true },
        })
      : null;
    let brandId: string;
    if (live) {
      await prisma.project.update({ where: { id: live.id }, data: { title } });
      brandId = live.id;
    } else {
      const count = await prisma.project.count();
      const created = await prisma.project.create({
        data: {
          authorId: author.id,
          title,
          workType: "brand",
          bookType: "Brand",
          coverAccent: ACCENTS[count % ACCENTS.length],
        },
      });
      brandId = created.id;
    }
    const res = await generateBrandIdentity(brandId, {
      direction: { title: direction.title, bullets: direction.bullets.map((b) => b.text) },
      transcript,
      dismissed,
    });
    if (res && !res.ok) return { ok: false, error: res.error };
    await prisma.brainstormSession.update({
      where: { id: sessionId },
      data: { status: "built", builtProjectId: brandId },
    });
    revalidatePath("/studio/brands");
    redirect(`/studio/brands/${brandId}`);
  }

  let raw: Record<string, unknown>;
  try {
    const { text } = await completeWithFallback(
      brainstormSetupMessages(
        { title: direction.title, bullets: direction.bullets.map((b) => b.text) },
        transcript,
        dismissed,
        { newsletter },
      ),
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
  // Newsletters are SHORT + FEW; books keep their generous ranges.
  const [nlMin, nlMax] = NEWSLETTER_LENGTHS[NEWSLETTER_DEFAULTS.length];
  const minWords = newsletter
    ? Math.max(150, Math.min(nlMax, num("minWords", nlMin)))
    : num("minWords", 1200);
  const maxWords = newsletter
    ? Math.min(nlMax, Math.max(minWords, num("maxWords", nlMax)))
    : Math.max(minWords, num("maxWords", 2500));
  // Always carry the author's removed topics into `avoid` so generation steers
  // clear of them (contextBlock injects "Must avoid: …" into every prompt).
  const avoid = [str("avoid"), ...dismissed]
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, a) => a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i)
    .join("; ");
  const input: ProjectInput = {
    title: str("title", direction.title || (newsletter ? "Untitled Newsletter" : "Untitled Book")),
    idea: str("idea"),
    theme: str("theme"),
    genre: str("genre"),
    kind: newsletter
      ? "nonfiction"
      : str("kind", "nonfiction").toLowerCase().includes("fic") && !str("kind").toLowerCase().includes("non") ? "fiction" : str("kind", "nonfiction"),
    audience: str("audience"),
    tone: str("tone", "Warm & encouraging"),
    style: str("style"),
    readingLevel: str("readingLevel", "General adult"),
    include: str("include"),
    avoid,
    notes: "",
    inspiration: "",
    goals: str("goals"),
    bookType: newsletter ? "Newsletter" : str("bookType", "Self-help"),
    chapterCount: newsletter
      ? Math.min(NEWSLETTER_DEFAULTS.maxIssues, Math.max(NEWSLETTER_DEFAULTS.minIssues, num("chapterCount", NEWSLETTER_DEFAULTS.issueCount)))
      : Math.min(40, Math.max(1, num("chapterCount", 10))),
    minWords,
    maxWords,
    narrativeStyle: str("narrativeStyle"),
    pov: str("pov"),
    publishFormat: newsletter ? "Email" : "Ebook + Print",
    seriesName: "",
    styleNotes: "",
    workType: newsletter ? "newsletter" : "book",
    cadence: newsletter ? (str("cadence", "weekly").toLowerCase() || "weekly") : "",
  };

  const estTotalWords = Math.round(((minWords + maxWords) / 2) * input.chapterCount);

  // Rebuild the SAME project in place when this session already produced one
  // that's still live — never create a duplicate. Otherwise create a new one.
  const existing = session.builtProjectId
    ? await prisma.project.findFirst({
        where: { id: session.builtProjectId, authorId: author.id, deletedAt: null },
        select: { id: true },
      })
    : null;

  let projectId: string;
  if (existing) {
    await prisma.project.update({
      where: { id: existing.id },
      data: { ...input, estTotalWords },
    });
    projectId = existing.id;
    // Preserve anything the author has already written; refresh the plan around it.
    await generateBlueprint(projectId, { preserveWritten: true }).catch(() => {});
  } else {
    const count = await prisma.project.count();
    const project = await prisma.project.create({
      data: {
        authorId: author.id,
        ...input,
        estTotalWords,
        coverAccent: ACCENTS[count % ACCENTS.length],
      },
    });
    projectId = project.id;
    await generateBlueprint(projectId).catch(() => {});
  }

  await prisma.brainstormSession.update({
    where: { id: sessionId },
    data: { status: "built", builtProjectId: projectId },
  });
  revalidatePath(newsletter ? "/studio/newsletters" : "/studio");

  // A newsletter should hand back a finished, send-ready issue — not an empty
  // plan. Write any still-empty issue inline, then land on it in the editor.
  if (newsletter) {
    const issues = await prisma.chapter.findMany({
      where: { projectId, matterType: null },
      orderBy: { order: "asc" },
      select: { id: true, wordCount: true },
    });
    for (const issue of issues) {
      if (issue.wordCount === 0) {
        await autoWriteChapter(issue.id, { summarize: true }).catch(() => {});
      }
    }
    const landing = issues[0]?.id;
    redirect(`/studio/book/${projectId}/write${landing ? `?chapter=${landing}` : ""}`);
  }
  redirect(`/studio/book/${projectId}/blueprint`);
}
