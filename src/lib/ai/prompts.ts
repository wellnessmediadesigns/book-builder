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

/** Analyzes a writing sample and infers setup fields + a reusable style signature. */
export function styleAnalysisMessages(sample: string): AiMessage[] {
  const schema = `{
  "kind": "fiction" | "nonfiction",
  "genre": "best-fit genre",
  "bookType": "Novel | Memoir | Self-help | Business | Children's book | Devotional | Educational | Workbook | Short guide",
  "audience": "who this is written for",
  "tone": "the tone in a few words",
  "style": "the prose style in a phrase (e.g. lyrical, plain-spoken, punchy)",
  "readingLevel": "e.g. General adult, Middle grade",
  "narrativeStyle": "for fiction, e.g. close third, first person; else ''",
  "pov": "point of view, or ''",
  "theme": "central theme(s)",
  "styleNotes": "3-5 sentences describing the voice precisely enough to reproduce it: sentence length and rhythm, vocabulary, use of dialogue/imagery, pacing, and any signature habits"
}`;
  return [
    {
      role: "system",
      content:
        "You are a literary style analyst. Read the sample and describe its voice and category precisely so another author could write a matching book.",
    },
    {
      role: "user",
      content: `Analyze this writing sample and return ONLY minified JSON matching the schema — no commentary, no fences.

SCHEMA:
${schema}

SAMPLE:
"""${sample.slice(0, 9000)}"""`,
    },
  ];
}

// ————————————————————————————————————————————— Brainstorm

const BRAINSTORM_SYSTEM = `You are Muse, the brainstorming partner inside Quire, a premium book-writing studio.
You help an author discover what book to write, then steadily converge on a single clear direction. How you work:
- Be a generative, encouraging thought partner — warm, sharp, and concrete. Never take over; the author decides.
- Offer real substance: specific book concepts, angles, hooks, audiences, titles, and "what makes this different".
- Prefer a few strong, concrete options over vague musing. When useful, give a short numbered list.
- CONVERGE: as the author shows interest in an option, build on it and help lock in the concept, title, audience, key points, and tone. Reflect back what you both seem to be agreeing on.
- End most replies with ONE focused question that moves the chosen direction forward (the audience? the angle? the title? the chapters?).
- Keep replies tight and skimmable (a few short paragraphs or a short list). No filler, no "AI tells", no markdown headers.`;

/** A turn in the brainstorming chat. `history` is prior messages oldest-first. */
export function brainstormMessages(
  history: { role: "user" | "assistant"; content: string }[],
  userTurn: string,
): AiMessage[] {
  const msgs: AiMessage[] = [{ role: "system", content: BRAINSTORM_SYSTEM }];
  for (const m of history.slice(-20)) msgs.push({ role: m.role, content: m.content });
  msgs.push({ role: "user", content: userTurn });
  return msgs;
}

/** Re-derives the session's agreed "direction" (working title + bullets) from the
 *  conversation, merging with the existing direction. Strict JSON. */
export function directionMessages(
  existing: { title: string; bullets: string[] },
  transcript: string,
): AiMessage[] {
  const schema = `{
  "title": "the current working title, or '' if not chosen yet",
  "bullets": ["5-10 short bullets of what the author has agreed on / shown clear interest in: the concept, audience, key points/chapters, hook, tone, angle"]
}`;
  const cur = existing.bullets.length || existing.title
    ? `${existing.title ? `Title: ${existing.title}\n` : ""}${existing.bullets.map((b) => `- ${b}`).join("\n")}`
    : "(empty so far)";
  return [
    {
      role: "system",
      content:
        "You maintain a running 'book direction' from a brainstorming chat — only the details the author has agreed on or shown clear interest in, never every idea raised. Refine and de-dupe; keep bullets short and concrete. Return ONLY minified JSON — no commentary, no fences.",
    },
    {
      role: "user",
      content: `Update the book direction from the conversation. Keep only what the author actually liked or agreed to; drop options they passed on. Merge with the current direction below.

CURRENT DIRECTION:
${cur}

CONVERSATION (most recent is most important):
"""${transcript.slice(-6000)}"""

Respond with ONLY valid minified JSON matching this schema (no fences):
${schema}`,
    },
  ];
}

