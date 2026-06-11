import { prisma, getAuthor } from "@/lib/db";
import type { AiConfig } from "./types";
import type { BookContext } from "./prompts";

/** Resolve the active AI config from saved settings, falling back to server env defaults. */
export async function resolveAiConfig(): Promise<AiConfig> {
  const author = await getAuthor();
  const s = author.settings;
  const provider = (s?.provider as AiConfig["provider"]) || "workersai";
  return {
    provider,
    model: s?.model || process.env.QUIRE_DEFAULT_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    apiKey: s?.apiKey || process.env.QUIRE_DEFAULT_AI_KEY || "",
    baseUrl: s?.baseUrl || process.env.QUIRE_DEFAULT_AI_BASEURL || "",
    temperature: s?.temperature ?? 0.7,
    maxContext: s?.maxContext ?? 8000,
  };
}

/** Assemble continuity context for a project, optionally up to a given chapter order. */
export async function buildBookContext(
  projectId: string,
  beforeOrder?: number,
): Promise<BookContext> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      memory: { orderBy: [{ pinned: "desc" }, { order: "asc" }] },
      chapters: { orderBy: { order: "asc" } },
    },
  });

  const priorSummaries = project.chapters
    .filter((c) => c.matterType === null)
    .filter((c) => (beforeOrder === undefined ? true : c.order < beforeOrder))
    .filter((c) => c.summary || c.wordCount > 0)
    .map((c) => ({
      title: c.title,
      summary: c.summary || `${c.wordCount} words written.`,
    }));

  return {
    title: project.recommendedTitle || project.title,
    kind: project.kind,
    bookType: project.bookType,
    genre: project.genre,
    audience: project.audience,
    tone: project.tone,
    style: project.style,
    readingLevel: project.readingLevel,
    pov: project.pov,
    narrativeStyle: project.narrativeStyle,
    readerPromise: project.readerPromise,
    include: project.include,
    avoid: project.avoid,
    memory: project.memory.map((m) => ({ kind: m.kind, title: m.title, body: m.body })),
    priorSummaries,
  };
}
