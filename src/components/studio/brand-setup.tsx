"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2, Loader2, Check } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { createBrand } from "@/lib/actions/projects";
import { analyzeStyleSample } from "@/lib/actions/ai";

export function BrandSetup({ aiReady }: { aiReady: boolean }) {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [audience, setAudience] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [sample, setSample] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [voiceCaptured, setVoiceCaptured] = useState(false);
  const [pending, start] = useTransition();

  async function extractVoice() {
    if (sample.trim().length < 120) {
      toast.error("Paste a bit more", "A few sentences in your brand's voice works best.");
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
      if (res.data.styleNotes) setStyleNotes(res.data.styleNotes);
      if (res.data.audience && !audience) setAudience(res.data.audience);
      setVoiceCaptured(true);
      toast.success("Voice captured", "Your brand identity will match this style.");
    } else {
      toast.error("Couldn't analyze", res.error === "no_key" ? "Connect an AI provider in Settings." : res.error);
    }
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Name your brand first");
      return;
    }
    start(async () => {
      await createBrand({ name, about, audience, styleNotes });
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Badge tone="brass">
        <Sparkles className="h-3 w-3" /> New brand
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">Build your brand</h1>
      <p className="mt-2 text-ink-soft">
        Give Muse a theme and an audience, and it builds a reusable brand identity — voice, values,
        positioning — that your social posts and newsletters can stay perfectly consistent with.
      </p>

      <Card className="mt-6 space-y-5 p-6">
        <div>
          <Label>Brand name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Calm Founder" autoFocus />
        </div>
        <div>
          <Label>What is the brand about?</Label>
          <Textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="The theme or topic, what it stands for, and the feeling it should give people." />
          <FieldHint>A sentence or two is plenty — Muse fleshes out the rest.</FieldHint>
        </div>
        <div>
          <Label>Who is it for?</Label>
          <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. overwhelmed early-stage founders" />
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
          Optional: paste something written in the voice you want — a past post, a bio, anything — and
          Quire learns the tone so the brand sounds like you.
        </p>
        <Textarea value={sample} onChange={(e) => setSample(e.target.value)} placeholder="Paste a sample of the voice…" className="min-h-[120px]" />
        <div className="flex items-center gap-2">
          <Button variant="museSoft" size="sm" onClick={extractVoice} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Extract voice
          </Button>
          {styleNotes && <span className="truncate text-xs text-muted">Voice captured ✓</span>}
        </div>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button variant="brass" size="lg" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Build brand
        </Button>
      </div>
    </main>
  );
}
