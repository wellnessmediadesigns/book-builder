"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/** Click-to-edit text that saves on blur. Calm, inline, no chrome until focused. */
export function EditableText({
  value,
  onSave,
  placeholder,
  className,
  multiline,
}: {
  value: string;
  onSave: (v: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onSave(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          "w-full resize-none rounded-md bg-muse-soft/40 px-1.5 py-0.5 outline-none ring-1 ring-muse/30",
          className,
        )}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-text rounded-md px-1.5 py-0.5 transition-colors hover:bg-paper-sunken",
        !value && "text-muted",
        className,
      )}
    >
      {value || placeholder || "—"}
    </span>
  );
}
