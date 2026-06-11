/**
 * EPUB 3 exporter (with EPUB 2 NCX fallback) — pure JS via fflate.
 * Reflowable, Kindle/Apple Books-friendly: valid XHTML chapters, nav doc,
 * semantic front/back matter, and embedded CSS.
 */

import { zipSync, strToU8 } from "fflate";
import { docToBlocks, type Block, type Run } from "./convert";
import { textToParagraphs, type BookPackage } from "./manuscript";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runsXhtml(runs: Run[]): string {
  return runs
    .map((r) => {
      let t = esc(r.text);
      if (r.underline) t = `<span class="u">${t}</span>`;
      if (r.italic) t = `<em>${t}</em>`;
      if (r.bold) t = `<strong>${t}</strong>`;
      return t;
    })
    .join("");
}

function blocksXhtml(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "h") {
      const tag = b.level <= 2 ? "h2" : "h3";
      out.push(`<${tag}>${runsXhtml(b.runs)}</${tag}>`);
    } else if (b.type === "quote") {
      out.push(`<blockquote><p>${runsXhtml(b.runs)}</p></blockquote>`);
    } else if (b.type === "list") {
      const tag = b.ordered ? "ol" : "ul";
      out.push(
        `<${tag}>${b.items.map((i) => `<li>${runsXhtml(i)}</li>`).join("")}</${tag}>`,
      );
    } else {
      out.push(`<p>${runsXhtml(b.runs)}</p>`);
    }
  }
  return out.join("\n");
}

function xhtmlDoc(title: string, bodyInner: string, epubType?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
<title>${esc(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<section${epubType ? ` epub:type="${epubType}"` : ""}>
${bodyInner}
</section>
</body>
</html>`;
}

const CSS = `
body { font-family: Georgia, "Times New Roman", serif; line-height: 1.6; }
h1 { font-size: 1.7em; font-weight: 600; margin: 1.2em 0 1em; }
h2 { font-size: 1.35em; font-weight: 600; margin: 1.2em 0 .6em; }
h3 { font-size: 1.1em; font-weight: 600; margin: 1em 0 .5em; }
p { margin: 0 0 .85em; }
.chapter p + p { text-indent: 1.3em; margin-top: 0; margin-bottom: 0; }
.chapter-num { text-transform: uppercase; letter-spacing: .16em; font-size: .75em; color: #8c6536; margin-bottom: .2em; }
blockquote { margin: 1em 1.2em; font-style: italic; color: #4a4e5e; }
.title-page { text-align: center; margin-top: 28%; }
.title-page h1 { font-size: 2em; }
.title-page .sub { font-style: italic; color: #4a4e5e; }
.title-page .by { margin-top: 3em; text-transform: uppercase; letter-spacing: .1em; font-size: .85em; }
.u { text-decoration: underline; }
nav ol { list-style: none; padding-left: 0; }
nav li { margin: .4em 0; }
nav a { text-decoration: none; color: inherit; }
`;

export function buildEpub(pkg: BookPackage): Uint8Array {
  const { meta, front, chapters, back } = pkg;
  const uuid = crypto.randomUUID();
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  type Item = { id: string; href: string; title: string; xhtml: string; type?: string };
  const items: Item[] = [];

  // Title page
  items.push({
    id: "titlepage",
    href: "titlepage.xhtml",
    title: meta.displayTitle,
    type: "titlepage",
    xhtml: xhtmlDoc(
      meta.displayTitle,
      `<div class="title-page">
<h1>${esc(meta.displayTitle)}</h1>
${meta.subtitle ? `<p class="sub">${esc(meta.subtitle)}</p>` : ""}
<p class="by">${esc(meta.authorName)}</p>
</div>`,
      "titlepage",
    ),
  });

  // Front matter
  front.forEach((s, i) => {
    items.push({
      id: `front-${i}`,
      href: `front-${s.key}.xhtml`,
      title: s.title,
      type: "frontmatter",
      xhtml: xhtmlDoc(
        s.title,
        `<h1>${esc(s.title)}</h1>\n` +
          textToParagraphs(s.text)
            .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
            .join("\n"),
        "frontmatter",
      ),
    });
  });

  // Chapters
  chapters.forEach((c, i) => {
    let doc: Parameters<typeof docToBlocks>[0] = null;
    try {
      doc = c.contentJson ? JSON.parse(c.contentJson) : null;
    } catch {
      doc = null;
    }
    const blocks = docToBlocks(doc);
    items.push({
      id: `ch-${i + 1}`,
      href: `chapter-${i + 1}.xhtml`,
      title: c.title,
      type: "chapter",
      xhtml: xhtmlDoc(
        c.title,
        `<div class="chapter">
<p class="chapter-num">Chapter ${i + 1}</p>
<h1>${esc(c.title)}</h1>
${blocks.length ? blocksXhtml(blocks) : "<p><em>This chapter is not yet written.</em></p>"}
</div>`,
        "chapter",
      ),
    });
  });

  // Back matter
  back.forEach((s, i) => {
    items.push({
      id: `back-${i}`,
      href: `back-${s.key}.xhtml`,
      title: s.title,
      type: "backmatter",
      xhtml: xhtmlDoc(
        s.title,
        `<h1>${esc(s.title)}</h1>\n` +
          textToParagraphs(s.text)
            .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
            .join("\n"),
        "backmatter",
      ),
    });
  });

  // Navigation (EPUB 3 nav doc — also in the spine)
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><title>Contents</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
<nav epub:type="toc" id="toc">
<h1>Contents</h1>
<ol>
${items.map((it) => `<li><a href="${it.href}">${esc(it.title)}</a></li>`).join("\n")}
</ol>
</nav>
</body>
</html>`;

  // EPUB 2 NCX for older readers / Kindle conversion
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="urn:uuid:${uuid}"/>
<meta name="dtb:depth" content="1"/>
</head>
<docTitle><text>${esc(meta.displayTitle)}</text></docTitle>
<navMap>
${items
  .map(
    (it, i) =>
      `<navPoint id="np-${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(
        it.title,
      )}</text></navLabel><content src="${it.href}"/></navPoint>`,
  )
  .join("\n")}
</navMap>
</ncx>`;

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
<dc:title>${esc(meta.displayTitle)}</dc:title>
<dc:creator>${esc(meta.authorName)}</dc:creator>
<dc:language>en</dc:language>
<meta property="dcterms:modified">${now}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="css" href="style.css" media-type="text/css"/>
${items
  .map((it) => `<item id="${it.id}" href="${it.href}" media-type="application/xhtml+xml"/>`)
  .join("\n")}
</manifest>
<spine toc="ncx">
${items.map((it) => `<itemref idref="${it.id}"/>`).join("\n")}
<itemref idref="nav" linear="no"/>
</spine>
</package>`;

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>`;

  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    // mimetype MUST be first and stored uncompressed
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": strToU8(containerXml),
    "OEBPS/content.opf": strToU8(opf),
    "OEBPS/nav.xhtml": strToU8(navXhtml),
    "OEBPS/toc.ncx": strToU8(ncx),
    "OEBPS/style.css": strToU8(CSS),
  };
  for (const it of items) files[`OEBPS/${it.href}`] = strToU8(it.xhtml);

  return zipSync(files);
}
