import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAiConfig, buildBookContext } from "@/lib/ai/context";
import { stream, configIsReady, AiError } from "@/lib/ai/providers";
import { chapterMessages, continueChapterMessages } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { chapterId, mode } = (await req.json()) as {
    chapterId: string;
    mode: "generate" | "continue";
  };

  const config = await resolveAiConfig();
  if (!configIsReady(config)) {
    return new Response(JSON.stringify({ error: "no_key" }), {
      status: 428,
      headers: { "Content-Type": "application/json" },
    });
  }

  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return new Response("Not found", { status: 404 });
  if (chapter.locked) {
    return new Response(JSON.stringify({ error: "locked" }), {
      status: 423,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ctx = await buildBookContext(chapter.projectId, chapter.order);
  const messages =
    mode === "continue"
      ? continueChapterMessages(ctx, chapter.contentText, {
          title: chapter.title,
          summary: chapter.summary,
          maxWords: chapter.maxWords || 2000,
        })
      : chapterMessages(ctx, {
          title: chapter.title,
          summary: chapter.summary,
          minWords: chapter.minWords || 1000,
          maxWords: chapter.maxWords || 2000,
        });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of stream(config, messages)) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch (e) {
        const msg = e instanceof AiError ? e.message : "Generation failed.";
        controller.enqueue(encoder.encode(`\n\n[[QUIRE_ERROR]]${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