/** Turns the agreed direction + transcript into a full book setup (strict JSON → ProjectInput). */
export function brainstormSetupMessages(
  direction: { title: string; bullets: string[] },
  transcript: string,
): AiMessage[] {
  const schema = `{
  "title": "working title",
  "idea": "2-4 sentence description of the book's heart and what it delivers",
  "theme": "central theme(s)",
  "kind": "fiction | nonfiction",
  "genre": "best-fit genre",
  "bookType": "Novel | Memoir | Self-help | Business | Children's book | Devotional | Educational | Workbook | Short guide",
  "audience": "who this is written for",
  "tone": "the tone in a few words",
  "style": "the prose style in a phrase",
  "readingLevel": "e.g. General adult",
  "narrativeStyle": "for fiction e.g. close third; else ''",
  "pov": "point of view, or ''",
  "include": "things to include, or ''",
  "avoid": "things to avoid, or ''",
  "goals": "what the book should achieve, or ''",
  "chapterCount": 10,
  "minWords": 1200,
  "maxWords": 2500
}`;
  const dir = direction.bullets.length || direction.title
    ? `${direction.title ? `Title: ${direction.title}\n` : ""}${direction.bullets.map((b) => `- ${b}`).join("\n")}`
    : "(none — infer from the conversation)";
  return [
    {
      role: "system",
      content:
        "You turn an author's agreed brainstorm direction into a concrete book setup they can start from. Honor the agreed direction above all; use the conversation only for extra flavor. Return ONLY minified JSON — no commentary, no fences.",
    },
    {
      role: "user",
      content: `Design a complete book setup from this agreed direction.

AGREED DIRECTION (the source of truth):
${dir}

CONVERSATION (extra context only):
"""${transcript.slice(-4000)}"""

Pick realistic numbers (chapterCount 6-24; sensible word ranges for the book type). Fill every field; use "" only where truly not applicable.
Respond with ONLY valid minified JSON matching this schema (no fences):
${schema}`,
    },
  ];
}

export type BookContext = {
  workType?: string; // "book" | "newsletter"
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
  seriesName?: string;
  styleNotes?: string;
  memory: { kind: string; title: string; body: string }[];
  priorSummaries: { title: string; summary: string }[];
};

export function contextBlock(ctx: BookContext): string {
  const news = ctx.workType === "newsletter";
  const lines: string[] = [];
  if (news) lines.push(`NEWSLETTER BRAND: "${ctx.title}"`);
  else lines.push(`BOOK: "${ctx.title}" — ${ctx.bookType} (${ctx.kind})`);
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
  if (ctx.seriesName)
    lines.push(
      `SERIES: Part of "${ctx.seriesName}". Keep the same voice, tone, and reading experience as the other books in this series so readers feel continuity across the series.`,
    );
  if (ctx.styleNotes) lines.push(`VOICE SIGNATURE (match this style closely): ${ctx.styleNotes}`);

  if (ctx.memory.length) {
    lines.push(news
      ? "\nBRAND KNOWLEDGE (keep consistent — never contradict):"
      : "\nBOOK MEMORY (keep consistent — never contradict):");
    for (const m of ctx.memory.slice(0, 40)) {
      lines.push(`- [${m.kind}] ${m.title}${m.body ? `: ${m.body}` : ""}`);
    }
  }
  if (ctx.priorSummaries.length) {
    lines.push(news ? "\nPREVIOUS ISSUES (for consistency):" : "\nSTORY SO FAR (previous chapter summaries):");
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
Chapter "title" must be the title ONLY — do NOT prefix it with "Chapter 1:", "Ch. 2 -", or any number; the app adds chapter numbers automatically.
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

// ————————————————————————————————————————————— Newsletters

/** Content plan for a newsletter brand — a series of issue ideas (strict JSON). */
export function contentPlanMessages(ctx: BookContext, idea: string, extras: string): AiMessage[] {
  const schema = `{
  "recommendedName": "the single best name for this newsletter",
  "positioning": "one-sentence positioning — who it's for and the promise",
  "readerPromise": "what a subscriber consistently gets",
  "tableOfContents": [{ "title": "issue subject line / title", "summary": "2-3 sentence angle for this issue" }],
  "keyConcepts": [{ "name": "recurring theme or segment", "description": "" }],
  "styleGuide": ["concrete voice/style rules for the brand"],
  "toneGuide": ["concrete tone rules"],
  "continuityGuide": ["brand facts/offers/links to keep consistent across issues"],
  "readerJourney": "how a subscriber benefits over time"
}`;
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Plan a newsletter as a branded series of issues.

${contextBlock(ctx)}

WHAT THIS NEWSLETTER IS ABOUT: ${idea}
${extras ? `\nBRAND NOTES: ${extras}` : ""}

Generate a content plan: a table of contents of issue ideas (use the planned issue count), each a
concrete subject line + the angle for that issue. Keep "characters"/"settings" empty.
Issue "title" must be the subject/title ONLY — no "Issue 1:" prefix.

Respond with ONLY valid minified JSON matching this schema (no markdown fences):
${schema}`,
    },
  ];
}

/** Generate one newsletter issue (an email), in the brand voice, continuity-aware. */
export function newsletterIssueMessages(
  ctx: BookContext,
  issue: { title: string; summary: string; minWords: number; maxWords: number },
): AiMessage[] {
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Write ONE newsletter issue — a single email — in this brand's established voice.

${contextBlock(ctx)}

ISSUE TO WRITE: "${issue.title}"
What this issue should deliver: ${issue.summary || "A valuable, on-brand issue."}
Target length: ${issue.minWords}–${issue.maxWords} words.

How to write it:
- Open with a strong hook in the first line — no "Hi everyone" filler and no subject-line label.
- Make it skimmable: short paragraphs, the occasional short subhead, and lists where they help.
- Sound exactly like the brand voice above; stay consistent with the brand knowledge and previous issues.
- End with one clear takeaway or call to action.
Write the full issue now as clean prose (use a line like a subhead on its own line where useful).`,
    },
  ];
}

