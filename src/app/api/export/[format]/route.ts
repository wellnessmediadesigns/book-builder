import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { buildMarkdown, buildHtml } from "@/lib/export/manuscript";
import { buildDocx } from "@/lib/export/docx";
import { buildEpub } from "@/lib/export/epub";
import { assembleBookPackage } from "@/lib/export/assemble";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FORMATS = new Set(["markdown", "html", "docx", "epub"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ format: string }> },
) {
  const { format } = await params;
  const projectId = req.nextUrl.searchParams.get("project");
  const themeOverride = req.nextUrl.searchParams.get("theme") ?? undefined;
  if (!projectId) return new Response("Missing project", { status: 400 });

  if (!FORMATS.has(format)) {
    return new Response(JSON.stringify({ error: "unsupported", format }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const assembled = await assembleBookPackage(projectId);
  if (!assembled) return new Response("Not found", { status: 404 });
  const { pkg, theme, title } = assembled;
  const base = slugify(title) || "manuscript";

  await prisma.export.create({ data: { projectId, format, status: "ready" } }).catch(() => {});

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
      // html — also the print-to-PDF path; uses the saved theme (or an override)
      return new Response(buildHtml(pkg, themeOverride ?? theme), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${base}.html"`,
        },
      });
  }
}
