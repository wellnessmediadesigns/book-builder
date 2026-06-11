import type { AiMessage } from "./types";

/** The constitution every Quire AI call inherits. The author always owns the words. */
export const QUIRE_SYSTEM = `You are the writing assistant inside Quire, a premium book-writing studio.
Principles you never break:
- The user is the author. You are the assistant. You help; you never take over.
- Write prose a human would be proud to sign. Avoid clichés, filler, and "AI tells"
  (no "in conclusion", "in today's fast-paced world", "delve", "tapestry", "moreover" pile-ups).
- Match the book's established tone, style, point of view, and reading level exactly.
- Maintain continuity with everything in the Book Memory and prior chapters. Never contradict it.
- Return only the requested writing. No preamble, no meta commentary, no markdown fences
  unless the format explicitly calls for headings.`;

export type BookContext = {
  title: string;
  kind: string;
  bookType: string;
  genre: string;
  audience: string;
  tone: string;
  style: string;
  readingLevel: string;
  pov: string;
  narrativeStyle: string;
  readerPromise: string;
  include: string;
  avoid: string;
  memory: { kind: string; title: string; body: string }[];
  priorSummaries: { title: string; summary: string }[];
};

export function contextBlock(ctx: BookContext): string {
  const lines: string[] = [];
  lines.push(`BOOK: "${ctx.title}" — ${ctx.bookType} (${ctx.kind})`);
  if (ctx.genre) lines.push(`Genre: ${ctx.genre}`);
  if (ctx.audience) lines.push(`Audience: ${ctx.audience}`);
  if (ctx.tone) lines.push(`Tone: ${ctx.tone}`);
  if (ctx.style) lines.push(`Style: ${ctx.style}`);
  if (ctx.readingLevel) lines.push(`Reading level: ${ctx.readingLevel}`);
  if (ctx.pov) lines.push(`Point of view: ${ctx.pov}`);
  if (ctx.narrativeStyle) lines.push(`Narrative style: ${ctx.narrativeStyle}`);
  if (ctx.readerPromise) lines.push(`Reader promise: ${ctx.readerPromise}`);
  if (ctx.include) lines.push(`Must include where relevant: ${ctx.include}`);
  if (ctx.avoid) lines.push(`Must avoid: ${ctx.avoid}`);

  if (ctx.memory.length) {
    lines.push("\nBOOK MEMORY (keep consistent — never contradict):");
    for (const m of ctx.memory.slice(0, 40)) {
      lines.push(`- [${m.kind}] ${m.title}${m.body ? `: ${m.body}` : ""}`);
    }
  }
  if (ctx.priorSummaries.length) {
    lines.push("\nSTORY SO FAR (previous chapter summaries):");
    for (const s of ctx.priorSummaries) {
      lines.push(`- ${s.title}: ${s.summary}`);
    }
  }
  return lines.join("\n");
}

/** STEP 3 — full blueprint as strict JSON. */
export function blueprintMessages(ctx: BookContext, idea: string, extras: string): AiMessage[] {
  const schema = `{
  "titleOptions": ["3-6 compelling title options"],
  "subtitleOptions": ["3-5 subtitle options"],
  "recommendedTitle": "the single best title",
  "recommendedSubtitle": "best subtitle",
  "positioning": "one-sentence positioning statement",
  "readerPromise": "the transformation/experience the reader is promised",
  "tableOfContents": [{ "title": "Chapter title", "summary": "2-3 sentence summary" }],
  "characters": [{ "name": "", "role": "", "description": "" }],
  "settings": [{ "name": "", "description": "" }],
  "keyConcepts": [{ "name": "", "description": "" }],
  "styleGuide": ["concrete style rules"],
  "toneGuide": ["concrete tone rules"],
  "continuityGuide": ["facts/threads to keep consistent"],
  "readerJourney": "how the reader changes from first to last page",
  "frontMatter": ["recommended front matter sections"],
  "backMatter": ["recommended back matter sections"]
}`;
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Create a complete book blueprint.

${contextBlock(ctx)}

CORE IDEA: ${idea}
${extras ? `\nAUTHOR NOTES: ${extras}` : ""}

Generate exactly ${ctx.priorSummaries.length || "the planned number of"} chapters worth of table of contents matching the requested chapter count.
For fiction, fill "characters" and "settings" and leave "keyConcepts" empty.
For nonfiction, fill "keyConcepts" and leave "characters"/"settings" empty.

Respond with ONLY valid minified JSON matching this schema (no markdown fences):
${schema}`,
    },
  ];
}

/** STEP 4 — generate one chapter, fully continuity-aware. */
export function chapterMessages(
  ctx: BookContext,
  chapter: { title: string; summary: string; minWords: number; maxWords: number },
): AiMessage[] {
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Write ONE chapter of this book — not the whole book.

${contextBlock(ctx)}

CHAPTER TO WRITE: "${chapter.title}"
What this chapter must accomplish: ${chapter.summary || "Advance the book per the outline."}
Target length: ${chapter.minWords}–${chapter.maxWords} words.

Open with the prose itself (no "Chapter X" label — Quire handles headings).
Use blank lines between paragraphs. Use it as part of a continuous book; pick up naturally
from the story so far and set up what comes next. Write the full chapter now.`,
    },
  ];
}

