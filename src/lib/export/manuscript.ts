import { docToHtml, docToMarkdown } from "./convert";

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
  const lines: string[] = [];
  lines.push(`# ${meta.displayTitle}`);
  if (meta.subtitle) lines.push(`### ${meta.subtitle}`);
  lines.push("", `*by ${meta.authorName}*`, "", "---", "");

  for (const s of front) {
    lines.push(`## ${s.title}`, "", s.text, "", "---", "");
  }

  lines.push("## Contents");
  chapters.forEach((c, i) => lines.push(`${i + 1}. ${c.title}`));
  lines.push("", "---", "");

  for (const c of chapters) {
    lines.push(`## ${c.title}`, "");
    lines.push(docToMarkdown(parse(c.contentJson)) || "_This chapter is not yet written._");
    lines.push("");
  }

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

export function buildHtml(pkg: BookPackage): string {
  const { meta, front, chapters, back } = pkg;
  const title = meta.displayTitle;
  const toc = chapters
    .map((c, i) => `<li><a href="#ch-${i + 1}">${escapeHtml(c.title)}</a></li>`)
    .join("\n");
  const frontHtml = front.map(matterToHtml).join("\n");
  const backHtml = back.map(matterToHtml).join("\n");
  const body = chapters
    .map(
      (c, i) => `
    <section class="chapter" id="ch-${i + 1}">
      <p class="chapter-num">Chapter ${i + 1}</p>
      <h2>${escapeHtml(c.title)}</h2>
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
<style>
  @page { size: 6in 9in; margin: 0.75in; }
  :root { --ink:#1b1e2b; --soft:#4a4e5e; --brass:#8c6536; }
  * { box-sizing: border-box; }
  body {
    font-family: "Newsreader", Georgia, "Times New Roman", serif;
    color: var(--ink); line-height: 1.7; font-size: 12pt;
    max-width: 42rem; margin: 0 auto; padding: 4rem 1.5rem; background:#fbf9f4;
  }
  .title-page { text-align:center; padding: 8rem 0; page-break-after: always; }
  .title-page h1 { font-size: 2.6rem; font-weight: 600; margin: 0 0 .5rem; letter-spacing:-0.01em; }
  .title-page .sub { font-size: 1.2rem; color: var(--soft); font-style: italic; margin-bottom: 3rem; }
  .title-page .by { font-size: 1rem; color: var(--soft); letter-spacing: .08em; text-transform: uppercase; }
  nav, .matter { page-break-after: always; }
  nav h2, .matter h2 { font-size: 1.4rem; border-bottom: 1px solid #e6e0d4; padding-bottom:.5rem; }
  nav ol { list-style: none; padding: 0; }
  nav li { padding: .35rem 0; border-bottom: 1px dotted #e6e0d4; }
  nav a { color: var(--ink); text-decoration: none; }
  .chapter { page-break-before: always; padding-top: 3rem; }
  .chapter-num { text-transform: uppercase; letter-spacing: .18em; font-size: .7rem; color: var(--brass); margin:0; }
  .chapter h2 { font-size: 1.8rem; font-weight: 600; margin: .25rem 0 2rem; border: none; }
  .chapter p { margin: 0 0 1rem; text-align: justify; }
  .chapter p + p { text-indent: 1.4em; margin-top:0; }
  blockquote { border-left: 2px solid var(--brass); margin: 1.2rem 0; padding-left: 1rem; font-style: italic; color: var(--soft); }
  h3,h4 { font-weight:600; margin: 1.6rem 0 .6rem; }
  .locked { background: rgba(140,101,54,.08); }
  @media print { body { background:#fff; padding:0; } }
</style>
</head>
<body>
  <div class="title-page">
    <h1>${escapeHtml(title)}</h1>
    ${meta.subtitle ? `<p class="sub">${escapeHtml(meta.subtitle)}</p>` : ""}
    <p class="by">${escapeHtml(meta.authorName)}</p>
  </div>
  ${frontHtml}
  <nav>
    <h2>Contents</h2>
    <ol>${toc}</ol>
  </nav>
  ${body}
  ${backHtml}
</body>
</html>`;
}
