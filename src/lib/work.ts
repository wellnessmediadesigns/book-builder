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
};

const BOOK: WorkVocab = {
  type: "book",
  work: "Book",
  workLower: "book",
  unit: "Chapter",
  units: "Chapters",
  outline: "Outline",
  plan: "Blueprint",
  memory: "Book Memory",
  setup: "Setup",
  home: "/studio",
};

const NEWSLETTER: WorkVocab = {
  type: "newsletter",
  work: "Newsletter",
  workLower: "newsletter brand",
  unit: "Issue",
  units: "Issues",
  outline: "Issues",
  plan: "Content plan",
  memory: "Brand knowledge",
  setup: "Brand",
  home: "/studio/newsletters",
};

export function workVocab(workType: string | null | undefined): WorkVocab {
  return workType === "newsletter" ? NEWSLETTER : BOOK;
}

export function isNewsletter(workType: string | null | undefined): boolean {
  return workType === "newsletter";
}