export function continueChapterMessages(ctx: BookContext, existing: string, chapter: { title: string; summary: string; maxWords: number }): AiMessage[] {
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Continue writing this chapter from exactly where it stops. Do not repeat existing text.

${contextBlock(ctx)}

CHAPTER: "${chapter.title}" — goal: ${chapter.summary}
Add roughly ${Math.max(300, Math.round(chapter.maxWords / 3))} more words that flow seamlessly.

CURRENT TEXT (continue after the final word):
"""${existing.slice(-2400)}"""`,
    },
  ];
}

/** Selection / chapter command catalogue. */
export const COMMANDS: Record<string, string> = {
  rewrite: "Rewrite this, keeping the meaning but improving the craft.",
  improve: "Improve the writing quality — word choice, rhythm, precision.",
  expand: "Expand this with more depth and substance, staying on point.",
  condense: "Condense this to be tighter and more economical without losing meaning.",
  humanize: "Make this sound naturally human — warm, varied, never robotic or formulaic.",
  clarity: "Improve clarity so the meaning is immediately understood.",
  flow: "Improve the flow and transitions between sentences and ideas.",
  readability: "Improve readability for the target reader without dumbing it down.",
  emotion: "Deepen the emotional resonance honestly, without melodrama.",
  description: "Add vivid, purposeful sensory description.",
  dialogue: "Add or strengthen natural dialogue that reveals character.",
  tension: "Increase tension and stakes.",
  pacing: "Improve the pacing.",
  examples: "Add concrete, illustrative examples.",
  persuasive: "Make this more persuasive and convincing.",
  grammar: "Fix grammar, spelling, and punctuation. Change nothing else.",
  repetition: "Remove repetition and redundancy.",
  tone: "Adjust the tone to better match the book's established voice.",
};

export function selectionMessages(
  ctx: BookContext,
  command: string,
  instruction: string,
  selectedText: string,
  surrounding: string,
): AiMessage[] {
  const directive =
    command === "custom"
      ? instruction
      : COMMANDS[command] ?? "Improve this passage.";
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Revise ONLY the selected passage. Return only the revised passage — same scope, no quotes, no commentary.

${contextBlock(ctx)}

TASK: ${directive}

SURROUNDING CONTEXT (for consistency — do not include in your output):
"""${surrounding.slice(0, 1200)}"""

SELECTED PASSAGE TO REVISE:
"""${selectedText}"""`,
    },
  ];
}

/** Front matter / back matter / marketing section generation. */
export function matterMessages(
  ctx: BookContext,
  authorName: string,
  sectionTitle: string,
  directive: string,
): AiMessage[] {
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `${directive}

${contextBlock(ctx)}

Author name: ${authorName}

You are writing the "${sectionTitle}" section for this specific book. Use everything you
know about it from the context above. Return only the section's text — no surrounding
commentary, no markdown headings unless the section naturally needs labels or lists.`,
    },
  ];
}

/** Chapter-level analysis commands (readability/continuity/repetition checks). */
export function analysisMessages(ctx: BookContext, command: string, text: string): AiMessage[] {
  const asks: Record<string, string> = {
    readability:
      "Assess readability for the target reader. Give a short verdict, an estimated reading level, and 3 specific suggestions.",
    continuity:
      "Check this chapter against the Book Memory and story so far. List any contradictions or continuity risks, or confirm it is consistent.",
    repetition:
      "Identify repeated words, phrases, or ideas in this chapter and suggest concise fixes.",
  };
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `${asks[command] ?? "Analyze this chapter."}\n\n${contextBlock(ctx)}\n\nCHAPTER TEXT:\n"""${text.slice(0, 6000)}"""\n\nRespond in clear, brief markdown.`,
    },
  ];
}
