/**
 * Real paginated 6×9 PDF — pure JS via pdf-lib (Workers-safe, no font files).
 * A clean classic book layout: title page, front/back matter, and each chapter
 * on its own page, with footer page numbers. Built from the same BookPackage as
 * the other exporters.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { cleanChapterTitle } from "@/lib/utils";
import { docToBlocks, type Block, type Run } from "./convert";
import { textToParagraphs, type BookPackage, type MatterSectionOut } from "./manuscript";

// 6×9 inch page in points.
const PW = 432;
const PH = 648;
const MARGIN = 54; // 0.75in
const COL = PW - MARGIN * 2; // text column width
const TOP = PH - MARGIN;
const BOTTOM = MARGIN + 18; // leave room for the footer page number
const INK = rgb(0.106, 0.118, 0.169);
const SOFT = rgb(0.29, 0.31, 0.37);
const BRASS = rgb(0.549, 0.396, 0.212);

/** Map common Unicode to WinAnsi-safe glyphs; drop anything else StandardFonts can't encode. */
function winAnsi(s: string): string {
  return s
    .replace(/[‘’‚‹›]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[–—‒]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "•")
    .replace(/ /g, " ")
    .replace(/[\t\r]/g, " ")
    // strip remaining non-WinAnsi (keep Latin-1 printable range + newline)
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");
}

