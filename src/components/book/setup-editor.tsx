"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldHint } from "@/components/ui/field";
import { Card } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { updateProjectSetup } from "@/lib/actions/projects";

const BOOK_TYPES = [
  "Novel",
  "Memoir",
  "Self-help",
  "Business",
  "Children's book",
  "Devotional",
  "Educational",
  "Workbook",
  "Short guide",
];

const TONES = [
  "Warm & encouraging",
  "Authoritative",
  "Playful",
  "Literary & lyrical",
  "Conversational",
  "Inspirational",
  "Suspenseful",
  "Calm & reflective",
];

export type SetupData = {
  title: string;
  idea: string;
  theme: string;
  genre: string;
  kind: string;
  audience: string;
  tone: string;
  style: string;
  readingLevel: string;
  include: string;
  avoid: string;
  notes: string;
  inspiration: string;
  goals: string;
  bookType: string;
  chapterCount: number;
  minWords: number;
  maxWords: number;
  narrativeStyle: string;
  pov: string;
  publishFormat: string;
};

export function SetupEditor({
  projectId,
  initial,
  hasBlueprint,
}: {
  projectId: string;
  initial: SetupData;
  hasBlueprint: boolean;
}) {
  const router = useRouter();
  const [d, setD] = useState<SetupData>(initial);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof SetupData>(k: K, v: SetupData[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const est = Math.round(((d.minWords + d.maxWords) / 2) * d.chapterCount);
  const chaptersChanged = d.chapterCount !== initial.chapterCount;

  function save(then?: "blueprint") {
    start(async () => {
      await updateProjectSetup(projectId, d);
      setDirty(false);
      toast.success("Setup saved");
      if (then === "blueprint") router.push(`/studio/book/${projectId}/blueprint`);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-display-md font-semibold text-ink">Book setup</h1>
      <p className="mt-2 text-ink-soft">
        Everything you set when you started — editable any time. Changes to structure shape
        the next blueprint and chapter generations.
      </p>

      {/* Idea */}
      <Card className="mt-6 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">The idea</h2>
        <div className="grid gap-5">
          <div>
            <Label>Working title</Label>
            <Input value={d.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>What the book is about</Label>
            <Textarea
              className="min-h-[110px]"
              value={d.idea}
              onChange={(e) => set("idea", e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Fiction or nonfiction</Label>
              <Select value={d.kind} onChange={(e) => set("kind", e.target.value)}>
                <option value="nonfiction">Nonfiction</option>
                <option value="fiction">Fiction</option>
              </Select>
            </div>
            <div>
              <Label>Genre</Label>
              <Input value={d.genre} onChange={(e) => set("genre", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Theme</Label>
              <Input value={d.theme} onChange={(e) => set("theme", e.target.value)} />
            </div>
            <div>
              <Label>Target audience</Label>
              <Input value={d.audience} onChange={(e) => set("audience", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Tone</Label>
              <Select value={d.tone} onChange={(e) => set("tone", e.target.value)}>
                {!TONES.includes(d.tone) && <option>{d.tone}</option>}
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Reading level</Label>
              <Input value={d.readingLevel} onChange={(e) => set("readingLevel", e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Structure */}
      <Card className="mt-5 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Structure</h2>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Book type</Label>
              <Select value={d.bookType} onChange={(e) => set("bookType", e.target.value)}>
                {!BOOK_TYPES.includes(d.bookType) && <option>{d.bookType}</option>}
                {BOOK_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Publishing format</Label>
              <Select value={d.publishFormat} onChange={(e) => set("publishFormat", e.target.value)}>
                <option>Ebook + Print</option>
                <option>Ebook only</option>
                <option>Print only</option>
                <option>Kindle (KDP)</option>
              </Select>
            </div>
          </div>

          {/* Chapter count — the field you wanted */}
          <div className="rounded-2xl border border-brass/30 bg-brass-soft/40 p-5">
            <div className="flex items-center justify-between">
              <Label className="mb-0 text-ink">Number of chapters</Label>
              <input
                type="number"
                min={1}
                max={60}
                value={d.chapterCount}
                onChange={(e) =>
                  set("chapterCount", Math.max(1, Math.min(60, Number(e.target.value) || 1)))
                }
                className="h-9 w-20 rounded-lg border border-line bg-paper-raised px-2 text-center font-mono text-lg font-semibold text-brass-deep outline-none focus:border-muse/40 focus:ring-2 focus:ring-muse/20"
              />
            </div>
            <input
              type="range"
              min={1}
              max={40}
              value={Math.min(40, d.chapterCount)}
              onChange={(e) => set("chapterCount", Number(e.target.value))}
              className="mt-3 w-full accent-[hsl(var(--brass))]"
            />
            <FieldHint>Type any number up to 60, or drag the slider.</FieldHint>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Min words / chapter</Label>
              <Input
                type="number"
                value={d.minWords}
                onChange={(e) => set("minWords", Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Max words / chapter</Label>
              <Input
                type="number"
                value={d.maxWords}
                onChange={(e) => set("maxWords", Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muse-soft px-4 py-3 text-sm text-muse-deep">
            <Sparkles className="h-4 w-4" />
            Estimated length: <strong>≈ {est.toLocaleString()} words</strong> across{" "}
            {d.chapterCount} chapters
          </div>

          {d.kind === "fiction" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Narrative style</Label>
                <Input
                  value={d.narrativeStyle}
                  onChange={(e) => set("narrativeStyle", e.target.value)}
                />
              </div>
              <div>
                <Label>Point of view</Label>
                <Input value={d.pov} onChange={(e) => set("pov", e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Guidance */}
      <Card className="mt-5 p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Guidance</h2>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Things to include</Label>
              <Textarea value={d.include} onChange={(e) => set("include", e.target.value)} />
            </div>
            <div>
              <Label>Things to avoid</Label>
              <Textarea value={d.avoid} onChange={(e) => set("avoid", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Inspiration</Label>
              <Input value={d.inspiration} onChange={(e) => set("inspiration", e.target.value)} />
            </div>
            <div>
              <Label>Goals for the book</Label>
              <Input value={d.goals} onChange={(e) => set("goals", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={d.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-4 mt-6 flex items-center gap-3 rounded-2xl border border-line bg-paper-raised/95 p-3 shadow-float backdrop-blur">
        <span className="ml-1 text-sm text-ink-soft">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <div className="ml-auto flex gap-2">
          <Link href={`/studio/book/${projectId}/blueprint`}>
            <Button variant="ghost">Back to blueprint</Button>
          </Link>
          {hasBlueprint && chaptersChanged ? (
            <Button variant="brass" disabled={pending} onClick={() => save("blueprint")}>
              <RotateCcw className="h-4 w-4" /> Save &amp; regenerate
            </Button>
          ) : (
            <Button variant="primary" disabled={pending || !dirty} onClick={() => save()}>
              <Save className="h-4 w-4" /> {pending ? "Saving…" : "Save setup"}
            </Button>
          )}
        </div>
      </div>

      {hasBlueprint && chaptersChanged && (
        <p className="mt-3 text-center text-xs text-muted">
          You changed the chapter count. Your current blueprint still has{" "}
          {initial.chapterCount} chapters — regenerate it to rebuild the outline with{" "}
          {d.chapterCount}.
        </p>
      )}
    </div>
  );
}
