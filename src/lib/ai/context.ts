import { prisma, getAuthor } from "@/lib/db";
import type { AiConfig, AiMessage } from "./types";
import type { BookContext } from "./prompts";
import { complete, stream, configIsReady, AiError } from "./providers";

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

/** Resolves the optional fallback config, or null when disabled. */
export async function resolveFallbackConfig(): Promise<AiConfig | null> {
  const author = await getAuthor();
  const s = author.settings;
  const provider = s?.fallbackProvider as AiConfig["provider"] | undefined;
  if (!provider) return null;
  return {
    provider,
    model: s?.fallbackModel || "",
    apiKey: s?.fallbackApiKey || "",
    baseUrl: s?.fallbackBaseUrl || "",
    temperature: s?.temperature ?? 0.7,
    maxContext: s?.maxContext ?? 8000,
  };
}

/** Ordered list of ready configs: [primary, fallback?]. */
export async function resolveAiChain(): Promise<AiConfig[]> {
  const [primary, fallback] = await Promise.all([resolveAiConfig(), resolveFallbackConfig()]);
  return [primary, fallback].filter((c): c is AiConfig => !!c && configIsReady(c));
}

export async function aiChainReady(): Promise<boolean> {
  return (await resolveAiChain()).length > 0;
}

/** Non-streaming completion that tries the primary, then the fallback, on failure. */
export async function completeWithFallback(
  messages: AiMessage[],
): Promise<{ text: string; config: AiConfig }> {
  const chain = await resolveAiChain();
  if (chain.length === 0) throw new AiError("no_key", "no_key");
  let lastErr: unknown;
  for (const config of chain) {
    try {
      const text = await complete(config, messages);
      return { text, config };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new AiError("Generation failed.");
}

/** Streaming completion that falls back if the primary fails on connect. */
export async function* streamWithFallback(messages: AiMessage[]): AsyncGenerator<string> {
  const chain = await resolveAiChain();
  if (chain.length === 0) throw new AiError("no_key", "no_key");

  for (let i = 0; i < chain.length; i++) {
    const gen = stream(chain[i], messages);
    let first: IteratorResult<string>;
    try {
      first = await gen.next();
    } catch (e) {
      if (i < chain.length - 1) continue; // try fallback
      throw e;
    }
    if (!first.done) yield first.value;
    // Once streaming has begun we can't fall back mid-stream; surface any error.
    while (true) {
      const n = await gen.next();
      if (n.done) break;
      yield n.value;
    }
    return;
  }
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
