/**
 * Canonical front matter, back matter, and marketing sections.
 * Stored as Chapter rows with `matterType` = "<group>:<key>"; body chapters
 * keep matterType = null. `inManuscript` controls export inclusion —
 * marketing copy never ships inside the book.
 */

export type MatterGroup = "front" | "back" | "marketing";

export type MatterSection = {
  key: string;
  group: MatterGroup;
  title: string;
  inManuscript: boolean;
  directive: string;
};

export const MATTER_SECTIONS: MatterSection[] = [
  // ——— Front matter ———
  {
    key: "copyright",
    group: "front",
    title: "Copyright page",
    inManuscript: true,
    directive:
      "Write a standard copyright page for this book: copyright line with the current year and author name, all-rights-reserved language, a brief permissions note, and a fiction/nonfiction disclaimer as appropriate. Keep it conventional and concise.",
  },
  {
    key: "disclaimer",
    group: "front",
    title: "Disclaimer",
    inManuscript: true,
    directive:
      "Write an appropriate disclaimer for this book's genre (e.g. not professional advice, names changed, work of fiction). Keep it brief and standard.",
  },
  {
    key: "dedication",
    group: "front",
    title: "Dedication",
    inManuscript: true,
    directive:
      "Write a short, heartfelt dedication (one to three lines) that fits this book's spirit. No heading, just the dedication itself.",
  },
  {
    key: "epigraph",
    group: "front",
    title: "Epigraph",
    inManuscript: true,
    directive:
      "Suggest a fitting epigraph: a short evocative quotation or original line that sets the book's mood, with an attribution line. If inventing an original line, attribute it to the author.",
  },
  {
    key: "foreword",
    group: "front",
    title: "Foreword",
    inManuscript: true,
    directive:
      "Draft a foreword (300-500 words) written in the voice of an admiring colleague or expert introducing this book and why it matters. Mark where the foreword writer's name would go.",
  },
  {
    key: "preface",
    group: "front",
    title: "Preface",
    inManuscript: true,
    directive:
      "Write a preface (300-500 words) in the author's own voice: why they wrote this book, who it is for, and how to read it.",
  },
  {
    key: "introduction",
    group: "front",
    title: "Introduction",
    inManuscript: true,
    directive:
      "Write the book's introduction (500-800 words): hook the reader, frame the promise, and preview the journey ahead without summarizing every chapter.",
  },
  {
    key: "how-to-use",
    group: "front",
    title: "How to Use This Book",
    inManuscript: true,
    directive:
      "Write a concise 'How to Use This Book' section: how the reader should approach it, in what order, and how to get the most from it.",
  },
  {
    key: "about-book",
    group: "front",
    title: "About This Book",
    inManuscript: true,
    directive:
      "Write a short 'About This Book' section: what it is, who it is for, and what the reader will gain.",
  },
  {
    key: "disclaimer",
    group: "front",
    title: "Disclaimer",
    inManuscript: true,
    directive:
      "Write an appropriate disclaimer for this book's genre (e.g. not professional advice, names changed, work of fiction). Keep it brief and standard.",
  },

  // ——— Back matter ———
  {
    key: "conclusion",
    group: "back",
    title: "Conclusion",
    inManuscript: true,
    directive:
      "Write the book's conclusion (400-700 words): resolve the reader journey, reinforce the promise delivered, and leave the reader with a resonant final note.",
  },
  {
    key: "about-author",
    group: "back",
    title: "About the author",
    inManuscript: true,
    directive:
      "Write a warm third-person 'About the Author' section (120-200 words) based on the author's name and this book's voice. Use placeholders like [city] or [previous work] where personal facts are unknown.",
  },
  {
    key: "acknowledgments",
    group: "back",
    title: "Acknowledgments",
    inManuscript: true,
    directive:
      "Draft acknowledgments the author can personalize: thanking family, early readers, and those who shaped the book, with [name] placeholders.",
  },
  {
    key: "reader-questions",
    group: "back",
    title: "Reader questions",
    inManuscript: true,
    directive:
      "Write 8-10 reflective questions that help an individual reader apply or sit with this book, numbered.",
  },
  {
    key: "book-club",
    group: "back",
    title: "Book club questions",
    inManuscript: true,
    directive:
      "Write 8-10 discussion questions for a book club reading this book, numbered, mixing plot/idea questions with personal-connection questions.",
  },
  {
    key: "call-to-action",
    group: "back",
    title: "Call to action",
    inManuscript: true,
    directive:
      "Write a brief call-to-action page inviting the reader to review the book, join the author's mailing list, or continue the journey. Friendly, not pushy. Use [link] placeholders.",
  },
  {
    key: "other-books",
    group: "back",
    title: "Also by the author",
    inManuscript: true,
    directive:
      "Write an 'Also by [Author]' page template with two or three placeholder titles and one-line descriptions the author can replace.",
  },

  // ——— Marketing (never exported inside the manuscript) ———
  {
    key: "back-cover",
    group: "marketing",
    title: "Back cover copy",
    inManuscript: false,
    directive:
      "Write compelling back-cover copy (150-220 words): a hook line, the premise, the stakes or promise, and a closing line that makes a browser buy.",
  },
  {
    key: "amazon-description",
    group: "marketing",
    title: "Amazon description",
    inManuscript: false,
    directive:
      "Write an Amazon/KDP book description (180-300 words) with a bold opening hook, short scannable paragraphs, and a final call to action. Plain text only.",
  },
  {
    key: "subtitle-ideas",
    group: "marketing",
    title: "Subtitle ideas",
    inManuscript: false,
    directive: "Suggest 8 strong alternative subtitles for this book, as a numbered list.",
  },
  {
    key: "marketing-copy",
    group: "marketing",
    title: "Marketing copy",
    inManuscript: false,
    directive:
      "Write a short marketing kit: a one-line elevator pitch, a 50-word blurb, three social post drafts, and an email announcement paragraph. Use clear labels for each.",
  },
  {
    key: "categories",
    group: "marketing",
    title: "Category suggestions",
    inManuscript: false,
    directive:
      "Suggest 6-8 specific bookstore/KDP categories (browse paths) where this book fits best, most specific first.",
  },
  {
    key: "keywords",
    group: "marketing",
    title: "Keyword suggestions",
    inManuscript: false,
    directive:
      "Suggest 10-14 search keywords/phrases readers would use to find this book, one per line, no numbering.",
  },
];

export function sectionByMatterType(matterType: string): MatterSection | undefined {
  const [group, key] = matterType.split(":");
  return MATTER_SECTIONS.find((s) => s.group === group && s.key === key);
}

export function matterTypeOf(s: MatterSection): string {
  return `${s.group}:${s.key}`;
}

/** Canonical ordering index — used for export sequencing. */
export function matterOrder(matterType: string): number {
  const idx = MATTER_SECTIONS.findIndex((s) => matterTypeOf(s) === matterType);
  return idx === -1 ? 999 : idx;
}

/**
 * Standard trade-book placement. Front matter splits around the Table of
 * Contents: copyright/disclaimer/dedication/epigraph come BEFORE it (and are
 * not listed in it); foreword/preface/introduction/etc. come AFTER it (and are
 * listed). Back matter follows the chapters and is listed.
 */
const PRE_TOC_FRONT = new Set(["copyright", "disclaimer", "dedication", "epigraph"]);

export function isPreTocFront(group: string, key: string): boolean {
  return group === "front" && PRE_TOC_FRONT.has(key);
}

export function isListedInToc(group: string, key: string): boolean {
  if (group === "marketing") return false;
  if (group === "front") return !PRE_TOC_FRONT.has(key);
  return true; // back matter
}

