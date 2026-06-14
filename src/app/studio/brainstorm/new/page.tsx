import { createSession } from "@/lib/actions/brainstorm";

export const dynamic = "force-dynamic";

/** Creates a brainstorm session (book or newsletter mode) and redirects into it. */
export default async function NewBrainstormPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  await createSession(mode === "newsletter" ? "newsletter" : "book");
  return null; // createSession redirects
}
