/** Shared vocabulary so one codebase serves both books and newsletters. */

export type WorkType = "book" | "newsletter";

export type WorkVocab = {
  type: WorkType;
  /** "Book" | "Newsletter" */
  work: string;
  /** "book" | "newsletter brand" */
  workLower: string;
  /** "Chapter" | "Issue" */
  unit: string;
  /** "Chapters" | "Issues" */
  units: string;
  /** "chapter" | "issue" — for mid-sentence use */
  unitLower: string;
  /** "chapters" | "issues" — for mid-sentence use */
  unitsLower: string;
  /** "chapter" | "issue" — unit a word-count goal applies to */
  lengthUnit: string;
  /** "Outline" | "Issues" */
  outline: string;
  /** "Blueprint" | "Content plan" */
  plan: string;
  /** "Book Memory" | "Brand knowledge" */
  memory: string;
  /** "Setup" | "Brand" */
  setup: string;
  /** home route */
  home: string;
  /** create-new route */
  newHref: string;
  /** brainstorm home route */
  brainstormHref: string;
  /** trash route */
  trashHref: string;
};

const BOOK: WorkVocab = {
  type: "book",
  work: "Book",
  workLower: "book",
  unit: "Chapter",
  units: "Chapters",
  unitLower: "chapter",
  unitsLower: "chapters",
  lengthUnit: "chapter",
  outline: "Outline",
  plan: "Blueprint",
  memory: "Book Memory",
  setup: "Setup",
  home: "/studio",
  newHref: "/studio/new",
  brainstormHref: "/studio/brainstorm",
  trashHref: "/studio/trash",
};

const NEWSLETTER: WorkVocab = {
  type: "newsletter",
  work: "Newsletter",
  workLower: "newsletter brand",
  unit: "Issue",
  units: "Issues",
  unitLower: "issue",
  unitsLower: "issues",
  lengthUnit: "issue",
  outline: "Issues",
  plan: "Content plan",
  memory: "Brand knowledge",
  setup: "Brand",
  home: "/studio/newsletters",
  newHref: "/studio/newsletters/new",
  brainstormHref: "/studio/newsletters/brainstorm",
  trashHref: "/studio/newsletters/trash",
};

export function workVocab(workType: string | null | undefined): WorkVocab {
  return workType === "newsletter" ? NEWSLETTER : BOOK;
}

export function isNewsletter(workType: string | null | undefined): boolean {
  return workType === "newsletter";
}
