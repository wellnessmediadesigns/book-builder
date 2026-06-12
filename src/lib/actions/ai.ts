"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cleanChapterTitle } from "@/lib/utils";
import {
  resolveAiConfig,
  resolveFallbackConfig,
  buildBookContext,
  completeWithFallback,
  aiChainReady,
} from "@/lib/ai/context";
import { complete, configIsReady, AiError } from "@/lib/ai/providers";
import {
  blueprintMessages,
  selectionMessages,
  analysisMessages,
  summaryMessages,
  styleAnalysisMessages,
} from "@/lib/ai/prompts";

export type StyleAnalysis = {
  kind?: string;
  genre?: string;
  bookType?: string;
  audience?: string;
  tone?: string;
  style?: string;
  readingLevel?: string;
  narrativeStyle?: string;
  pov?: string;
  theme?: string;
  styleNotes?: string;
};

/** Reads a pasted writing sample and infers setup fields to match its style. */
export async function analyzeStyleSample(
  sample: string,
): Promise<{ ok: true; data: StyleAnalysis } | { ok: false; error: string }> {
  if (sample.trim().length < 120)
    return { ok: false, error: "Paste a bit more text (a few paragraphs works best)." };
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };
  try {
    const { text } = await completeWithFallback(styleAnalysisMessages(sample));
    let s = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return { ok: true, data: JSON.parse(s) as StyleAnalysis };
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Couldn't analyze the sample. Try again.";
    return { ok: false, error: err === "no_key" ? "no_key" : err };
  }
}

export async function aiStatus() {
  const config = await resolveAiConfig();
  const ready = await aiChainReady();
  return { ready, provider: config.provider, model: config.model };
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  // Tests the primary; the fallback is exercised automatically during real use.
  const config = await resolveAiConfig();
  if (!configIsReady(config)) return { ok: false, message: "Add a model and key first." };
  try {
    const reply = await complete(config, [
      { role: "user", content: "Reply with exactly the word: ready" },
    ]);
    return { ok: true, message: `Connected to ${config.model} — ${reply.slice(0, 40)}` };
  } catch (e) {
    const msg = e instanceof AiError ? e.message : "Connection failed.";
    return { ok: false, message: `${config.provider}/${config.model}: ${msg}` };
  }
}

export async function testFallback(): Promise<{ ok: boolean; message: string }> {
  const config = await resolveFallbackConfig();
  if (!config) return { ok: false, message: "No fallback configured." };
  if (!configIsReady(config)) return { ok: false, message: "Fallback needs a model and key." };
  try {
    const reply = await complete(config, [
      { role: "user", content: "Reply with exactly the word: ready" },
    ]);
    return { ok: true, message: `Fallback ${config.model} — ${reply.slice(0, 40)}` };
  } catch (e) {
    const msg = e instanceof AiError ? e.message : "Connection failed.";
    return { ok: false, message: `${config.provider}/${config.model}: ${msg}` };
  }
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function parseBlueprint(raw: string): Record<string, unknown> {
  let s = raw.trim();
  // tolerate accidental fences
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

export async function generateBlueprint(
  projectId: string,
): Promise<ActionResult<null>> {
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const ctx = await buildBookContext(projectId);
  ctx.priorSummaries = Array.from({ length: project.chapterCount }, (_, i) => ({
    title: `Chapter ${i + 1}`,
    summary: "",
  }));

  const extras = [project.notes, project.inspiration, project.goals]
    .filter(Boolean)
    .join("\n");

  const started = Date.now();
  let raw = "";
  let config;
  try {
    const res = await completeWithFallback(blueprintMessages(ctx, project.idea, extras));
    raw = res.text;
    config = res.config;
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Generation failed.";
    if (err === "no_key") return { ok: false, error: "no_key" };
    await logGen(projectId, "blueprint", await resolveAiConfig(), 0, "error", err);
    return { ok: false, error: err };
  }

  let bp: Record<string, unknown>;
  try {
    bp = parseBlueprint(raw);
  } catch {
    await logGen(projectId, "blueprint", config, raw.length, "error", "parse");
    return { ok: false, error: "The model returned an unexpected format. Try again." };
  }

  const toc = Array.isArray(bp.tableOfContents) ? bp.tableOfContents : [];
  const recommendedTitle = String(bp.recommendedTitle || project.title);
  const subtitle = String(bp.recommendedSubtitle || "");

  // Sequential writes (D1 has no interactive transactions).
  await prisma.project.update({
    where: { id: projectId },
    data: {
      blueprintJson: JSON.stringify(bp),
      recommendedTitle,
      subtitle,
      positioning: String(bp.positioning || ""),
      readerPromise: String(bp.readerPromise || ""),
      status: "blueprint",
    },
  });

  // Rebuild chapters from the table of contents.
  await prisma.chapter.deleteMany({ where: { projectId, matterType: null } });
  await prisma.chapter.createMany({
    data: toc.map((c, i) => {
      const ch = c as { title?: string; summary?: string };
      return {
        projectId,
        order: i,
        title: ch.title ? cleanChapterTitle(ch.title) : `Chapter ${i + 1}`,
        summary: ch.summary || "",
        minWords: project.minWords,
        maxWords: project.maxWords,
      };
    }),
  });

  // Seed Book Memory.
  await prisma.memoryEntry.deleteMany({ where: { projectId } });
  const mem: { kind: string; title: string; body: string; order: number }[] = [];
  let order = 0;
  const push = (kind: string, title: string, body: string) =>
    mem.push({ kind, title, body, order: order++ });

  if (bp.positioning) push("premise", "Positioning", String(bp.positioning));
  if (bp.readerPromise) push("reader-promise", "Reader promise", String(bp.readerPromise));
  if (bp.readerJourney) push("note", "Reader journey", String(bp.readerJourney));
  forEachStr(bp.styleGuide, (s, i) => push("style-rule", `Style ${i + 1}`, s));
  forEachStr(bp.toneGuide, (s, i) => push("tone-rule", `Tone ${i + 1}`, s));
  forEachStr(bp.continuityGuide, (s, i) => push("fact", `Continuity ${i + 1}`, s));
  forEachObj(bp.characters, (o) =>
    push("character", String(o.name || "Character"), String(o.description || o.role || "")),
  );
  forEachObj(bp.settings, (o) =>
    push("setting", String(o.name || "Setting"), String(o.description || "")),
  );
  forEachObj(bp.keyConcepts, (o) =>
    push("key-concept", String(o.name || "Concept"), String(o.description || "")),
  );

  if (mem.length)
    await prisma.memoryEntry.createMany({ data: mem.map((m) => ({ projectId, ...m })) });

  await logGen(projectId, "blueprint", config, raw.length, "ok", `${Date.now() - started}ms`);
  revalidatePath(`/studio/book/${projectId}`, "layout");
  return { ok: true, data: null };
}

export async function runSelectionCommand(
  chapterId: string,
  command: string,
  instruction: string,
  selectedText: string,
  surrounding: string,
): Promise<ActionResult<{ proposed: string }>> {
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };
  const chapter = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } });
  const ctx = await buildBookContext(chapter.projectId, chapter.order);
  const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
  try {
    const { text, config } = await completeWithFallback(
      selectionMessages(ctx, command, instruction, selectedText, surrounding),
    );
    let proposed = stripQuotes(text);
    // Some models play it safe and echo the input. Retry once, more forcefully.
    if (norm(proposed) === norm(selectedText)) {
      const retry = await completeWithFallback([
        ...selectionMessages(ctx, command, instruction, selectedText, surrounding),
        { role: "assistant", content: proposed },
        {
          role: "user",
          content:
            "That returned the passage essentially unchanged, which is not acceptable. Apply the requested change for real this time and output ONLY the rewritten passage.",
        },
      ]);
      const retryText = stripQuotes(retry.text);
      if (norm(retryText) !== norm(selectedText)) proposed = retryText;
    }
    await logGen(chapter.projectId, "selection", config, selectedText.length, "ok", command);
    return { ok: true, data: { proposed } };
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Revision failed.";
    return { ok: false, error: err === "no_key" ? "no_key" : err };
  }
}

