import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function readingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / 230));
  return `${minutes} min read`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function relativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Writing late tonight";
}

/** Convert a TipTap JSON doc to plaintext (for word count + AI context). */
export function docToText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const node = doc as { type?: string; text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (!Array.isArray(node.content)) return "";
  const block = new Set(["paragraph", "heading", "blockquote", "listItem"]);
  return node.content
    .map((c) => {
      const child = c as { type?: string };
      const inner = docToText(c);
      return block.has(child.type ?? "") ? inner + "\n\n" : inner;
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Build a minimal TipTap doc from plain paragraphs (used by generation). */
export function textToDoc(text: string) {
  const blocks = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return {
    type: "doc",
    content:
      blocks.length === 0
        ? [{ type: "paragraph" }]
        : blocks.map((p) => {
            const heading = /^#{1,3}\s/.exec(p);
            if (heading) {
              const level = heading[0].trim().length;
              return {
                type: "heading",
                attrs: { level },
                content: [{ type: "text", text: p.replace(/^#{1,3}\s/, "") }],
              };
            }
            return { type: "paragraph", content: [{ type: "text", text: p }] };
          }),
  };
}

/** Strips a leading "Chapter 2:", "Ch. 2 -", "2." etc. so titles don't double up
 *  with the chapter-number label the formatting already shows. */
export function cleanChapterTitle(title: string): string {
  const stripped = title
    .replace(/^\s*chapter\s+[\divxlcdm]+\s*[:.\-–—)]*\s*/i, "")
    .replace(/^\s*ch\.?\s*\d+\s*[:.\-–—)]*\s*/i, "")
    .replace(/^\s*\d+\s*[:.\-–—)]\s*/, "")
    .trim();
  return stripped || title.trim();
}

/** Arabic → Roman numerals (for formatting themes). */
export function toRoman(n: number): string {
  if (n <= 0) return String(n);
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let r = n;
  for (const [v, s] of map) while (r >= v) { out += s; r -= v; }
  return out;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
