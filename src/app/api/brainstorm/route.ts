import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { streamWithFallback, aiChainReady } from "@/lib/ai/context";
import { AiError } from "@/lib/ai/providers";
import { brainstormMessages } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { sessionId, message } = (await req.json()) as {
    sessionId: string;
    message: string;
  };

  if (!sessionId || !message?.trim()) {
    return new Response("Bad request", { status: 400 });
  }
  if (!(await aiChainReady())) {
    return new Response(JSON.stringify({ error: "no_key" }), {
      status: 428,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await prisma.brainstormSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return new Response("Not found", { status: 404 });

  const history = session.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Persist the author's turn; auto-title the session from the first message.
  await prisma.brainstormMessage.create({
    data: { sessionId, role: "user", content: message.trim() },
  });
  const firstTurn = session.messages.length === 0;
  if (firstTurn && (session.title === "New brainstorm" || !session.title.trim())) {
    await prisma.brainstormSession.update({
      where: { id: sessionId },
      data: { title: message.trim().replace(/\s+/g, " ").slice(0, 60) },
    });
  }

  const messages = brainstormMessages(history, message.trim());
  const encoder = new TextEncoder();
  let full = "";

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamWithFallback(messages)) {
          full += delta;
          controller.enqueue(encoder.encode(delta));
        }
      } catch (e) {
        const msg = e instanceof AiError ? e.message : "Brainstorm failed.";
        controller.enqueue(encoder.encode(`\n\n[[QUIRE_ERROR]]${msg}`));
      } finally {
        // Persist the assistant turn (if any) and bump recency.
        if (full.trim()) {
          await prisma.brainstormMessage
            .create({ data: { sessionId, role: "assistant", content: full.trim() } })
            .catch(() => {});
        }
        await prisma.brainstormSession
          .update({ where: { id: sessionId }, data: { updatedAt: new Date() } })
          .catch(() => {});
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