export function continueChapterMessages(ctx: BookContext, existing: string, chapter: { title: string; summary: string; maxWords: number }): AiMessage[] {
  const add = Math.max(300, Math.round(chapter.maxWords / 3));
  const paras = existing.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const lastPara = paras[paras.length - 1] ?? existing;
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Make this chapter longer by about ${add} words AND fix its ending so it doesn't stop abruptly or end twice.

${contextBlock(ctx)}

CHAPTER: "${chapter.title}" — goal: ${chapter.summary}

You are REWRITING the chapter from its final paragraph onward. Everything before that paragraph stays exactly as-is and is NOT shown again — do not reproduce it.

THE FINAL PARAGRAPH YOU ARE REPLACING:
"""${lastPara}"""

What to write:
- Reopen the moment from where that final paragraph begins, continue the scene with about ${add} words of new material in the same voice and tense, and then bring the chapter to a fresh, natural close.
- If that final paragraph was a sign-off or conclusion (e.g. drifting off to sleep), do NOT keep its wording or repeat the farewell — your new ending replaces it.
- The seam must be invisible: your first words should flow naturally from the paragraph that came before.

Output ONLY the replacement text (it will replace that final paragraph). No quotes, labels, or commentary.

FULL CURRENT TEXT (for context only):
"""${existing.slice(-2600)}"""`,
    },
  ];
}

/** Selection / chapter command catalogue. Each is a forceful, concrete directive. */
export const COMMANDS: Record<string, string> = {
  rewrite: "Rewrite this passage from scratch in fresh wording, keeping the meaning but clearly improving the craft. The result must read noticeably differently.",
  improve: "Noticeably improve the writing — sharpen word choice, vary sentence rhythm, cut flab, and strengthen imagery. Make real changes, not cosmetic ones.",
  expand: "Lengthen this substantially — add new sentences with depth, detail, and development. It must be clearly longer than the original.",
  condense: "Tighten this significantly — cut redundancy and trim to the essentials. It must be clearly shorter than the original.",
  humanize: "Rewrite so it sounds unmistakably human — warm, varied sentence lengths, natural rhythm, no formulaic phrasing or AI tells.",
  clarity: "Rewrite for immediate clarity — restructure confusing sentences so the meaning lands at once.",
  flow: "Rewrite so the sentences and ideas connect smoothly — add transitions and fix abrupt jumps.",
  readability: "Rewrite to read more easily for the target reader — simpler structure, cleaner sentences, without dumbing down the ideas.",
  emotion: "Rewrite to add real emotional interiority — the character's feelings, reactions, and stakes. Add new emotional beats.",
  description: "Rewrite to add vivid, specific sensory description — sights, sounds, textures. Add at least one or two new descriptive sentences.",
  dialogue: "Rewrite to add natural spoken dialogue with new lines of speech that reveal character. Add quoted dialogue that isn't there now.",
  tension: "Rewrite to raise the tension and stakes noticeably — add uncertainty, urgency, or conflict.",
  pacing: "Rewrite to improve pacing — adjust sentence and paragraph length so the rhythm fits the moment.",
  examples: "Rewrite to add at least one concrete, specific example that illustrates the point.",
  persuasive: "Rewrite to be clearly more persuasive — stronger claims, evidence, and a compelling case.",
  grammar: "Fix every grammar, spelling, and punctuation error. Change wording only where needed for correctness.",
  repetition: "Rewrite to remove repeated words, phrases, and ideas — vary the language.",
  tone: "Rewrite to better match the book's established tone and voice.",
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
      content: `You are revising one passage from a book. Apply this change and return the rewritten passage.

TASK: ${directive}

CRITICAL RULES:
- You MUST actually change the text. Returning the passage unchanged or only trivially reworded is a failure.
- When the task says "add", genuinely add new sentences/content. When it says longer/shorter, change the length.
- Preserve the book's voice, tense, and point of view, and stay in the same scene.
- Output ONLY the revised passage as plain prose — no quotes, no labels, no commentary, no explanation.

${contextBlock(ctx)}

SURROUNDING CONTEXT (for consistency only — do NOT repeat or include it in your output):
"""${surrounding.slice(0, 1200)}"""

PASSAGE TO REVISE:
"""${selectedText}"""

Rewritten passage:`,
    },
  ];
}

/** Distills a written chapter into a tight continuity summary for Book Memory. */
export function summaryMessages(title: string, text: string): AiMessage[] {
  return [
    { role: "system", content: QUIRE_SYSTEM },
    {
      role: "user",
      content: `Summarize this chapter in 2-3 sentences for a continuity bible. Capture what
actually happens, any new facts, and any threads opened or resolved — so a later chapter
stays consistent. Write plain prose, no preamble.

CHAPTER: "${title}"
"""${text.slice(0, 8000)}"""`,
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
