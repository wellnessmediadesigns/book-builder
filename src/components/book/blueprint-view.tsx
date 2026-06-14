"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Check,
  PenLine,
  RefreshCw,
  ArrowRight,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Spinner } from "@/components/ui/primitives";
import { Input, Textarea, Label } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { generateBlueprint } from "@/lib/actions/ai";
import { updateProject } from "@/lib/actions/projects";
import { updateChapterMeta } from "@/lib/actions/chapters";
import { EditableText } from "@/components/book/editable-text";
import { workVocab } from "@/lib/work";

type Chapter = { id: string; order: number; title: string; summary: string };
type Project = {
  id: string;
  title: string;
  idea: string;
  kind: string;
  bookType: string;
  status: string;
  recommendedTitle: string;
  subtitle: string;
  positioning: string;
  readerPromise: string;
  blueprintJson: string | null;
};

export function BlueprintView({
  project,
  chapters,
  aiReady,
  workType,
}: {
  project: Project;
  chapters: Chapter[];
  aiReady: boolean;
  workType?: string;
}) {
  const router = useRouter();
  const v = workVocab(workType);
  const news = v.type === "newsletter";
  const [generating, setGenerating] = useState(false);

  const bp = project.blueprintJson ? safeParse(project.blueprintJson) : null;
  const hasBlueprint = project.status !== "draft" && bp;

  async function generate() {
    if (!aiReady) {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
      return;
    }
    setGenerating(true);
    const res = await generateBlueprint(project.id);
    setGenerating(false);
    if (res.ok) {
      toast.success("Blueprint ready", "Every word is yours to edit.");
      router.refresh();
    } else if (res.error === "no_key") {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
    } else {
      toast.error("Generation failed", res.error);
    }
  }

  if (!hasBlueprint) {
    return (
      <GeneratePrompt
        projectId={project.id}
        idea={project.idea}
        aiReady={aiReady}
        generating={generating}
        onGenerate={generate}
        planLabel={v.plan}
        news={news}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Badge tone="muse">
            <Sparkles className="h-3 w-3" /> {v.plan}
          </Badge>
          <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
            {news ? "Your content plan" : "Your book blueprint"}
          </h1>
          <p className="mt-2 text-ink-soft">
            Everything below is editable. Refine it, then start writing.
          </p>
        </div>
        <Link href={`/studio/book/${project.id}/write`}>
          <Button variant="brass" className="group shrink-0">
            <PenLine className="h-4 w-4" /> Start writing
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </Link>
      </div>

      {/* Title & identity */}
      <SectionCard title="Title & identity" delay={0}>
        <div>
          <Label>Recommended title</Label>
          <EditableInput
            value={project.recommendedTitle}
            onSave={(v) => updateProject(project.id, { recommendedTitle: v })}
            big
          />
        </div>
        <div>
          <Label>Subtitle</Label>
          <EditableInput
            value={project.subtitle}
            onSave={(v) => updateProject(project.id, { subtitle: v })}
          />
        </div>
        {arr(bp.titleOptions).length > 0 && (
          <div>
            <Label>Alternative titles — tap to use</Label>
            <div className="flex flex-wrap gap-2">
              {arr(bp.titleOptions).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    updateProject(project.id, { recommendedTitle: t });
                    router.refresh();
                    toast.success("Title updated");
                  }}
                  className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-brass/40 hover:bg-brass-soft hover:text-brass-deep"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Positioning */}
      <SectionCard title="Positioning & promise" delay={0.05}>
        <div>
          <Label>Positioning statement</Label>
          <EditableArea
            value={project.positioning}
            onSave={(v) => updateProject(project.id, { positioning: v })}
          />
        </div>
        <div>
          <Label>Reader promise</Label>
          <EditableArea
            value={project.readerPromise}
            onSave={(v) => updateProject(project.id, { readerPromise: v })}
          />
        </div>
        {Boolean(bp.readerJourney) && (
          <div>
            <Label>Reader journey</Label>
            <BlueprintField
              projectId={project.id}
              bp={bp}
              path="readerJourney"
              value={String(bp.readerJourney)}
            />
          </div>
        )}
      </SectionCard>

      {/* Table of contents */}
      <SectionCard title={news ? `Issues · ${chapters.length}` : `Table of contents · ${chapters.length} chapters`} delay={0.1}>
        <div className="space-y-3">
          {chapters.map((c, i) => (
            <div
              key={c.id}
              className="rounded-xl border border-line bg-paper-raised p-4 transition-colors hover:border-brass/30"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-brass">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <EditableText
                  value={c.title}
                  onSave={(v) => updateChapterMeta(c.id, { title: v })}
                  className="flex-1 font-display font-semibold text-ink"
                />
              </div>
              <EditableText
                value={c.summary}
                onSave={(v) => updateChapterMeta(c.id, { summary: v })}
                placeholder="Add a chapter summary…"
                multiline
                className="mt-1.5 pl-6 text-sm text-ink-soft"
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Fiction: characters & settings */}
      {project.kind === "fiction" && (
        <>
          {arr(bp.characters).length > 0 && (
            <SectionCard title="Characters" delay={0.12}>
              <ProfileList projectId={project.id} bp={bp} path="characters" />
            </SectionCard>
          )}
          {arr(bp.settings).length > 0 && (
            <SectionCard title="Settings" delay={0.14}>
              <ProfileList projectId={project.id} bp={bp} path="settings" />
            </SectionCard>
          )}
        </>
      )}

      {/* Nonfiction: key concepts */}
      {project.kind !== "fiction" && arr(bp.keyConcepts).length > 0 && (
        <SectionCard title="Key concepts" delay={0.12}>
          <ProfileList projectId={project.id} bp={bp} path="keyConcepts" />
        </SectionCard>
      )}

      {/* Guides */}
      <SectionCard title="Style, tone & continuity" delay={0.16}>
        <div className="grid gap-5 sm:grid-cols-3">
          <GuideList title="Style" items={arr(bp.styleGuide)} tone="brass" />
          <GuideList title="Tone" items={arr(bp.toneGuide)} tone="muse" />
          <GuideList title="Continuity" items={arr(bp.continuityGuide)} tone="sage" />
        </div>
      </SectionCard>

      {/* Front/back matter */}
      <SectionCard title="Recommended front & back matter" delay={0.18}>
        <div className="grid gap-5 sm:grid-cols-2">
          <GuideList title="Front matter" items={arr(bp.frontMatter)} tone="brass" />
          <GuideList title="Back matter" items={arr(bp.backMatter)} tone="muse" />
        </div>
      </SectionCard>

      <div className="mt-8 flex items-center justify-between rounded-2xl border border-line bg-paper-sunken/40 p-5">
        <div>
          <p className="font-display font-semibold text-ink">Happy with the blueprint?</p>
          <p className="text-sm text-ink-soft">Head to the editor and write chapter one.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={generating}
            onClick={() => {
              if (confirm("Regenerate the blueprint? This rebuilds the outline and Book Memory."))
                generate();
            }}
          >
            {generating ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Regenerate
          </Button>
          <Link href={`/studio/book/${project.id}/write`}>
            <Button variant="brass">
              <PenLine className="h-4 w-4" /> Start writing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ——————————————————————————————————————————————

function GeneratePrompt({
  projectId,
  idea,
  aiReady,
  generating,
  onGenerate,
  planLabel,
  news,
}: {
  projectId: string;
  idea: string;
  aiReady: boolean;
  generating: boolean;
  onGenerate: () => void;
  planLabel: string;
  news: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-muse/20 to-brass/10"
      >
        {generating ? (
          <Spinner className="h-8 w-8 text-muse" />
        ) : (
          <Wand2 className="h-8 w-8 text-muse" />
        )}
        {generating && (
          <div className="absolute inset-0 animate-pulse-soft rounded-3xl ring-2 ring-muse/30" />
        )}
      </motion.div>
      <h1 className="font-display text-display-md font-semibold text-ink">
        {generating ? `Drafting your ${planLabel.toLowerCase()}…` : `Generate your ${planLabel.toLowerCase()}`}
      </h1>
      <p className="mt-3 max-w-md text-ink-soft">
        {news
          ? "Quire will turn your idea into a brand + a plan of issue ideas, each with an angle, plus your brand knowledge base."
          : generating
            ? "Quire is crafting titles, a positioning, a reader promise, a full chapter outline, and your Book Memory. This takes a moment."
            : "Quire will turn your idea into a complete, editable plan — titles, an outline, a reader journey, and continuity memory."}
      </p>

      <div className="mt-6 w-full rounded-2xl border border-dashed border-muse/30 bg-muse-soft/40 p-5 text-left">
        <p className="line-clamp-3 font-serif text-sm italic text-ink-soft">"{idea}"</p>
      </div>

      {!aiReady && !generating && (
        <Link href="/studio/settings" className="mt-5">
          <div className="flex items-center gap-2 rounded-xl border border-brass/30 bg-brass-soft px-4 py-2.5 text-sm text-brass-deep">
            <KeyRound className="h-4 w-4" />
            Connect an AI provider in Settings to generate.
          </div>
        </Link>
      )}

      <Button
        size="lg"
        variant="brass"
        className="mt-8"
        disabled={generating}
        onClick={onGenerate}
      >
        {generating ? (
          <>
            <Spinner /> Generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Generate {planLabel.toLowerCase()}
          </>
        )}
      </Button>

      {!generating && (
        <Link
          href={`/studio/book/${projectId}/setup`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Edit setup — chapters, length, tone &amp; more
        </Link>
      )}
    </div>
  );
}

function SectionCard({
  title,
  delay,
  children,
}: {
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="mb-5"
    >
      <Card className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">{title}</h2>
        <div className="grid gap-5">{children}</div>
      </Card>
    </motion.div>
  );
}

function GuideList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "brass" | "muse" | "sage";
}) {
  const dot = { brass: "bg-brass", muse: "bg-muse", sage: "bg-sage" }[tone];
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-soft">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileList({
  projectId,
  bp,
  path,
}: {
  projectId: string;
  bp: Record<string, unknown>;
  path: string;
}) {
  const items = arr<Record<string, string>>(bp[path]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((p, i) => (
        <div key={i} className="rounded-xl border border-line bg-paper-sunken/30 p-4">
          <p className="font-display font-semibold text-ink">{p.name}</p>
          {p.role && <p className="text-xs text-brass-deep">{p.role}</p>}
          <p className="mt-1 text-sm text-ink-soft">{p.description}</p>
        </div>
      ))}
    </div>
  );
}

function BlueprintField({
  projectId,
  bp,
  path,
  value,
}: {
  projectId: string;
  bp: Record<string, unknown>;
  path: string;
  value: string;
}) {
  return (
    <EditableArea
      value={value}
      onSave={(v) => updateProject(projectId, { blueprintJson: JSON.stringify({ ...bp, [path]: v }) })}
    />
  );
}

function EditableInput({
  value,
  onSave,
  big,
}: {
  value: string;
  onSave: (v: string) => Promise<void> | void;
  big?: boolean;
}) {
  const [v, setV] = useState(value);
  const [pending, start] = useTransition();
  return (
    <Input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && start(async () => { await onSave(v); })}
      className={big ? "font-display text-lg font-semibold" : ""}
    />
  );
}

function EditableArea({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => Promise<void> | void;
}) {
  const [v, setV] = useState(value);
  const [, start] = useTransition();
  return (
    <Textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && start(async () => { await onSave(v); })}
    />
  );
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
function arr<T = string>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
