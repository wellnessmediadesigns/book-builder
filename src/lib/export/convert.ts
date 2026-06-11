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
          return `<ul>${(node.content ?? []).map((li) => `<li>${inlineToHtml(li.content?.[0]?.content)}</li>`).join("")}</ul>`;
        case "orderedList":
          return `<ol>${(node.content ?? []).map((li) => `<li>${inlineToHtml(li.content?.[0]?.content)}</li>`).join("")}</ol>`;
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
          return (node.content ?? []).map((li) => `- ${inlineToMd(li.content?.[0]?.content)}`).join("\n");
        case "orderedList":
          return (node.content ?? []).map((li, i) => `${i + 1}. ${inlineToMd(li.content?.[0]?.content)}`).join("\n");
        case "paragraph":
          return inlineToMd(node.content);
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}
