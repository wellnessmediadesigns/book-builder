"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Layers,
  Check,
  Wand2,
  Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label, FieldHint } from "@/components/ui/field";
import { Spinner } from "@/components/ui/primitives";
import { QuireLogo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createProject, getSeriesInfo, type ProjectInput } from "@/lib/actions/projects";
import { analyzeStyleSample } from "@/lib/actions/ai";
import { toast } from "@/components/ui/toast";

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

const empty: ProjectInput = {
  title: "",
  idea: "",
  theme: "",
  genre: "",
  kind: "nonfiction",
  audience: "",
  tone: "Warm & encouraging",
  style: "",
  readingLevel: "General adult",
  include: "",
  avoid: "",
  notes: "",
  inspiration: "",
  goals: "",
  bookType: "Self-help",
  chapterCount: 10,
  minWords: 1200,
  maxWords: 2500,
  narrativeStyle: "",
  pov: "",
  publishFormat: "Ebook + Print",
  seriesName: "",
  styleNotes: "",
};

const STEPS = [
  { id: 1, label: "The idea", icon: Lightbulb },
  { id: 2, label: "Structure", icon: Layers },
  { id: 3, label: "Review", icon: Check },
];

export function Wizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ProjectInput>(empty);
  const [pending, start] = useTransition();
  const [series, setSeries] = useState<{
    names: string[];
    styles: Record<string, Partial<ProjectInput>>;
  }>({ names: [], styles: {} });

  useEffect(() => {
    getSeriesInfo().then(setSeries).catch(() => {});
  }, []);

  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const merge = (patch: Partial<ProjectInput>) => setData((d) => ({ ...d, ...patch }));

  const canNext =
    step === 1 ? data.idea.trim().length > 8 && data.title.trim().length > 0 : true;

  const estWords = Math.round(((data.minWords + data.maxWords) / 2) * data.chapterCount);

  const submit = () =>
    start(async () => {
      try {
        await createProject(data);
      } catch (e) {
        // redirect throws internally; only real errors land here
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return;
        toast.error("Could not create project", "Please try again.");
      }
    });

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/studio">
            <QuireLogo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/studio">
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* stepper */}
        <div className="mb-10 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-all ${
                  step === s.id
                    ? "bg-ink text-paper"
                    : step > s.id
                      ? "bg-sage/15 text-sage"
                      : "bg-paper-sunken text-muted"
                }`}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 ${step > s.id ? "bg-sage/40" : "bg-line"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 1 && (
              <StepIdea data={data} set={set} merge={merge} series={series} />
            )}
            {step === 2 && <StepStructure data={data} set={set} estWords={estWords} />}
            {step === 3 && <StepReview data={data} estWords={estWords} />}
          </motion.div>
        </AnimatePresence>

        {/* nav */}
        <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button variant="primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="brass" disabled={pending} onClick={submit}>
              <Sparkles className="h-4 w-4" />
              {pending ? "Creating…" : "Create & generate blueprint"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

type SetFn = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => void;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-display-md font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-2 text-ink-soft">{hint}</p>}
      <div className="mt-6 grid gap-5">{children}</div>
    </div>
  );
}

function StepIdea({
  data,
  set,
  merge,
  series,
}: {
  data: ProjectInput;
  set: SetFn;
  merge: (patch: Partial<ProjectInput>) => void;
  series: { names: string[]; styles: Record<string, Partial<ProjectInput>> };
}) {
  return (
    <Section title="Start with the spark" hint="Tell Quire what your book is about. The richer the idea, the better the blueprint.">
      <StyleSampleBox merge={merge} />
      <SeriesControl data={data} set={set} merge={merge} series={series} />
      <div>
        <Label>Working title</Label>
        <Input
          autoFocus
          placeholder="e.g. The Quiet Tide"
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>
      <div>
        <Label>What is your book about?</Label>
        <Textarea
          className="min-h-[120px]"
          placeholder="Describe the idea, the heart of the story or the transformation you want to deliver…"
          value={data.idea}
          onChange={(e) => set("idea", e.target.value)}
        />
        <FieldHint>A few sentences is plenty — you'll refine everything next.</FieldHint>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Fiction or nonfiction</Label>
          <Select value={data.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="nonfiction">Nonfiction</option>
            <option value="fiction">Fiction</option>
          </Select>
        </div>
        <div>
          <Label>Genre</Label>
          <Input
            placeholder={data.kind === "fiction" ? "Literary, Mystery…" : "Self-help, Business…"}
            value={data.genre}
            onChange={(e) => set("genre", e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Theme</Label>
          <Input
            placeholder="Resilience, belonging, reinvention…"
            value={data.theme}
            onChange={(e) => set("theme", e.target.value)}
          />
        </div>
        <div>
          <Label>Target audience</Label>
          <Input
            placeholder="Who is this for?"
            value={data.audience}
            onChange={(e) => set("audience", e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Tone</Label>
          <Select value={data.tone} onChange={(e) => set("tone", e.target.value)}>
            {TONES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Reading level</Label>
          <Input value={data.readingLevel} onChange={(e) => set("readingLevel", e.target.value)} />
        </div>
      </div>
    </Section>
  );
}

function StyleSampleBox({ merge }: { merge: (patch: Partial<ProjectInput>) => void }) {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function analyze() {
    setBusy(true);
    const res = await analyzeStyleSample(sample);
    setBusy(false);
    if (res.ok) {
      const a = res.data;
      merge({
        ...(a.kind ? { kind: a.kind } : {}),
        ...(a.genre ? { genre: a.genre } : {}),
        ...(a.bookType ? { bookType: a.bookType } : {}),
        ...(a.audience ? { audience: a.audience } : {}),
        ...(a.tone ? { tone: a.tone } : {}),
        ...(a.style ? { style: a.style } : {}),
        ...(a.readingLevel ? { readingLevel: a.readingLevel } : {}),
        ...(a.narrativeStyle ? { narrativeStyle: a.narrativeStyle } : {}),
        ...(a.pov ? { pov: a.pov } : {}),
        ...(a.theme ? { theme: a.theme } : {}),
        ...(a.styleNotes ? { styleNotes: a.styleNotes } : {}),
      });
      setDone(true);
      toast.success("Style captured", "Fields below are pre-filled to match your sample.");
    } else if (res.error === "no_key") {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
    } else {
      toast.error("Couldn't analyze", res.error);
    }
  }

  return (
    <div className="rounded-2xl border border-muse/25 bg-muse-soft/40 p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Wand2 className="h-4 w-4 text-muse" />
        <span className="text-sm font-semibold text-ink">
          Match an existing book&apos;s style
        </span>
        {done && <Check className="h-4 w-4 text-sage" />}
        <span className="ml-auto text-xs text-muted">{open ? "Hide" : "Paste a sample"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <Textarea
            className="min-h-[120px]"
            placeholder="Paste a few pages (or paragraphs) from a book whose voice you want to match…"
            value={sample}
            onChange={(e) => setSample(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button variant="muse" size="sm" disabled={busy || sample.trim().length < 120} onClick={analyze}>
              {busy ? <Spinner /> : <Wand2 className="h-3.5 w-3.5" />} Analyze &amp; fill
            </Button>
            <span className="text-xs text-muted">
              Quire reads the voice and pre-fills genre, tone, style &amp; more.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SeriesControl({
  data,
  set,
  merge,
  series,
}: {
  data: ProjectInput;
  set: SetFn;
  merge: (patch: Partial<ProjectInput>) => void;
  series: { names: string[]; styles: Record<string, Partial<ProjectInput>> };
}) {
  const on = data.seriesName.trim().length > 0;
  return (
    <div className="rounded-2xl border border-line bg-paper-sunken/40 p-4">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => set("seriesName", e.target.checked ? data.seriesName || "My Series" : "")}
          className="h-4 w-4 accent-[hsl(var(--brass))]"
        />
        <Library className="h-4 w-4 text-brass" />
        <span className="text-sm font-semibold text-ink">This book is part of a series</span>
      </label>
      {on && (
        <div className="mt-3">
          <Label>Series name</Label>
          <Input
            list="series-names"
            value={data.seriesName}
            onChange={(e) => {
              const name = e.target.value;
              set("seriesName", name);
              const style = series.styles[name];
              if (style) merge(style); // inherit the series' established voice
            }}
            placeholder="e.g. Bedtime Sleep Stories"
          />
          <datalist id="series-names">
            {series.names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <FieldHint>
            Books in the same series share tone, style, and reading level so the whole
            series feels consistent. Pick an existing name to inherit its voice.
          </FieldHint>
        </div>
      )}
    </div>
  );
}

function StepStructure({
  data,
  set,
  estWords,
}: {
  data: ProjectInput;
  set: SetFn;
  estWords: number;
}) {
  return (
    <Section title="Shape the book" hint="Set the structure. Quire uses this to plan chapters and pace the writing.">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Book type</Label>
          <Select value={data.bookType} onChange={(e) => set("bookType", e.target.value)}>
            {BOOK_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Publishing format</Label>
          <Select value={data.publishFormat} onChange={(e) => set("publishFormat", e.target.value)}>
            <option>Ebook + Print</option>
            <option>Ebook only</option>
            <option>Print only</option>
            <option>Kindle (KDP)</option>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-paper-sunken/40 p-5">
        <div className="flex items-center justify-between">
          <Label className="mb-0">Number of chapters</Label>
          <span className="font-mono text-lg font-semibold text-brass-deep">
            {data.chapterCount}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={40}
          value={data.chapterCount}
          onChange={(e) => set("chapterCount", Number(e.target.value))}
          className="mt-3 w-full accent-[hsl(var(--brass))]"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Min words / chapter</Label>
          <Input
            type="number"
            value={data.minWords}
            onChange={(e) => set("minWords", Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Max words / chapter</Label>
          <Input
            type="number"
            value={data.maxWords}
            onChange={(e) => set("maxWords", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-muse-soft px-4 py-3 text-sm text-muse-deep">
        <Sparkles className="h-4 w-4" />
        Estimated length: <strong>≈ {estWords.toLocaleString()} words</strong>
      </div>

      {data.kind === "fiction" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Narrative style</Label>
            <Input
              placeholder="Close third, lyrical…"
              value={data.narrativeStyle}
              onChange={(e) => set("narrativeStyle", e.target.value)}
            />
          </div>
          <div>
            <Label>Point of view</Label>
            <Input
              placeholder="First person, third limited…"
              value={data.pov}
              onChange={(e) => set("pov", e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Things to include</Label>
          <Textarea
            placeholder="Topics, scenes, motifs you want present"
            value={data.include}
            onChange={(e) => set("include", e.target.value)}
          />
        </div>
        <div>
          <Label>Things to avoid</Label>
          <Textarea
            placeholder="Clichés, content, or angles to steer clear of"
            value={data.avoid}
            onChange={(e) => set("avoid", e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>Inspiration</Label>
          <Input
            placeholder="Comparable books or authors"
            value={data.inspiration}
            onChange={(e) => set("inspiration", e.target.value)}
          />
        </div>
        <div>
          <Label>Goals for the book</Label>
          <Input
            placeholder="What should it achieve?"
            value={data.goals}
            onChange={(e) => set("goals", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          placeholder="Anything else Quire should keep in mind"
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
    </Section>
  );
}

function StepReview({ data, estWords }: { data: ProjectInput; estWords: number }) {
  const rows: [string, string][] = [
    ["Title", data.title],
    ["Type", `${data.bookType} · ${data.kind}`],
    ["Genre", data.genre || "—"],
    ["Audience", data.audience || "—"],
    ["Tone", data.tone],
    ["Chapters", `${data.chapterCount} · ${data.minWords}–${data.maxWords} words each`],
    ["Estimated length", `≈ ${estWords.toLocaleString()} words`],
  ];
  return (
    <Section title="Ready to draft your blueprint" hint="Quire will generate titles, a positioning, a reader promise, a full outline, and seed your Book Memory. Everything stays editable.">
      <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={`flex items-start justify-between gap-4 px-5 py-3.5 ${
              i !== 0 ? "border-t border-line" : ""
            }`}
          >
            <span className="text-sm text-muted">{k}</span>
            <span className="max-w-[60%] text-right text-sm font-medium text-ink">{v}</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-muse/30 bg-muse-soft/50 p-5">
        <p className="line-clamp-3 font-serif text-sm italic text-ink-soft">"{data.idea}"</p>
      </div>
    </Section>
  );
}