function parse(json: string | null): Parameters<typeof docToBlocks>[0] {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type Fonts = { body: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont; sans: PDFFont };

export async function buildPdf(pkg: BookPackage): Promise<Uint8Array> {
  const { meta, front, chapters, back } = pkg;
  const doc = await PDFDocument.create();
  doc.setTitle(meta.displayTitle);
  doc.setAuthor(meta.authorName);

  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    boldItalic: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
    sans: await doc.embedFont(StandardFonts.Helvetica),
  };

  let page: PDFPage = doc.addPage([PW, PH]);
  let y = TOP;
  let pageNo = 0; // title page = 0 (not numbered)

  function footer() {
    if (pageNo <= 0) return;
    const label = String(pageNo);
    const w = fonts.body.widthOfTextAtSize(label, 9);
    page.drawText(label, { x: (PW - w) / 2, y: MARGIN - 4, size: 9, font: fonts.body, color: SOFT });
  }

  function newPage(numbered = true) {
    footer();
    page = doc.addPage([PW, PH]);
    y = TOP;
    if (numbered) pageNo += 1;
    else pageNo = 0;
  }

  function ensure(h: number) {
    if (y - h < BOTTOM) newPage();
  }

  function fontFor(r: Run): PDFFont {
    if (r.bold && r.italic) return fonts.boldItalic;
    if (r.bold) return fonts.bold;
    if (r.italic) return fonts.italic;
    return fonts.body;
  }

  /** Run-aware greedy wrapping. align: left | center. */
  function drawRuns(
    runs: Run[],
    opts: { size: number; lineHeight: number; indent?: number; align?: "left" | "center"; color?: typeof INK; gapAfter?: number },
  ) {
    const { size, lineHeight, align = "left", color = INK } = opts;
    // tokens: words carrying their own font; spaces are implicit between words
    type Tok = { text: string; font: PDFFont };
    const toks: Tok[] = [];
    for (const r of runs) {
      const f = fontFor(r);
      const words = winAnsi(r.text).split(/(\s+)/).filter((w) => w.length > 0);
      for (const w of words) {
        if (/^\s+$/.test(w)) toks.push({ text: " ", font: f });
        else toks.push({ text: w, font: f });
      }
    }
    // build lines
    type Line = { toks: Tok[]; width: number };
    const lines: Line[] = [];
    let cur: Tok[] = [];
    let curW = 0;
    const firstIndent = opts.indent ?? 0;
    let maxW = COL - firstIndent;
    const widthOf = (t: Tok) => t.font.widthOfTextAtSize(t.text, size);
    for (const t of toks) {
      const w = widthOf(t);
      if (curW + w > maxW && cur.length > 0 && t.text !== " ") {
        lines.push({ toks: cur, width: curW });
        cur = [];
        curW = 0;
        maxW = COL; // only the first line carries the indent
      }
      if (t.text === " " && cur.length === 0) continue; // no leading space
      cur.push(t);
      curW += w;
    }
    if (cur.length) lines.push({ toks: cur, width: curW });

    lines.forEach((line, i) => {
      ensure(lineHeight);
      const indent = i === 0 ? firstIndent : 0;
      let x = align === "center" ? (PW - line.width) / 2 : MARGIN + indent;
      for (const t of line.toks) {
        page.drawText(t.text, { x, y: y - size, size, font: t.font, color });
        x += widthOf(t);
      }
      y -= lineHeight;
    });
    if (opts.gapAfter) y -= opts.gapAfter;
  }

  function heading(text: string, size = 20) {
    ensure(size * 1.6);
    drawRuns([{ text }], { size, lineHeight: size * 1.25, align: "left", color: INK, gapAfter: 10 });
  }

  function paragraph(text: string, indent = 0) {
    drawRuns([{ text }], { size: 11, lineHeight: 16.5, indent, gapAfter: 7 });
  }

  // ——— Title page (page 0, not numbered) ———
  y = PH * 0.62;
  drawRuns([{ text: meta.displayTitle, bold: true }], { size: 30, lineHeight: 36, align: "center", color: INK, gapAfter: 14 });
  if (meta.subtitle) drawRuns([{ text: meta.subtitle, italic: true }], { size: 15, lineHeight: 20, align: "center", color: SOFT, gapAfter: 40 });
  drawRuns([{ text: `by ${meta.authorName}` }], { size: 12, lineHeight: 16, align: "center", color: SOFT });

  const matterPage = (s: MatterSectionOut) => {
    newPage();
    heading(s.title);
    for (const p of textToParagraphs(s.text)) paragraph(winAnsi(p));
  };

  // ——— Pre-ToC front matter ———
  for (const s of front.filter((f) => f.preToc)) matterPage(s);

  // ——— Contents ———
  newPage();
  heading("Contents");
  front
    .filter((f) => !f.preToc && f.inToc)
    .forEach((s) => drawRuns([{ text: s.title }], { size: 11, lineHeight: 18 }));
  chapters.forEach((c, i) =>
    drawRuns([{ text: `${i + 1}.  ${cleanChapterTitle(c.title)}` }], { size: 11, lineHeight: 18 }),
  );
  back.filter((b) => b.inToc).forEach((s) => drawRuns([{ text: s.title }], { size: 11, lineHeight: 18 }));

  // ——— Post-ToC front matter ———
  for (const s of front.filter((f) => !f.preToc)) matterPage(s);

  // ——— Chapters (each its own page) ———
  chapters.forEach((c, i) => {
    newPage();
    y -= 40; // breathe at the top of a chapter
    drawRuns([{ text: `CHAPTER ${i + 1}` }], { size: 9, lineHeight: 16, color: BRASS, gapAfter: 4 });
    drawRuns([{ text: cleanChapterTitle(c.title), bold: true }], { size: 22, lineHeight: 27, gapAfter: 18 });
    renderBlocks(docToBlocks(parse(c.contentJson)));
  });

  // ——— Back matter ———
  for (const s of back) matterPage(s);

  function renderBlocks(blocks: Block[]) {
    if (blocks.length === 0) {
      drawRuns([{ text: "This chapter is not yet written.", italic: true }], { size: 11, lineHeight: 16.5, color: SOFT });
      return;
    }
    let firstPara = true;
    for (const b of blocks) {
      if (b.type === "h") {
        const size = b.level <= 2 ? 15 : 13;
        ensure(size * 2);
        y -= 6;
        drawRuns(b.runs, { size, lineHeight: size * 1.3, color: INK, gapAfter: 6 });
        firstPara = true;
      } else if (b.type === "quote") {
        drawRuns(b.runs.map((r) => ({ ...r, italic: true })), {
          size: 11,
          lineHeight: 16.5,
          indent: 18,
          color: SOFT,
          gapAfter: 8,
        });
      } else if (b.type === "list") {
        for (const item of b.items) {
          drawRuns([{ text: "•  " }, ...item], { size: 11, lineHeight: 16.5, indent: 8, gapAfter: 2 });
        }
        y -= 4;
      } else {
        // paragraph — indent all but the first in a section
        drawRuns(b.runs, { size: 11, lineHeight: 16.5, indent: firstPara ? 0 : 16, gapAfter: 7 });
        firstPara = false;
      }
    }
  }

  footer(); // number the last page
  return doc.save();
}
