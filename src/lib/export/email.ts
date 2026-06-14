/** Email-friendly export for a single newsletter issue: a clean, ~600px,
 *  web-safe HTML email you can paste straight into Gmail/Outlook (formatting
 *  intact), plus a plain-text fallback. Reuses the same single-issue package. */

import { docToHtml, docToMarkdown } from "./convert";
import { cleanChapterTitle } from "@/lib/utils";
import type { BookPackage } from "./manuscript";

function parse(json: string | null) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A single issue (pkg.chapters[0]) as an email-safe HTML document. */
export function buildEmailHtml(pkg: BookPackage): string {
  const brand = pkg.meta.displayTitle;
  const issue = pkg.chapters[0];
  const title = issue ? cleanChapterTitle(issue.title) : brand;
  const body = issue ? docToHtml(parse(issue.contentJson)) : "<p>This issue is empty.</p>";

  // Inline-friendly styles + a 600px centered column. No external fonts.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b1e2b;line-height:1.65;font-size:16px;">
    <div style="border-bottom:1px solid #ece7dd;padding-bottom:14px;margin-bottom:24px;">
      <span style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8c6536;font-weight:700;">${esc(brand)}</span>
    </div>
    <h1 style="font-size:26px;line-height:1.25;margin:0 0 20px;color:#14161f;font-weight:800;">${esc(title)}</h1>
    <div class="nl-body">
      ${body}
    </div>
    <div style="border-top:1px solid #ece7dd;margin-top:32px;padding-top:16px;font-size:13px;color:#9aa0a6;">
      <p style="margin:0;">You're reading <strong>${esc(brand)}</strong>.</p>
    </div>
  </div>
  <style>
    .nl-body p { margin:0 0 16px; }
    .nl-body h2 { font-size:20px;font-weight:700;margin:28px 0 10px;color:#14161f; }
    .nl-body h3 { font-size:17px;font-weight:700;margin:22px 0 8px;color:#14161f; }
    .nl-body ul, .nl-body ol { margin:0 0 16px;padding-left:22px; }
    .nl-body li { margin:0 0 6px; }
    .nl-body blockquote { margin:18px 0;padding:4px 0 4px 16px;border-left:3px solid #B5894F;color:#4a4e5e;font-style:italic; }
    .nl-body a { color:#6B5CC4; }
  </style>
</body>
</html>`;
}

/** A single issue as plain text (for plain-text emails). */
export function buildPlainText(pkg: BookPackage): string {
  const issue = pkg.chapters[0];
  const title = issue ? cleanChapterTitle(issue.title) : pkg.meta.displayTitle;
  const md = issue ? docToMarkdown(parse(issue.contentJson)) : "";
  // Strip the lightweight markdown markers for a clean reading email.
  const text = md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "• ");
  return `${title}\n\n${text}`.trim() + "\n";
}
