import { notFound } from "next/navigation";
import { prisma, getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { BrainstormBoard } from "@/components/studio/brainstorm-board";
import { listSessions } from "@/lib/actions/brainstorm";
import { parseDirection } from "@/lib/brainstorm";
import { aiStatus } from "@/lib/actions/ai";

export const dynamic = "force-dynamic";

export default async function BrainstormSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const author = await getAuthor();
  const session = await prisma.brainstormSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.authorId !== author.id) notFound();

  const [sessions, status] = await Promise.all([listSessions(), aiStatus()]);

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <BrainstormBoard
        session={{
          id: session.id,
          title: session.title,
          status: session.status,
          builtProjectId: session.builtProjectId,
          mode: session.mode,
        }}
        sessions={sessions}
        aiReady={status.ready}
        initialMessages={session.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
        initialDirection={parseDirection(session.directionJson)}
      />
    </>
  );
}
