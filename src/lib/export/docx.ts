/**
 * DOCX exporter — hand-rolled OOXML zipped with fflate.
 * Pure JS, no Node APIs: runs identically in Node and Cloudflare Workers.
 * Produces a 6×9" manuscript with Title/Heading/Quote styles, page breaks
 * before chapters, and front/back matter sections.
 */

import { zipSync, strToU8 } from "fflate";
import { docToBlocks, type Block, type Run } from "./convert";
import { textToParagraphs, type BookPackage } from "./manuscript";
import { cleanChapterTitle } from "@/lib/utils";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runXml(r: Run): string {
  if (!r.text) return "";
  const props: string[] = [];
  if (r.bold) props.push("<w:b/>");
  if (r.italic) props.push("<w:i/>");
  if (r.underline) props.push('<w:u w:val="single"/>');
  const rPr = props.length ? `<w:rPr>${props.join("")}</w:rPr>` : "";
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`;
}

type ParaOpts = {
  style?: string;
  pageBreakBefore?: boolean;
  center?: boolean;
};

function para(runs: Run[], opts: ParaOpts = {}): string {
  const pPr: string[] = [];
  if (opts.style) pPr.push(`<w:pStyle w:val="${opts.style}"/>`);
  if (opts.pageBreakBefore) pPr.push("<w:pageBreakBefore/>");
  if (opts.center) pPr.push('<w:jc w:val="center"/>');
  const props = pPr.length ? `<w:pPr>${pPr.join("")}</w:pPr>` : "";
  return `<w:p>${props}${runs.map(runXml).join("")}</w:p>`;
}

function textPara(text: string, opts: ParaOpts = {}): string {
  return para([{ text }], opts);
}

function blocksXml(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "h") {
      out.push(para(b.runs, { style: b.level <= 2 ? "Heading2" : "Heading3" }));
    } else if (b.type === "quote") {
      out.push(para(b.runs, { style: "Quote" }));
    } else if (b.type === "list") {
      for (const item of b.items) {
        out.push(para([{ text: "•  " }, ...item], { style: "ListPara" }));
      }
    } else {
      out.push(para(b.runs));
    }
  }
  return out.join("");
}

export function buildDocx(pkg: BookPackage): Uint8Array {
  const { meta, front, chapters, back } = pkg;
  const body: string[] = [];

  // Title page
  body.push(textPara(meta.displayTitle, { style: "Title", center: true }));
  if (meta.subtitle) body.push(textPara(meta.subtitle, { style: "Subtitle", center: true }));
  body.push(textPara(""), textPara(`by ${meta.authorName}`, { center: true }));

  // Front matter
  for (const s of front) {
    body.push(textPara(s.title, { style: "Heading1", pageBreakBefore: true }));
    for (const p of textToParagraphs(s.text)) body.push(textPara(p));
  }

  // Contents
  body.push(textPara("Contents", { style: "Heading1", pageBreakBefore: true }));
  chapters.forEach((c, i) => body.push(textPara(`${i + 1}.  ${cleanChapterTitle(c.title)}`)));

  // Chapters
  for (const [i, c] of chapters.entries()) {
    body.push(textPara(`Chapter ${i + 1}`, { style: "ChapterNum", pageBreakBefore: true }));
    body.push(textPara(cleanChapterTitle(c.title), { style: "Heading1" }));
    let doc: Parameters<typeof docToBlocks>[0] = null;
    try {
      doc = c.contentJson ? JSON.parse(c.contentJson) : null;
    } catch {
      doc = null;
    }
    const blocks = docToBlocks(doc);
    if (blocks.length === 0) {
      body.push(para([{ text: "This chapter is not yet written.", italic: true }]));
    } else {
      body.push(blocksXml(blocks));
    }
  }

  // Back matter
  for (const s of back) {
    body.push(textPara(s.title, { style: "Heading1", pageBreakBefore: true }));
    for (const p of textToParagraphs(s.text)) body.push(textPara(p));
  }

  // 6x9in page (twips), 0.75in margins
  const sectPr = `<w:sectPr><w:pgSz w:w="8640" w:h="12960"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720"/></w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${body.join("")}${sectPr}</w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
  <w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="24"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="200" w:line="340" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:spacing w:before="2400" w:after="240"/></w:pPr>
  <w:rPr><w:sz w:val="56"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/>
  <w:rPr><w:sz w:val="30"/><w:i/><w:color w:val="4A4E5E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:spacing w:before="360" w:after="360"/><w:outlineLvl w:val="0"/></w:pPr>
  <w:rPr><w:sz w:val="40"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="1"/></w:pPr>
  <w:rPr><w:sz w:val="32"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="2"/></w:pPr>
  <w:rPr><w:sz w:val="28"/><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ChapterNum"><w:name w:val="Chapter Number"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:spacing w:before="1800" w:after="0"/></w:pPr>
  <w:rPr><w:caps/><w:color w:val="8C6536"/><w:sz w:val="20"/><w:spacing w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:ind w:left="567"/></w:pPr>
  <w:rPr><w:i/><w:color w:val="4A4E5E"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListPara"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>
  <w:pPr><w:ind w:left="425"/><w:spacing w:after="80"/></w:pPr></w:style>
</w:styles>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const now = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(meta.displayTitle)}</dc:title>
<dc:creator>${esc(meta.authorName)}</dc:creator>
<cp:lastModifiedBy>Quire</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
<Application>Quire</Application>
</Properties>`;

  return zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "word/document.xml": strToU8(documentXml),
    "word/styles.xml": strToU8(stylesXml),
    "word/_rels/document.xml.rels": strToU8(documentRels),
    "docProps/core.xml": strToU8(coreXml),
    "docProps/app.xml": strToU8(appXml),
  });
}
