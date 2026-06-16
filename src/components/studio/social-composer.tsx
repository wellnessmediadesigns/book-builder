"use client";

import { useState, useTransition } from "react";
import { Share2, Sparkles, Loader2, Check } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select, FieldHint } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/social";
import { platformIcon } from "@/components/studio/social-icons";
import { createSocialPost } from "@/lib/actions/social";

export function SocialComposer({
  aiReady,
  brands,
}: {
  aiReady: boolean;
  brands: { id: string; name: string }[];
}) {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [idea, setIdea] = useState("");
  const [brandId, setBrandId] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["x", "instagram", "linkedin"]);
  const [pending, start] = useTransition();

  function toggle(key: string) {
    setPlatforms((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  function submit() {
    if (!topic.trim() && !idea.trim()) {
      toast.error("Add a topic or an idea first");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Pick at least one platform");
      return;
    }
    if (!aiReady) {
      toast.error("Add your AI key first", "Open Settings to connect a provider.");
      return;
    }
    start(async () => {
      await createSocialPost({ topic, keywords, idea, brandId: brandId || null, platforms });
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Badge tone="muse">
        <Share2 className="h-3 w-3" /> New post
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">Compose a post</h1>
      <p className="mt-2 text-ink-soft">
        Give Quire a topic and a few keywords, pick your platforms, and it writes a tailored version
        for each — on-brand if you choose a brand.
      </p>

      <Card className="mt-6 space-y-5 p-6">
        <div>
          <Label>Topic</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. why morning routines beat motivation" autoFocus />
        </div>
        <div>
          <Label>Keywords (optional)</Label>
          <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="comma, separated, keywords" />
          <FieldHint>Words to weave in naturally.</FieldHint>
        </div>
        <div>
          <Label>Idea / angle (optional)</Label>
          <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="The specific take, story, or hook you want." />
        </div>
        {brands.length > 0 && (
          <div>
            <Label>Brand (optional)</Label>
            <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">No brand — neutral voice</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <FieldHint>Pulls the brand&apos;s voice and values so every post stays on-brand.</FieldHint>
          </div>
        )}
      </Card>

      <Card className="mt-5 p-6">
        <Label>Platforms</Label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORMS.map((p) => {
            const Icon = platformIcon(p.key);
            const on = platforms.includes(p.key);
            return (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                  on ? "border-muse/40 bg-muse-soft text-ink" : "border-line bg-paper-raised text-ink-soft hover:border-muse/30",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{p.label}</span>
                {on && <Check className="h-3.5 w-3.5 text-muse-deep" />}
              </button>
            );
          })}
        </div>
        <FieldHint>{platforms.length} selected — Quire writes one tailored post per platform.</FieldHint>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button variant="brass" size="lg" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate posts
        </Button>
      </div>
    </main>
  );
}
