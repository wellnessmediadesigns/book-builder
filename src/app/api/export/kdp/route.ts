import { NextRequest } from "next/server";
import { zipSync, strToU8 } from "fflate";
import { prisma } from "@/lib/db";
import { assembleBookPackage } from "@/lib/export/assemble";
import { buildPdf } from "@/lib/export/pdf";
import { getCover, coverKey } from "@/lib/storage";
import { isCoverType, extForType, type CoverType } from "@/lib/covers";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SLOT_LABEL: Record<CoverType, string> = {
  front: "front-cover",
  back: "back-cover",
  wrap: "full-wrap-cover",
};

/**
 * One-click KDP bundle: a single .zip with the manuscript PDF, every uploaded
 * cover file, and a short README of the upload steps. Reuses the same package
 * + PDF builder as the regular export, and fflate's zipSync (as the EPUB does).
 */
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project");
  if (!projectId) return new Response("Missing project", { status: 400 });

  const assembled = await assembleBookPackage(projectId);
  if (!assembled) return new Response("Not found", { status: 404 });
  const { pkg, title } = assembled;
  const base = slugify(title) || "manuscript";

  const files: Record<string, Uint8Array> = {};

  // Manuscript interior (paginated 6×9 PDF).
  files[`${base}-manuscript.pdf`] = await buildPdf(pkg);

  // Cover files (whichever the author uploaded).
  const covers = await prisma.coverImage.findMany({ where: { projectId } });
  const included: string[] = [];
  for (const row of covers) {
    if (!isCoverType(row.type)) continue;
    const stored = await getCover(row.r2Key ?? coverKey(projectId, row.type));
    if (!stored) continue;
    const name = `${base}-${SLOT_LABEL[row.type]}.${extForType(stored.contentType)}`;
    files[name] = stored.body;
    included.push(name);
  }

  files["README.txt"] = strToU8(readme(title, included));

  await prisma.export.create({ data: { projectId, format: "kdp", status: "ready" } }).catch(() => {});

  const zip = zipSync(files);
  return new Response(zip as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${base}-kdp.zip"`,
    },
  });
}

function readme(title: string, covers: string[]): string {
  const coverLines = covers.length
    ? covers.map((c) => `  - ${c}`).join("\n")
    : "  (no cover files uploaded yet — add them on the Cover tab)";
  return `KDP upload bundle — ${title}
=================================================

This .zip contains everything you need to publish on Amazon KDP.

CONTENTS
  - *-manuscript.pdf   Your book interior (6x9, paginated)
${coverLines}

HOW TO UPLOAD
  1. Go to kdp.amazon.com and create a new Paperback (or Kindle eBook) title.
  2. Manuscript: upload the *-manuscript.pdf as your interior file.
  3. Cover:
       - Paperback: upload the full-wrap cover (back + spine + front).
       - eBook: upload the front cover image.
  4. Use KDP's previewer to check spacing, then publish.

Tip: KDP sets the final page count from your interior file, and the spine
width depends on that page count — generate your wrap cover to match.
`;
}
