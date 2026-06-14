"use client";

import { useState, useTransition } from "react";
import { Mail, Wand2, Loader2, Check, Sparkles } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { createNewsletter } from "@/lib/actions/projects";
import { analyzeStyleSample } from "@/lib/actions/ai";

const LENGTHS = [
  { id: "short", label: "Short", hint: "~300–600 words" },
  { id: "standard", label: "Standard", hint: "~600–1,100 words" },
  { id: "long", label: "Long", hint: "~1,100–2,000 words" },
] as const;

export function NewsletterSetup({ aiReady }: { aiReady: boolean }) {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [plannedIssues, setPlannedIssues] = useState(6);
  const [issueLength, setIssueLength] = useState<"short" | "standard" | "long">("standard");

  const [sample, setSample] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [voiceCaptured, setVoiceCaptured] = useState(false);
  const [pending, start] = useTransition();

  async function extractVoice() {
    if (sample.trim().length < 120) {
      toast.error("Paste a bit more", "A few paragraphs of a past newsletter works best.");
      return;
    }
    if (!aiReady) {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
      return;
    }
    setAnalyzing(true);
    const res = await analyzeStyleSample(sample);
    setAnalyzing(false);
    if (res.ok) {
      if (res.data.tone) setTone(res.data.tone);
      if (res.data.styleNotes) setStyleNotes(res.data.styleNotes);
      if (res.data.audience && !audience) setAudience(res.data.audience);
      setVoiceCaptured(true);
      toast.success("Voice captured", "Your issues will match this style.");
    } else {
      toast.error("Couldn't analyze", res.error === "no_key" ? "Connect an AI provider in Settings." : res.error);
    }
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Name your newsletter first");
      return;
    }
    start(async () => {
      await createNewsletter({ name, about, audience, tone, styleNotes, issueLength, plannedIssues });
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Badge tone="brass">
        <Mail className="h-3 w-3" /> New newsletter
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">Set up your brand</h1>
      <p className="mt-2 text-ink-soft">
        Define the brand once — voice, audience, what it&apos;s about — and every issue you write will
        match. You can refine all of this later.
      </p>

      <Card className="mt-6 space-y-5 p-6">
        <div>
          <Label>Newsletter name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Focused Founder" autoFocus />
        </div>
        <div>
          <Label>What is it about?</Label>
          <Textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="The big idea, the recurring themes, and what a subscriber gets each issue." />
        </div>
        <div>
          <Label>Who is it for?</Label>
          <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. early-stage founders who feel scattered" />
        </div>
      </Card>

      {/* Voice capture */}
      <Card className="mt-5 space-y-3 p-6">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-muse" />
          <h2 className="font-display font-semibold text-ink">Capture your voice</h2>
          {voiceCaptured && (
            <Badge tone="sage" className="ml-auto">
              <Check className="h-3 w-3" /> Captured
            </Badge>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          Optional, but powerful: paste a past newsletter and Quire will learn the brand voice so every
          issue sounds like you.
        </p>
        <Textarea value={sample} onChange={(e) => setSample(e.target.value)} placeholder="Paste a past issue or a writing sample…" className="min-h-[120px]" />
        <div className="flex items-center gap-2">
          <Button variant="museSoft" size="sm" onClick={extractVoice} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Extract voice
          </Button>
          {tone && <span className="truncate text-xs text-muted">Tone: {tone}</span>}
        </div>
      </Card>

      {/* Shape */}
      <Card className="mt-5 space-y-5 p-6">
        <div>
          <Label>Tone (in a few words)</Label>
          <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. warm, candid, practical" />
        </div>
        <div>
          <Label>Typical issue length</Label>
          <div className="grid grid-cols-3 gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.id}
                onClick={() => setIssueLength(l.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${issueLength === l.id ? "border-brass/50 bg-brass-soft" : "border-line bg-paper-raised hover:border-brass/30"}`}
              >
                <span className="block text-sm font-medium text-ink">{l.label}</span>
                <span className="block text-[0.6875rem] text-muted">{l.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Plan this many issue ideas to start</Label>
          <Input type="number" min={1} max={24} value={plannedIssues} onChange={(e) => setPlannedIssues(Number(e.target.value))} className="w-32" />
          <FieldHint>Quire drafts this many issue ideas in your content plan. Add or remove anytime.</FieldHint>
        </div>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button variant="brass" size="lg" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Create newsletter
        </Button>
      </div>
    </main>
  );
}
