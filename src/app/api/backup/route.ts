import { zipSync, strToU8 } from "fflate";
import { prisma, getAuthor } from "@/lib/db";
import { assembleBookPackage } from "@/lib/export/assemble";
import { buildMarkdown } from "@/lib/export/manuscript";
import { getCover } from "@/lib/storage";
import { extForType, isCoverType } from "@/lib/covers";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** One-tap full-library backup: structured JSON + readable Markdown per book +
 *  any uploaded cover files, all in a single ZIP. */
export async function GET() {
  const author = await getAuthor();

  const projects = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      chapters: { orderBy: { order: "asc" } },
      memory: { orderBy: { order: "asc" } },
      covers: true,
    },
  });

  const brainstorms = await prisma.brainstormSession.findMany({
    where: { authorId: author.id },
    orderBy: { createdAt: "asc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      ideas: { orderBy: { order: "asc" } },
    },
  });

  const files: Record<string, Uint8Array> = {};

  // Structured, re-importable data export.
  files["library.json"] = strToU8(
    JSON.stringify(
      {
        app: "Quire",
        exportedAt: new Date().toISOString(),
        author: { name: author.name, email: author.email },
        books: projects,
        brainstorms,
      },
      null,
      2,
    ),
  );

  // Human-readable manuscript + covers per book.
  const used = new Set<string>();
  for (const p of projects) {
    let slug = slugify(p.recommendedTitle || p.title) || "book";
    while (used.has(slug)) slug = `${slug}-2`;
    used.add(slug);

    const assembled = await assembleBookPackage(p.id);
    if (assembled) files[`books/${slug}.md`] = strToU8(buildMarkdown(assembled.pkg));

    for (const cover of p.covers) {
      if (!isCoverType(cover.type)) continue;
      const stored = await getCover(cover.r2Key);
      if (stored) files[`covers/${slug}/${cover.type}.${extForType(stored.contentType)}`] = stored.body;
    }
  }

  files["README.txt"] = strToU8(
    `Quire library backup — ${new Date().toISOString().slice(0, 10)}

- library.json   Full structured data (books, chapters, memory, brainstorms).
- books/*.md     A readable Markdown copy of each book.
- covers/*       Any cover images you uploaded.

Keep this safe — it's a complete snapshot of your writing.
`,
  );

  const zip = zipSync(files);
  return new Response(zip as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="quire-backup-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
