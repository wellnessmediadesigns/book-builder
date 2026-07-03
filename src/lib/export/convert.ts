type Node = {
  type?: string;
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, unknown>;
  content?: Node[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineToHtml(nodes: Node[] = []): string {
  return nodes
    .map((n) => {
      if (n.type !== "text") return inlineToHtml(n.content);
      let t = escapeHtml(n.text ?? "");
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `<strong>${t}</strong>`;
        else if (m.type === "italic") t = `<em>${t}</em>`;
        else if (m.type === "underline") t = `<u>${t}</u>`;
        else if (m.type === "lock") t = `<span class="locked">${t}</span>`;
      }
      return t;
    })
    .join("");
}

function inlineToMd(nodes: Node[] = []): string {
  return nodes
    .map((n) => {
      if (n.type !== "text") return inlineToMd(n.content);
      let t = n.text ?? "";
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `**${t}**`;
        else if (m.type === "italic") t = `*${t}*`;
      }
      return t;
    })
    .join("");
}

/** Full list-item body: every paragraph child plus nested lists — a list item
 *  with more than one paragraph no longer silently loses the rest. */
function liHtml(li: Node): string {
  return (li.content ?? [])
    .map((child) => {
      if (child.type === "paragraph") return inlineToHtml(child.content);
      if (child.type === "bulletList" || child.type === "orderedList") {
        const tag = child.type === "orderedList" ? "ol" : "ul";
        return `<${tag}>${(child.content ?? []).map((x) => `<li>${liHtml(x)}</li>`).join("")}</${tag}>`;
      }
      return "";
    })
    .filter(Boolean)
    .join("<br/>");
}

export function docToHtml(doc: Node | null): string {
  if (!doc?.content) return "";
  return doc.content
    .map((node) => {
      switch (node.type) {
        case "heading": {
          const lvl = Math.min(3, Number(node.attrs?.level ?? 2)) + 1; // h3/h4 within chapter
          return `<h${lvl}>${inlineToHtml(node.content)}</h${lvl}>`;
        }
        case "blockquote":
          return `<blockquote>${docToHtml(node)}</blockquote>`;
        case "bulletList":
          return `<ul>${(node.content ?? []).map((li) => `<li>${liHtml(li)}</li>`).join("")}</ul>`;
        case "orderedList":
          return `<ol>${(node.content ?? []).map((li) => `<li>${liHtml(li)}</li>`).join("")}</ol>`;
        case "paragraph": {
          const inner = inlineToHtml(node.content);
          return inner ? `<p>${inner}</p>` : "";
        }
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

// ——— Normalized blocks for binary exporters (DOCX / EPUB) ———

export type Run = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type Block =
  | { type: "p" | "quote"; runs: Run[] }
  | { type: "h"; level: number; runs: Run[] }
  | { type: "list"; ordered: boolean; items: Run[][] };

function inlineToRuns(nodes: Node[] = []): Run[] {
  const out: Run[] = [];
  for (const n of nodes) {
    if (n.type !== "text") {
      out.push(...inlineToRuns(n.content));
      continue;
    }
    const marks = new Set((n.marks ?? []).map((m) => m.type));
    out.push({
      text: n.text ?? "",
      bold: marks.has("bold") || undefined,
      italic: marks.has("italic") || undefined,
      underline: marks.has("underline") || undefined,
    });
  }
  return out;
}

/** Every item's full content (all paragraphs, space-joined) plus nested list
 *  items flattened to the same level — binary exporters keep all the text. */
function flattenListItems(list: Node): Run[][] {
  const items: Run[][] = [];
  for (const li of list.content ?? []) {
    const runs: Run[] = [];
    const nested: Run[][] = [];
    for (const child of li.content ?? []) {
      if (child.type === "paragraph") {
        const r = inlineToRuns(child.content);
        if (runs.length && r.length) runs.push({ text: " " });
        runs.push(...r);
      } else if (child.type === "bulletList" || child.type === "orderedList") {
        nested.push(...flattenListItems(child));
      }
    }
    if (runs.length) items.push(runs);
    items.push(...nested);
  }
  return items;
}

/** Flattens a TipTap doc into exporter-friendly blocks. */
export function docToBlocks(doc: Node | null): Block[] {
  if (!doc?.content) return [];
  const blocks: Block[] = [];
  for (const node of doc.content) {
    switch (node.type) {
      case "heading":
        blocks.push({
          type: "h",
          level: Math.min(3, Number(node.attrs?.level ?? 2)),
          runs: inlineToRuns(node.content),
        });
        break;
      case "blockquote":
        for (const inner of node.content ?? []) {
          blocks.push({ type: "quote", runs: inlineToRuns(inner.content) });
        }
        break;
      case "bulletList":
      case "orderedList":
        blocks.push({
          type: "list",
          ordered: node.type === "orderedList",
          items: flattenListItems(node),
        });
        break;
      case "paragraph": {
        const runs = inlineToRuns(node.content);
        if (runs.some((r) => r.text.trim())) blocks.push({ type: "p", runs });
        break;
      }
    }
  }
  return blocks;
}

/** Markdown list lines with full item content and indented nested lists. */
function listMd(list: Node, ordered: boolean, indent = ""): string[] {
  const lines: string[] = [];
  let n = 0;
  for (const li of list.content ?? []) {
    n++;
    const body = (li.content ?? [])
      .filter((c) => c.type === "paragraph")
      .map((c) => inlineToMd(c.content))
      .filter(Boolean)
      .join(" ");
    lines.push(`${indent}${ordered ? `${n}.` : "-"} ${body}`);
    for (const child of li.content ?? []) {
      if (child.type === "bulletList") lines.push(...listMd(child, false, indent + "  "));
      else if (child.type === "orderedList") lines.push(...listMd(child, true, indent + "  "));
    }
  }
  return lines;
}

export function docToMarkdown(doc: Node | null): string {
  if (!doc?.content) return "";
  return doc.content
    .map((node) => {
      switch (node.type) {
        case "heading": {
          const lvl = Math.min(3, Number(node.attrs?.level ?? 2));
          return `${"#".repeat(lvl + 1)} ${inlineToMd(node.content)}`;
        }
        case "blockquote":
          return `> ${inlineToMd(node.content?.[0]?.content)}`;
        case "bulletList":
          return listMd(node, false).join("\n");
        case "orderedList":
          return listMd(node, true).join("\n");
        case "paragraph":
          return inlineToMd(node.content);
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}
