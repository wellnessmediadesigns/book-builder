"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { KeyRound, Cpu, Thermometer, Check, Plug, Eye, EyeOff, User } from "lucide-react";
import { Card, Badge, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldHint } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { PROVIDER_PRESETS } from "@/lib/ai/types";
import { updateSettings, updateAuthorName } from "@/lib/actions/settings";
import { testConnection } from "@/lib/actions/ai";

type S = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxContext: number;
};

export function SettingsView({
  initial,
  authorName,
}: {
  initial: S;
  authorName: string;
}) {
  const [s, setS] = useState<S>(initial);
  const [name, setName] = useState(authorName);
  const [showKey, setShowKey] = useState(false);
  const [pending, start] = useTransition();
  const [testing, setTesting] = useState(false);

  const preset = PROVIDER_PRESETS[s.provider as keyof typeof PROVIDER_PRESETS];
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((p) => ({ ...p, [k]: v }));

  function changeProvider(p: string) {
    const pre = PROVIDER_PRESETS[p as keyof typeof PROVIDER_PRESETS];
    setS((cur) => ({ ...cur, provider: p, model: pre.models[0], baseUrl: "" }));
  }

  function save() {
    start(async () => {
      await updateSettings(s);
      if (name !== authorName) await updateAuthorName(name);
      toast.success("Settings saved");
    });
  }

  async function test() {
    setTesting(true);
    await updateSettings(s);
    const res = await testConnection();
    setTesting(false);
    if (res.ok) toast.success("Connection works", res.message);
    else toast.error("Connection failed", res.message);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-display-md font-semibold text-ink">Settings</h1>
      <p className="mt-2 text-ink-soft">
        Connect your own AI provider. Your key is stored on your server and used only for
        your generations.
      </p>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="mt-7 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brass" />
            <h2 className="font-display text-lg font-semibold text-ink">AI provider</h2>
            {!preset.needsKey || initial.apiKey ? (
              <Badge tone="sage" className="ml-auto">
                <Check className="h-3 w-3" /> {preset.needsKey ? "Configured" : "Free · no key"}
              </Badge>
            ) : (
              <Badge tone="brass" className="ml-auto">
                Needs key
              </Badge>
            )}
          </div>

          <div className="grid gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(PROVIDER_PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => changeProvider(key)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    s.provider === key
                      ? "border-brass/50 bg-brass-soft"
                      : "border-line bg-paper-raised hover:border-brass/30"
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{p.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{p.help}</p>
                </button>
              ))}
            </div>

            <div>
              <Label>Model</Label>
              <Select value={s.model} onChange={(e) => set("model", e.target.value)}>
                {preset.models.map((m) => (
                  <option key={m}>{m}</option>
                ))}
                {!preset.models.includes(s.model) && <option>{s.model}</option>}
              </Select>
              <FieldHint>
                Or paste any model id below. It must be a <strong>chat / instruct</strong>{" "}
                model — rerank, embedding, and content-safety models can&apos;t generate text.
              </FieldHint>
              <Input
                className="mt-2 font-mono text-xs"
                value={s.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
              />
            </div>

            {preset.needsKey && (
              <div>
                <Label>API key</Label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={s.apiKey}
                    onChange={(e) => set("apiKey", e.target.value)}
                    placeholder="sk-…"
                    className="pr-10 font-mono"
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <Label>Provider URL (optional)</Label>
              <Input
                value={s.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder={preset.baseUrl}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="mb-0 flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5" /> Temperature
                </Label>
                <span className="font-mono text-sm text-brass-deep">{s.temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.1}
                value={s.temperature}
                onChange={(e) => set("temperature", Number(e.target.value))}
                className="mt-2 w-full accent-[hsl(var(--muse))]"
              />
              <FieldHint>Lower is precise and consistent; higher is more creative.</FieldHint>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Button variant="brass" disabled={pending} onClick={save}>
              {pending ? <Spinner /> : <KeyRound className="h-4 w-4" />} Save settings
            </Button>
            <Button variant="outline" disabled={testing} onClick={test}>
              {testing ? <Spinner /> : <Plug className="h-4 w-4" />} Test connection
            </Button>
          </div>
        </Card>
      </motion.div>

      <Card className="mt-5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-brass" />
          <h2 className="font-display text-lg font-semibold text-ink">Author</h2>
        </div>
        <Label>Display name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
        <FieldHint>Used on title pages and the author byline in exports.</FieldHint>
        <div className="mt-4">
          <Button variant="outline" size="sm" disabled={pending} onClick={save}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
