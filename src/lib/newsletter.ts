/** Shared (non-server) newsletter constants. */

/** Word ranges per issue length. Newsletters are SHORT by default. */
export const NEWSLETTER_LENGTHS: Record<string, [number, number]> = {
  short: [300, 600],
  standard: [600, 1100],
  long: [1100, 2000],
};

export type IssueLength = keyof typeof NEWSLETTER_LENGTHS;

/** Publishing cadences offered in the UI. */
export const CADENCES = ["weekly", "biweekly", "monthly"] as const;
export type Cadence = (typeof CADENCES)[number];

/** A brainstorm-built newsletter starts as ONE complete, short issue. */
export const NEWSLETTER_DEFAULTS = {
  issueCount: 1,
  minIssues: 1,
  maxIssues: 1,
  length: "short" as IssueLength,
};
