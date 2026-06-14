import { redirect } from "next/navigation";
import { prisma, getAuthor } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Creates a brainstorm session (book or newsletter mode) and redirects into it.
 *  Done inline (no revalidatePath, which isn't allowed during render). */
export default async function NewBrainstormPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const author = await getAuthor();
  const session = await prisma.brainstormSession.create({
    data: { authorId: author.id, mode: mode === "newsletter" ? "newsletter" : "book" },
  });
  redirect(`/studio/brainstorm/${session.id}`);
}
