"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Sparkles,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  CornerDownLeft,
  Heart,
  Eye,
  Waves,
  Quote,
  Zap,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SelInfo = {
  text: string;
  from: number;
  to: number;
  rect: { top: number; left: number; width: number } | null;
  locked: boolean;
};

const QUICK: { cmd: string; label: string; icon: LucideIcon }[] = [
  { cmd: "rewrite", label: "Rewrite", icon: Wand2 },
  { cmd: "improve", label: "Improve", icon: Sparkles },
  { cmd: "expand", label: "Expand", icon: Maximize2 },
  { cmd: "condense", label: "Condense", icon: Minimize2 },
  { cmd: "humanize", label: "Humanize", icon: Heart },
];

const MORE: { cmd: string; label: string; icon: LucideIcon; group: string }[] = [
  { cmd: "clarity", label: "Improve clarity", icon: Eye, group: "Clarity" },
  { cmd: "flow", label: "Improve flow", icon: Waves, group: "Clarity" },
  { cmd: "readability", label: "Improve readability", icon: Eye, group: "Clarity" },
  { cmd: "emotion", label: "Add emotion", icon: Heart, group: "Craft" },
  { cmd: "description", label: "Add description", icon: Sparkles, group: "Craft" },
  { cmd: "dialogue", label: "Add dialogue", icon: Quote, group: "Craft" },
  { cmd: "tension", label: "Increase tension", icon: Zap, group: "Craft" },
  { cmd: "pacing", label: "Improve pacing", icon: Waves, group: "Craft" },
  { cmd: "examples", label: "Add examples", icon: Sparkles, group: "Craft" },
  { cmd: "persuasive", label: "Make more persuasive", icon: Zap, group: "Craft" },
  { cmd: "grammar", label: "Fix grammar", icon: CheckCheck, group: "Polish" },
  { cmd: "repetition", label: "Remove repetition", icon: Minimize2, group: "Polish" },
  { cmd: "tone", label: "Change tone", icon: Wand2, group: "Polish" },
];

export function FloatingToolbar({
  sel,
  busy,
  onCommand,
  onAsk,
  onToggleLock,
}: {
  sel: SelInfo;
  busy: boolean;
  onCommand: (cmd: string) => void;
  onAsk: (instruction: string) => void;
  onToggleLock: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asking) inputRef.current?.focus();
  }, [asking]);

  if (!sel.rect) return null;

  const top = Math.max(12, sel.rect.top - 14);
  const left = sel.rect.left + sel.rect.width / 2;

  return (
    <div
      style={{ position: "fixed", top, left, transform: "translate(-50%, -100%)", zIndex: 50 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-float"
      >
        {sel.locked ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <Lock className="h-4 w-4 text-brass" />
            <span className="text-sm text-ink-soft">Locked — AI can't edit this.</span>
            <button
              onClick={onToggleLock}
              className="ml-1 inline-flex items-center gap-1 rounded-lg bg-paper-sunken px-2 py-1 text-xs text-ink transition-colors hover:bg-line"
            >
              <Unlock className="h-3 w-3" /> Unlock
            </button>
          </div>
        ) : asking ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ask.trim()) {
                onAsk(ask.trim());
                setAsk("");
                setAsking(false);
              }
            }}
            className="flex items-center gap-2 p-2"
          >
            <Wand2 className="ml-1 h-4 w-4 shrink-0 text-muse" />
            <input
              ref={inputRef}
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAsking(false)}
              placeholder="Ask AI to… add suspense, simplify, make it human"
              className="w-72 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-muse text-white transition-colors hover:bg-muse-deep"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <div className="flex items-center p-1">
            <ToolbarBtn onClick={() => setAsking(true)} active busy={busy}>
              <Wand2 className="h-3.5 w-3.5" /> Ask AI
            </ToolbarBtn>
            <div className="mx-1 h-5 w-px bg-line" />
            {QUICK.map((q) => (
              <ToolbarBtn key={q.cmd} onClick={() => onCommand(q.cmd)} busy={busy}>
                <q.icon className="h-3.5 w-3.5" /> {q.label}
              </ToolbarBtn>
            ))}
            <div className="mx-1 h-5 w-px bg-line" />
            <ToolbarBtn onClick={() => setExpanded((v) => !v)} busy={false}>
              {expanded ? "Less" : "More"}
            </ToolbarBtn>
            <button
              onClick={onToggleLock}
              title="Lock selection"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-paper-sunken hover:text-brass"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {expanded && !sel.locked && !asking && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="border-t border-line"
            >
              <div className="grid w-[28rem] grid-cols-2 gap-0.5 p-2">
                {MORE.map((m) => (
                  <button
                    key={m.cmd}
                    disabled={busy}
                    onClick={() => onCommand(m.cmd)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink disabled:opacity-50"
                  >
                    <m.icon className="h-3.5 w-3.5 text-muse/70" /> {m.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  active,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-sm transition-colors disabled:opacity-50",
        active
          ? "text-muse-deep hover:bg-muse-soft"
          : "text-ink-soft hover:bg-paper-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
