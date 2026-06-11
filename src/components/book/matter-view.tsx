"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Megaphone,
  ScrollText,
  Sparkles,
  Check,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { Badge, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { generateMatter, saveMatter, type MatterRow } from "@/lib/actions/matter";

const GROUPS = [
  {
    id: "front",
    label: "Front matter",
    icon: BookOpen,
    blurb: "Everything before chapter one — generated for this book, ready to edit.",
  },
  {
    id: "back",
    label: "Back matter",
    icon: ScrollText,
    blurb: "Everything after the final chapter — conclusions, questions, and credits.",
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    blurb: "Sales copy and listing assets. Kept out of the manuscript exports.",
  },
] as const;

export function MatterView({
  projectId,
  initial,
  aiReady,
}: {
  projectId: string;
  initial: MatterRow[];
  aiReady: boolean;
}) {
  const [rows, setRows] = useState<MatterRow[]>(initial);
  const [tab, setTab] = useState<(typeof GROUPS)[number]["id"]>("front");
  const group = GROUPS.find((g) => g.id === tab)!;
  const visible = rows.filter((r) => r.group === tab);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Badge tone="brass">
        <ScrollText className="h-3 w-3" /> Book sections
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
        Front matter, back matter &amp; marketing
      </h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Generate each section from your Book Memory, then edit it like anything else in
        Quire. Sections with content are included in your exports automatically.
      </p>

      {/* tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-paper-sunken/60 p-1">
        {GROUPS.map((g) => {
          const done = rows.filter((r) => r.group === g.id && r.content.trim()).length;
          const total = rows.filter((r) => r.group === g.id).length;
          return (
            <button
              key={g.id}
              onClick={() => setTab(g.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all",
                tab === g.id
                  ? "bg-paper-raised font-medium text-ink shadow-soft"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              <g.icon className="h-4 w-4" />
              {g.label}
              <span className="ml-0.5 rounded-full bg-paper-sunken px-1.5 text-[0.6875rem] text-muted">
                {done}/{total}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-muted">{group.blurb}</p>

      <div className="mt-5 space-y-3">
        {visible.map((row, i) => (
          <MatterCard
            key={row.id}
            row={row}
            index={i}
            aiReady={aiReady}
            onChange={(content) =>
              setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, content } : r)))
            }
          />
        ))}
      </div>
    </div>
  );
}

function MatterCard({
  row,
  index,
  aiReady,
  onChange,
}: {
  row: MatterRow;
  index: number;
  aiReady: boolean;
  onChange: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasContent = row.content.trim().length > 0;

  async function generate() {
    if (!aiReady) {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
      return;
    }
    setGenerating(true);
    const res = await generateMatter(row.id);
    setGenerating(false);
    if (res.ok) {
      onChange(res.content);
      setOpen(true);
      toast.success(`${row.title} drafted`, "Edit it to make it yours.");
    } else if (res.error === "no_key") {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
    } else {
      toast.error("Generation failed", res.error);
    }
  }

  async function persist(content: string) {
    setSaving(true);
    await saveMatter(row.id, content);
    setSaving(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-soft"
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
          />
          <span className="truncate font-display font-semibold text-ink">{row.title}</span>
          {hasContent ? (
            <Badge tone="sage" className="hidden sm:inline-flex">
              <Check className="h-3 w-3" /> Drafted
            </Badge>
          ) : (
            <Badge tone="neutral" className="hidden sm:inline-flex">
              Empty
            </Badge>
          )}
          {saving && <Spinner className="h-3.5 w-3.5 text-muted" />}
        </button>
        <Button
          variant={hasContent ? "outline" : "museSoft"}
          size="sm"
          disabled={generating}
          onClick={generate}
          className="shrink-0"
        >
          {generating ? (
            <Spinner />
          ) : hasContent ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{hasContent ? "Regenerate" : "Generate"}</span>
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="border-t border-line px-4 py-4 sm:px-5">
              <textarea
                value={row.content}
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => persist(e.target.value)}
                placeholder={`Write or generate the ${row.title.toLowerCase()}…`}
                className="min-h-[160px] w-full resize-y rounded-xl border border-line bg-paper px-3.5 py-3 font-serif text-[0.95rem] leading-relaxed text-ink placeholder:text-muted outline-none transition-all focus:border-muse/40 focus:ring-2 focus:ring-muse/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
