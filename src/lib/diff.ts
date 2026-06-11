/**
 * Lightweight text diff for the version-compare view.
 * Paragraph-level LCS first (cheap), then word-level LCS inside changed
 * paragraph pairs, with size caps so pathological inputs stay fast.
 */

export type DiffOp = { type: "same" | "add" | "del"; text: string };

function lcsTable<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}

function diffSeq<T>(
  a: T[],
  b: T[],
  eq: (x: T, y: T) => boolean,
): { type: "same" | "add" | "del"; item: T }[] {
  const dp = lcsTable(a, b, eq);
  const out: { type: "same" | "add" | "del"; item: T }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (eq(a[i], b[j])) {
      out.push({ type: "same", item: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", item: a[i] });
      i++;
    } else {
      out.push({ type: "add", item: b[j] });
      j++;
    }
  }
  while (i < a.length) out.push({ type: "del", item: a[i++] });
  while (j < b.length) out.push({ type: "add", item: b[j++] });
  return out;
}

function words(s: string): string[] {
  return s.split(/(\s+)/).filter((w) => w.length > 0);
}

const WORD_CAP = 900; // per-paragraph word-diff cap

function diffParagraphPair(oldP: string, newP: string): DiffOp[] {
  const a = words(oldP);
  const b = words(newP);
  if (a.length > WORD_CAP || b.length > WORD_CAP) {
    return [
      { type: "del", text: oldP },
      { type: "add", text: newP },
    ];
  }
  const ops = diffSeq(a, b, (x, y) => x === y);
  // merge consecutive same-type ops
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) last.text += op.item;
    else merged.push({ type: op.type, text: op.item });
  }
  return merged;
}

export type DiffBlock = { ops: DiffOp[] };

/** Diffs two plain texts paragraph-wise; returns renderable blocks. */
export function diffTexts(oldText: string, newText: string): DiffBlock[] {
  const oldParas = oldText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const newParas = newText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const paraOps = diffSeq(oldParas, newParas, (x, y) => x === y);

  const blocks: DiffBlock[] = [];
  let i = 0;
  while (i < paraOps.length) {
    const op = paraOps[i];
    if (op.type === "same") {
      blocks.push({ ops: [{ type: "same", text: op.item }] });
      i++;
      continue;
    }
    // Collect a run of dels followed by adds and pair them for word-level diff.
    const dels: string[] = [];
    const adds: string[] = [];
    while (i < paraOps.length && paraOps[i].type === "del") dels.push(paraOps[i++].item);
    while (i < paraOps.length && paraOps[i].type === "add") adds.push(paraOps[i++].item);
    const pairs = Math.max(dels.length, adds.length);
    for (let k = 0; k < pairs; k++) {
      const o = dels[k];
      const n = adds[k];
      if (o !== undefined && n !== undefined) blocks.push({ ops: diffParagraphPair(o, n) });
      else if (o !== undefined) blocks.push({ ops: [{ type: "del", text: o }] });
      else blocks.push({ ops: [{ type: "add", text: n! }] });
    }
  }
  return blocks;
}

export function diffStats(blocks: DiffBlock[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const b of blocks) {
    for (const op of b.ops) {
      const n = op.text.split(/\s+/).filter(Boolean).length;
      if (op.type === "add") added += n;
      if (op.type === "del") removed += n;
    }
  }
  return { added, removed };
}
