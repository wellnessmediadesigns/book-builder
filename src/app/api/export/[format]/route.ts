import { NextRequest } from "next/server";
import { prisma, getAuthor } from "@/lib/db";
import { buildMarkdown, buildHtml } from "@/lib/export/manuscript";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const REAL = new Set(["markdown", "html"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ format: string }> },
) {
  const { format } = await params;
  const projectId = req.nextUrl.searchParams.get("project");
  if (!projectId) return new Response("Missing project", { status: 400 });

  if (!REAL.has(format)) {
    return new Response(
      JSON.stringify({ error: "coming_soon", format }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { chapters: { where: { matterType: null }, orderBy: { order: "asc" } } },
  });
  if (!project) return new Response("Not found", { status: 404 });
  const author = await getAuthor();

  const meta = {
    recommendedTitle: project.recommendedTitle,
    title: project.title,
    subtitle: project.subtitle,
    authorName: author.name,
    positioning: project.positioning,
  };
  const chapters = project.chapters.map((c) => ({ title: c.title, contentJson: c.contentJson }));
  const base = slugify(project.recommendedTitle || project.title) || "manuscript";

  if (format === "markdown") {
    return new Response(buildMarkdown(meta, chapters), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.md"`,
      },
    });
  }

  // html (also the print-to-PDF path)
  return new Response(buildHtml(meta, chapters), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.html"`,
    },
  });
}
