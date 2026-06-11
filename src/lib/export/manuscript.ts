import { docToHtml, docToMarkdown } from "./convert";
import { cleanChapterTitle, toRoman } from "@/lib/utils";
import { getTheme } from "./themes";

export type ExportProject = {
  recommendedTitle: string;
  title: string;
  subtitle: string;
  authorName: string;
  positioning: string;
};
export type ExportChapter = {
  title: string;
  contentJson: string | null;
};
export type MatterSectionOut = {
  key: string;
  title: string;
  /** Plain text content (matter sections are stored as text). */
  text: string;
  /** Front matter that precedes the Table of Contents (copyright, dedication…). */
  preToc?: boolean;
  /** Whether this section is listed on the Contents page. */
  inToc?: boolean;
};

/** Everything an export adapter needs, normalized. */
export type BookPackage = {
  meta: ExportProject & { displayTitle: string };
  front: MatterSectionOut[];
  chapters: ExportChapter[];
  back: MatterSectionOut[];
};

export function makePackage(
  project: ExportProject,
  front: MatterSectionOut[],
  chapters: ExportChapter[],
  back: MatterSectionOut[],
): BookPackage {
  return {
    meta: { ...project, displayTitle: project.recommendedTitle || project.title },
    front: front.filter((s) => s.text.trim()),
    chapters,
    back: back.filter((s) => s.text.trim()),
  };
}

function parse(json: string | null) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|\n(?=\S)/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ————————————————————————————————————————————— Markdown

export function buildMarkdown(pkg: BookPackage): string {
  const { meta, front, chapters, back } = pkg;
  const preToc = front.filter((s) => s.preToc);
  const postToc = front.filter((s) => !s.preToc);
  const lines: string[] = [];
  lines.push(`# ${meta.displayTitle}`);
  if (meta.subtitle) lines.push(`### ${meta.subtitle}`);
  lines.push("", `*by ${meta.authorName}*`, "", "---", "");

  // Pre-ToC front matter (copyright, dedication, epigraph…)
  for (const s of preToc) {
    lines.push(`## ${s.title}`, "", s.text, "", "---", "");
  }

  // Contents — lists post-ToC front matter, the chapters, then back matter.
  lines.push("## Contents");
  postToc.filter((s) => s.inToc).forEach((s) => lines.push(`- ${s.title}`));
  chapters.forEach((c, i) => lines.push(`${i + 1}. ${cleanChapterTitle(c.title)}`));
  back.filter((s) => s.inToc).forEach((s) => lines.push(`- ${s.title}`));
  lines.push("", "---", "");

  // Post-ToC front matter (foreword, preface, introduction…)
  for (const s of postToc) {
    lines.push(`## ${s.title}`, "", s.text, "", "---", "");
  }

  chapters.forEach((c, i) => {
    lines.push(`## Chapter ${i + 1}: ${cleanChapterTitle(c.title)}`, "");
    lines.push(docToMarkdown(parse(c.contentJson)) || "_This chapter is not yet written._");
    lines.push("");
  });

  for (const s of back) {
    lines.push("---", "", `## ${s.title}`, "", s.text, "");
  }
  return lines.join("\n");
}

// ————————————————————————————————————————————— HTML (print-ready)

function matterToHtml(s: MatterSectionOut): string {
  const paras = textToParagraphs(s.text)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  return `
    <section class="matter" id="m-${s.key}">
      <h2>${escapeHtml(s.title)}</h2>
      ${paras}
    </section>`;
}

export function buildHtml(pkg: BookPackage, themeId?: string): string {
  const { meta, front, chapters, back } = pkg;
  const title = meta.displayTitle;
  const theme = getTheme(themeId);
  const clean = (t: string) => escapeHtml(cleanChapterTitle(t));

  const preToc = front.filter((s) => s.preToc);
  const postToc = front.filter((s) => !s.preToc);

  // Contents lists post-ToC front matter → chapters → back matter.
  const toc = [
    ...postToc.filter((s) => s.inToc).map((s) => `<li><a href="#m-${s.key}">${escapeHtml(s.title)}</a></li>`),
    ...chapters.map((c, i) => `<li><a href="#ch-${i + 1}">${clean(c.title)}</a></li>`),
    ...back.filter((s) => s.inToc).map((s) => `<li><a href="#m-${s.key}">${escapeHtml(s.title)}</a></li>`),
  ].join("\n");

  const preTocHtml = preToc.map(matterToHtml).join("\n");
  const postTocHtml = postToc.map(matterToHtml).join("\n");
  const backHtml = back.map(matterToHtml).join("\n");
  const body = chapters
    .map(
      (c, i) => `
    <section class="chapter" id="ch-${i + 1}">
      <p class="ch-eyebrow">Chapter ${i + 1}</p>
      <div class="ch-numeral">${i + 1}</div>
      <div class="ch-roman">${toRoman(i + 1)}</div>
      <h2 class="ch-title">${clean(c.title)}</h2>
      ${docToHtml(parse(c.contentJson)) || "<p><em>This chapter is not yet written.</em></p>"}
    </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
<style>${theme.css}
  .locked { background: rgba(140,101,54,.08); }
</style>
</head>
<body>
  <div class="title-page">
    <h1>${escapeHtml(title)}</h1>
    ${meta.subtitle ? `<p class="sub">${escapeHtml(meta.subtitle)}</p>` : ""}
    <p class="by">${escapeHtml(meta.authorName)}</p>
  </div>
  <div class="page">
    ${preTocHtml}
    <nav>
      <h2>Contents</h2>
      <ol>${toc}</ol>
    </nav>
    ${postTocHtml}
    ${body}
    ${backHtml}
  </div>
</body>
</html>`;
}
