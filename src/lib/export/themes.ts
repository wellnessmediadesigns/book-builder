/**
 * Book formatting themes for the HTML/PDF export and the in-app preview.
 * buildHtml renders every chapter-header element (eyebrow / numeral / roman /
 * title); each theme's CSS decides which to show and how — so themes are pure
 * styling, no markup branching.
 */

export type BookTheme = {
  id: string;
  name: string;
  description: string;
  css: string;
};

const BASE = `
  @page { size: 6in 9in; margin: 0.75in; }
  :root {
    --ink:#1b1e2b; --soft:#4a4e5e; --brass:#8c6536; --muse:#5b4bb0; --line:#e6e0d4;
  }
  * { box-sizing: border-box; }
  body {
    color: var(--ink); margin: 0; background:#fbf9f4;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 42rem; margin: 0 auto; padding: 3.5rem 1.75rem; }
  .title-page { text-align:center; padding: 6rem 1.75rem; page-break-after: always; }
  .title-page h1 { font-size: 2.6rem; font-weight: 600; margin: 0 0 .5rem; letter-spacing:-0.01em; line-height:1.1; }
  .title-page .sub { font-size: 1.2rem; color: var(--soft); font-style: italic; margin-bottom: 3rem; }
  .title-page .by { font-size: .95rem; color: var(--soft); letter-spacing: .12em; text-transform: uppercase; }
  nav, .matter { page-break-after: always; }
  nav h2, .matter h2 { font-size: 1.4rem; border-bottom: 1px solid var(--line); padding-bottom:.4rem; }
  nav ol { list-style: none; padding: 0; }
  nav li { padding: .35rem 0; border-bottom: 1px dotted var(--line); }
  nav a { color: var(--ink); text-decoration: none; }
  .chapter { page-break-before: always; padding-top: 2.5rem; }
  /* All four header elements exist; themes show/hide them. */
  .ch-eyebrow, .ch-numeral, .ch-roman { display:none; }
  .ch-title { font-weight: 600; margin: 0 0 2rem; }
  .chapter p { margin: 0 0 1rem; }
  blockquote { border-left: 2px solid var(--brass); margin: 1.2rem 0; padding-left: 1rem; font-style: italic; color: var(--soft); }
  h3,h4 { font-weight:600; margin: 1.6rem 0 .6rem; }
  .ornament { text-align:center; color:var(--brass); margin: 0 0 2rem; letter-spacing:.5em; }
  @media print { body { background:#fff; } .page, .title-page { padding-left:0; padding-right:0; } }
`;

export const THEMES: BookTheme[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Timeless trade paperback. Serif throughout, a small-caps chapter label, centered titles, justified text.",
    css: `${BASE}
      body { font-family: "Newsreader", Georgia, "Times New Roman", serif; font-size: 12pt; line-height: 1.72; }
      .chapter { text-align:center; }
      .ch-eyebrow { display:block; text-transform:uppercase; letter-spacing:.22em; font-size:.72rem; color:var(--brass); margin:1.5rem 0 .4rem; }
      .ch-title { font-size: 1.9rem; line-height:1.2; }
      .chapter p { text-align: justify; }
      .chapter > p { text-align: justify; }
      .chapter .body { text-align: justify; }
      .chapter p + p { text-indent: 1.4em; }
    `,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean and contemporary. Sans-serif headings, a large soft numeral, left-aligned, airy paragraphs.",
    css: `${BASE}
      body { font-family: "Newsreader", Georgia, serif; font-size: 12pt; line-height: 1.75; }
      .ch-numeral { display:block; font-family: "Inter", system-ui, sans-serif; font-size:4.5rem; font-weight:800; color:var(--line); line-height:1; margin-bottom:.25rem; }
      .ch-title { font-family:"Inter", system-ui, sans-serif; font-size: 2rem; letter-spacing:-0.02em; }
      .chapter p { text-align:left; }
      nav h2, .matter h2 { font-family:"Inter",system-ui,sans-serif; }
    `,
  },
  {
    id: "minimal",
    name: "Minimalist",
    description: "Spare and quiet. No chapter labels, generous whitespace, a small centered title.",
    css: `${BASE}
      body { font-family: "Newsreader", Georgia, serif; font-size: 11.5pt; line-height: 1.8; }
      .chapter { text-align:center; padding-top: 4rem; }
      .ch-title { font-size: 1.4rem; font-weight:600; letter-spacing:.01em; color:var(--soft); margin-bottom: 2.5rem; }
      .chapter p { text-align:left; }
    `,
  },
  {
    id: "literary",
    name: "Literary",
    description: "Elegant and bookish. Roman numerals, a centered ornament, an italic title, and a drop-cap opening.",
    css: `${BASE}
      body { font-family: "Newsreader", Georgia, "Times New Roman", serif; font-size: 12pt; line-height: 1.78; }
      .chapter { text-align:center; }
      .ch-roman { display:block; font-size:1.1rem; letter-spacing:.3em; color:var(--brass); margin:1.5rem 0 .5rem; }
      .ch-title { font-style: italic; font-weight:500; font-size: 1.7rem; }
      .ch-title::after { content:"❦"; display:block; color:var(--brass); font-size:1rem; margin-top:1rem; font-style:normal; }
      .chapter p { text-align: justify; }
      .chapter p + p { text-indent: 1.4em; }
      .chapter p:first-of-type { text-align:left; }
      .chapter p:first-of-type::first-letter {
        float:left; font-size:3.2rem; line-height:.8; padding:.1em .12em 0 0; color:var(--brass); font-weight:600;
      }
    `,
  },
  {
    id: "bold",
    name: "Bold",
    description: "High-impact and graphic. An oversized numeral and a heavy left-aligned title.",
    css: `${BASE}
      body { font-family: "Inter", system-ui, sans-serif; font-size: 11.5pt; line-height: 1.7; }
      .chapter { border-top: 3px solid var(--ink); }
      .ch-numeral { display:block; font-size:5rem; font-weight:900; color:var(--ink); line-height:1; margin:.5rem 0; }
      .ch-eyebrow { display:block; text-transform:uppercase; letter-spacing:.25em; font-size:.7rem; color:var(--brass); }
      .ch-title { font-size: 2.2rem; font-weight:800; letter-spacing:-0.03em; line-height:1.05; }
      .chapter p { text-align:left; }
      .title-page h1 { font-weight:900; letter-spacing:-0.03em; }
    `,
  },
];

export function getTheme(id: string | undefined | null): BookTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
