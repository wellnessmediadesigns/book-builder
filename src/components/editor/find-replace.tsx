"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Editor } from "@tiptap/react";
import { ChevronUp, ChevronDown, X, Replace, CaseSensitive } from "lucide-react";
import { cn } from "@/lib/utils";

type Match = { from: number; to: number };

function findMatches(editor: Editor, query: string, caseSensitive: boolean): Match[] {
  if (!query) return [];
  const positions: number[] = [];
  let text = "";
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) positions.push(pos + i);
      text += node.text;
    } else if (node.isBlock && text.length && !text.endsWith("\n")) {
      positions.push(pos);
      text += "\n";
    }
    return true;
  });
  const hay = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const out: Match[] = [];
  let idx = hay.indexOf(needle);
  while (idx !== -1) {
    const from = positions[idx];
    const to = positions[idx + needle.length - 1] + 1;
    if (from !== undefined && to !== undefined) out.push({ from, to });
    idx = hay.indexOf(needle, idx + needle.length);
  }
  return out;
}

export function FindReplace({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [current, setCurrent] = useState(0);
  const [tick, setTick] = useState(0); // recompute trigger after edits
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => findMatches(editor, query, caseSensitive), [query, caseSensitive, tick]);

  useEffect(() => {
    setCurrent(0);
  }, [query, caseSensitive]);

  function jump(index: number) {
    if (matches.length === 0) return;
    const i = ((index % matches.length) + matches.length) % matches.length;
    setCurrent(i);
    const m = matches[i];
    editor.chain().setTextSelection({ from: m.from, to: m.to }).scrollIntoView().run();
  }

  function replaceOne() {
    if (matches.length === 0) return;
    const m = matches[current] ?? matches[0];
    editor.chain().focus().insertContentAt({ from: m.from, to: m.to }, replacement).run();
    setTick((t) => t + 1);
    setTimeout(() => {
      const next = findMatches(editor, query, caseSensitive);
      if (next.length) {
        const i = Math.min(current, next.length - 1);
        setCurrent(i);
        editor.chain().setTextSelection({ from: next[i].from, to: next[i].to }).scrollIntoView().run();
      }
    }, 0);
  }

  function replaceAll() {
    const all = findMatches(editor, query, caseSensitive);
    if (all.length === 0) return;
    let chain = editor.chain().focus();
    // Replace from the end so earlier positions stay valid.
    for (let i = all.length - 1; i >= 0; i--) {
      chain = chain.insertContentAt({ from: all[i].from, to: all[i].to }, replacement);
    }
    chain.run();
    setTick((t) => t + 1);
  }

  const count = matches.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16 }}
      className="absolute right-4 top-3 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-paper-raised p-2 shadow-float"
    >
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-2.5">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                jump(current + (e.shiftKey ? -1 : 1));
              }
              if (e.key === "Escape") onClose();
            }}
            placeholder="Find in chapter"
            className="h-9 w-full bg-transparent text-sm text-ink placeholder:text-muted outline-none"
          />
          <span className="shrink-0 font-mono text-xs text-muted">
            {count ? `${current + 1}/${count}` : query ? "0" : ""}
          </span>
          <button
            onClick={() => setCaseSensitive((v) => !v)}
            title="Match case"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              caseSensitive ? "bg-muse-soft text-muse-deep" : "text-muted hover:text-ink",
            )}
          >
            <CaseSensitive className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => jump(current - 1)}
          disabled={!count}
          className="flex h-9 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-paper-sunken disabled:opacity-40"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => jump(current + 1)}
          disabled={!count}
          className="flex h-9 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-paper-sunken disabled:opacity-40"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="flex h-9 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-2.5">
          <Replace className="h-3.5 w-3.5 shrink-0 text-muted" />
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Replace with"
            className="h-9 w-full bg-transparent text-sm text-ink placeholder:text-muted outline-none"
          />
        </div>
        <button
          onClick={replaceOne}
          disabled={!count}
          className="h-9 rounded-lg px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-paper-sunken disabled:opacity-40"
        >
          Replace
        </button>
        <button
          onClick={replaceAll}
          disabled={!count}
          className="h-9 rounded-lg bg-ink px-2.5 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          All
        </button>
      </div>
    </motion.div>
  );
}
