import { NextRequest } from "next/server";
import { prisma, getAuthor } from "@/lib/db";
import {
  buildMarkdown,
  buildHtml,
  makePackage,
  type MatterSectionOut,
} from "@/lib/export/manuscript";
import { buildDocx } from "@/lib/export/docx";
import { buildEpub } from "@/lib/export/epub";
import { matterOrder, sectionByMatterType } from "@/lib/matter";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FORMATS = new Set(["markdown", "html", "docx", "epub"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ format: string }> },
) {
  const { format } = await params;
  const projectId = req.nextUrl.searchParams.get("project");
  if (!projectId) return new Response("Missing project", { status: 400 });

  if (!FORMATS.has(format)) {
    return new Response(JSON.stringify({ error: "unsupported", format }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });
  if (!project) return new Response("Not found", { status: 404 });
  const author = await getAuthor();

  const bodyChapters = project.chapters
    .filter((c) => c.matterType === null)
    .map((c) => ({ title: c.title, contentJson: c.contentJson }));

  const matterOut = (group: "front" | "back"): MatterSectionOut[] =>
    project.chapters
      .filter((c) => c.matterType?.startsWith(`${group}:`) && c.contentText.trim())
      .sort((a, b) => matterOrder(a.matterType!) - matterOrder(b.matterType!))
      .map((c) => ({
        key: sectionByMatterType(c.matterType!)?.key ?? c.matterType!,
        title: c.title,
        text: c.contentText,
      }));

  const pkg = makePackage(
    {
      recommendedTitle: project.recommendedTitle,
      title: project.title,
      subtitle: project.subtitle,
      authorName: author.name,
      positioning: project.positioning,
    },
    matterOut("front"),
    bodyChapters,
    matterOut("back"),
  );

  const base = slugify(project.recommendedTitle || project.title) || "manuscript";

  await prisma.export
    .create({ data: { projectId, format, status: "ready" } })
    .catch(() => {});

  switch (format) {
    case "markdown":
      return new Response(buildMarkdown(pkg), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.md"`,
        },
      });
    case "docx":
      return new Response(buildDocx(pkg) as BodyInit, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${base}.docx"`,
        },
      });
    case "epub":
      return new Response(buildEpub(pkg) as BodyInit, {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename="${base}.epub"`,
        },
      });
    default:
      // html — also the print-to-PDF path
      return new Response(buildHtml(pkg), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${base}.html"`,
        },
      });
  }
}
