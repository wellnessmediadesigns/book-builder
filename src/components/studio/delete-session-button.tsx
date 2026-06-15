"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { deleteSession } from "@/lib/actions/brainstorm";

/** A corner delete button for a brainstorm session card (sits over the card Link). */
export function DeleteSessionButton({ id, title }: { id: string; title: string }) {
  const [, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(`Delete “${title}”? This can’t be undone.`)) return;
        setGone(true);
        start(async () => {
          await deleteSession(id);
          toast.success("Brainstorm deleted");
        });
      }}
      aria-label="Delete brainstorm"
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-paper-raised/90 text-ink-soft opacity-100 shadow-soft backdrop-blur transition-opacity hover:text-clay sm:opacity-0 sm:group-hover:opacity-100"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