/**
 * Distills a written chapter into a continuity summary, saving it to the chapter
 * and mirroring it into Book Memory so later chapters stay consistent with what
 * was actually written (not just the original outline). Best-effort.
 */
export async function summarizeChapter(
  chapterId: string,
): Promise<{ ok: boolean; summary?: string }> {
  if (!(await aiChainReady())) return { ok: false };
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter || !chapter.contentText.trim()) return { ok: false };

  try {
    const { text: raw } = await completeWithFallback(
      summaryMessages(chapter.title, chapter.contentText),
    );
    const summary = stripQuotes(raw).slice(0, 700);
    await prisma.chapter.update({ where: { id: chapterId }, data: { summary } });

    // Mirror into Book Memory as an editable chapter-summary entry (upsert by title).
    const memTitle = `Ch. ${chapter.order + 1}: ${chapter.title}`;
    const existing = await prisma.memoryEntry.findFirst({
      where: { projectId: chapter.projectId, kind: "chapter-summary", title: memTitle },
    });
    if (existing) {
      await prisma.memoryEntry.update({ where: { id: existing.id }, data: { body: summary } });
    } else {
      const max = await prisma.memoryEntry.aggregate({
        where: { projectId: chapter.projectId },
        _max: { order: true },
      });
      await prisma.memoryEntry.create({
        data: {
          projectId: chapter.projectId,
          kind: "chapter-summary",
          title: memTitle,
          body: summary,
          pinned: false,
          order: (max._max.order ?? 0) + 1,
        },
      });
    }
    return { ok: true, summary };
  } catch {
    return { ok: false };
  }
}

export async function runChapterAnalysis(
  chapterId: string,
  command: string,
): Promise<ActionResult<{ report: string }>> {
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };
  const chapter = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } });
  if (!chapter.contentText.trim())
    return { ok: false, error: "Write or generate this chapter first." };
  const ctx = await buildBookContext(chapter.projectId, chapter.order);
  try {
    const { text: report } = await completeWithFallback(
      analysisMessages(ctx, command, chapter.contentText),
    );
    return { ok: true, data: { report } };
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Analysis failed.";
    return { ok: false, error: err === "no_key" ? "no_key" : err };
  }
}

// ——— helpers ———
function stripQuotes(s: string) {
  return s.trim().replace(/^["“]|["”]$/g, "").trim();
}
function forEachStr(v: unknown, fn: (s: string, i: number) => void) {
  if (Array.isArray(v)) v.forEach((x, i) => typeof x === "string" && x && fn(x, i));
}
function forEachObj(v: unknown, fn: (o: Record<string, unknown>) => void) {
  if (Array.isArray(v))
    v.forEach((x) => x && typeof x === "object" && fn(x as Record<string, unknown>));
}
async function logGen(
  projectId: string,
  scope: string,
  config: { provider: string; model: string },
  outputChars: number,
  status: string,
  detail: string,
) {
  await prisma.generationLog
    .create({
      data: {
        projectId,
        scope,
        provider: config.provider,
        model: config.model,
        outputChars,
        status,
        detail,
      },
    })
    .catch(() => {});
}
