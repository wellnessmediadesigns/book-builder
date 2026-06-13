"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Kbd } from "@/components/ui/primitives";

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: "Everywhere",
    items: [
      [["⌘", "K"], "Command palette — jump to books, search, actions"],
      [["?"], "Show this shortcuts sheet"],
    ],
  },
  {
    title: "In the editor",
    items: [
      [["⌘", "F"], "Find & replace in the chapter"],
      [["⌘", "S"], "Snapshot the chapter (version history)"],
      [["⌘", "\\"], "Toggle focus / distraction-free mode"],
      [["Esc"], "Close find, panels, and dialogs"],
    ],
  },
  {
    title: "Selection & AI",
    items: [
      [["Select text"], "Opens the AI toolbar — rewrite, expand, ask…"],
      [["↵ / Esc"], "Accept / reject an AI revision"],
    ],
  },
];

function isTyping() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}

export function ShortcutsSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "?" && !isTyping() && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-line bg-paper-raised shadow-float sm:m-6 sm:rounded-3xl"
          >
            <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
              <Keyboard className="h-4 w-4 text-brass" />
              <h2 className="font-display text-lg font-semibold text-ink">Keyboard shortcuts</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-paper-sunken hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {GROUPS.map((g) => (
                <div key={g.title} className="mb-5 last:mb-0">
                  <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                    {g.title}
                  </p>
                  <div className="space-y-1.5">
                    {g.items.map(([keys, desc]) => (
                      <div key={desc} className="flex items-center gap-3">
                        <span className="flex w-28 shrink-0 items-center gap-1">
                          {keys.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </span>
                        <span className="text-sm text-ink-soft">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
