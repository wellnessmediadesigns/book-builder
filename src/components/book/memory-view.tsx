"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Plus,
  Trash2,
  Sparkles,
  User,
  MapPin,
  Lightbulb,
  ScrollText,
  Clock,
  GitBranch,
  Tag,
} from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/field";
import { EditableText } from "@/components/book/editable-text";
import { addMemory, updateMemory, deleteMemory } from "@/lib/actions/memory";
import { toast } from "@/components/ui/toast";

type Entry = { id: string; kind: string; title: string; body: string };

const KINDS: { value: string; label: string; icon: typeof User }[] = [
  { value: "premise", label: "Premise", icon: Sparkles },
  { value: "reader-promise", label: "Reader promise", icon: Sparkles },
  { value: "style-rule", label: "Style rule", icon: ScrollText },
  { value: "tone-rule", label: "Tone rule", icon: ScrollText },
  { value: "character", label: "Character", icon: User },
  { value: "relationship", label: "Relationship", icon: GitBranch },
  { value: "setting", label: "Setting", icon: MapPin },
  { value: "timeline", label: "Timeline", icon: Clock },
  { value: "worldbuilding", label: "Worldbuilding", icon: MapPin },
  { value: "key-concept", label: "Key concept", icon: Lightbulb },
  { value: "fact", label: "Fact / continuity", icon: Tag },
  { value: "terminology", label: "Terminology", icon: Tag },
  { value: "open-thread", label: "Open thread", icon: GitBranch },
  { value: "resolved-thread", label: "Resolved thread", icon: GitBranch },
  { value: "future-goal", label: "Future goal", icon: Clock },
  { value: "note", label: "Note", icon: ScrollText },
];

const GROUPS: { title: string; kinds: string[]; tone: "brass" | "muse" | "sage" }[] = [
  { title: "Foundation", kinds: ["premise", "reader-promise", "note"], tone: "muse" },
  { title: "Voice", kinds: ["style-rule", "tone-rule"], tone: "brass" },
  { title: "Cast & world", kinds: ["character", "relationship", "setting", "worldbuilding", "timeline"], tone: "sage" },
  { title: "Knowledge", kinds: ["key-concept", "fact", "terminology"], tone: "brass" },
  { title: "Threads", kinds: ["open-thread", "resolved-thread", "future-goal"], tone: "muse" },
];

export function MemoryView({ projectId, entries }: { projectId: string; entries: Entry[] }) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("character");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    if (!title.trim()) return;
    start(async () => {
      await addMemory(projectId, kind, title.trim(), body.trim());
      setTitle("");
      setBody("");
      setAdding(false);
      toast.success("Memory added");
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Badge tone="muse">
            <Brain className="h-3 w-3" /> Book Memory
          </Badge>
          <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
            What Quire remembers
          </h1>
          <p className="mt-2 max-w-xl text-ink-soft">
            Every AI action reads from this memory to keep your book consistent — voice,
            characters, facts, and open threads. Edit anything; it shapes every chapter.
          </p>
        </div>
        <Button variant="primary" className="shrink-0" onClick={() => setAdding((a) => !a)}>
          <Plus className="h-4 w-4" /> Add memory
        </Button>
      </div>

      {adding && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 p-5">
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <div>
                <Label>Type</Label>
                <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mara Vance"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>Details</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe what Quire should remember…" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button variant="brass" disabled={pending || !title.trim()} onClick={submit}>
                Save memory
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {entries.length === 0 && !adding ? (
        <EmptyState
          icon={<Brain className="h-6 w-6" />}
          title="Memory builds as you write"
          description="Generate a blueprint to seed your Book Memory, or add entries by hand."
        />
      ) : (
        <div className="space-y-8">
          {GROUPS.map((g) => {
            const items = entries.filter((e) => g.kinds.includes(e.kind));
            if (items.length === 0) return null;
            return (
              <div key={g.title}>
                <h2 className="mb-3 font-display text-lg font-semibold text-ink">{g.title}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((e) => (
                    <MemoryCard key={e.id} entry={e} tone={g.tone} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MemoryCard({ entry, tone }: { entry: Entry; tone: "brass" | "muse" | "sage" }) {
  const meta = KINDS.find((k) => k.value === entry.kind);
  const Icon = meta?.icon ?? Tag;
  const [, start] = useTransition();
  return (
    <div className="group relative rounded-xl border border-line bg-paper-raised p-4 transition-colors hover:border-brass/30">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muse" />
        <Badge tone={tone} className="text-[0.6875rem]">
          {meta?.label ?? entry.kind}
        </Badge>
        <button
          onClick={() => start(async () => { await deleteMemory(entry.id); })}
          className="ml-auto text-muted opacity-0 transition-opacity hover:text-clay group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditableText
        value={entry.title}
        onSave={(v) => updateMemory(entry.id, { title: v })}
        className="block font-display font-semibold text-ink"
      />
      <EditableText
        value={entry.body}
        onSave={(v) => updateMemory(entry.id, { body: v })}
        placeholder="Add details…"
        multiline
        className="mt-1 block text-sm text-ink-soft"
      />
    </div>
  );
}
