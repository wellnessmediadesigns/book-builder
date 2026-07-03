"use client";

import Link from "next/link";
import { Check, CircleAlert, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookProgress } from "@/lib/actions/projects";

type RowState = "done" | "warn" | "todo";

/**
 * "What's left" checklist — one honest answer to "is my book done?".
 * Shown on the Outline (while writing) and the Export tab (before publishing).
 */
export function BookProgressCard({
  projectId,
  progress,
  compact,
}: {
  projectId: string;
  progress: BookProgress;
  compact?: boolean;
}) {
  const p = progress;
  const base = `/studio/book/${projectId}`;

  const rows: { state: RowState; label: string; href: string }[] = [
    {
      state: p.empty === 0 ? "done" : "todo",
      label:
        p.empty === 0
          ? `All ${p.chapterCount} chapters written`
          : `${p.written} of ${p.chapterCount} chapters written — ${p.empty} still empty`,
      href: `${base}/outline`,
    },
    ...(p.short > 0
      ? [
          {
            state: "warn" as RowState,
            label: `${p.short} ${p.short === 1 ? "chapter is" : "chapters are"} below the word target`,
            href: `${base}/outline`,
          },
        ]
      : []),
    {
      state: p.hasCopyright ? "done" : "todo",
      label: p.hasCopyright ? "Copyright page ready" : "Copyright page not generated yet",
      href: `${base}/matter`,
    },
    {
      state: p.matterDrafted > 0 ? "done" : "todo",
      label:
        p.matterDrafted > 0
          ? `${p.matterDrafted} front/back sections drafted`
          : "No front or back matter yet (dedication, about the author…)",
      href: `${base}/matter`,
    },
    {
      state: p.hasCover ? "done" : "todo",
      label: p.hasCover ? "Front cover uploaded" : "No front cover yet",
      href: `${base}/cover`,
    },
    ...(p.usingDefaultByline
      ? [
          {
            state: "warn" as RowState,
            label: 'Author name is still the placeholder "Author" — set it in Setup or Settings',
            href: `${base}/setup`,
          },
        ]
      : []),
  ];

  const doneCount = rows.filter((r) => r.state === "done").length;
  const allDone = rows.every((r) => r.state === "done");

  return (
    <div
      className={cn(
        "rounded-2xl border bg-paper-raised",
        allDone ? "border-sage/40" : "border-line",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">
          {allDone ? "Ready to publish" : "What's left"}
        </p>
        <span className={cn("text-xs font-medium", allDone ? "text-sage" : "text-muted")}>
          {doneCount}/{rows.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={i}>
            <Link
              href={r.href}
              className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-paper-sunken"
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  r.state === "done"
                    ? "bg-sage/15 text-sage"
                    : r.state === "warn"
                      ? "bg-brass-soft text-brass-deep"
                      : "border border-line text-transparent",
                )}
              >
                {r.state === "done" ? (
                  <Check className="h-3 w-3" />
                ) : r.state === "warn" ? (
                  <CircleAlert className="h-3 w-3" />
                ) : null}
              </span>
              <span className={cn("min-w-0 flex-1", r.state === "done" ? "text-ink-soft" : "text-ink")}>
                {r.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
