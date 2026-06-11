"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  Cpu,
  Thermometer,
  Check,
  Plug,
  Eye,
  EyeOff,
  User,
  ArrowDownUp,
  LifeBuoy,
} from "lucide-react";
import { Card, Badge, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, FieldHint } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { PROVIDER_PRESETS } from "@/lib/ai/types";
import { updateSettings, updateAuthorName, swapProviders } from "@/lib/actions/settings";
import { testConnection, testFallback } from "@/lib/actions/ai";

const KEY_HINT: Record<string, { prefix: string; placeholder: string; where: string }> = {
  cerebras: { prefix: "csk-", placeholder: "csk-…", where: "cloud.cerebras.ai" },
  groq: { prefix: "gsk_", placeholder: "gsk_…", where: "console.groq.com" },
  google: { prefix: "AIza", placeholder: "AIza…", where: "aistudio.google.com" },
  openai: { prefix: "sk-", placeholder: "sk-…", where: "platform.openai.com" },
  openrouter: { prefix: "sk-or-", placeholder: "sk-or-…", where: "openrouter.ai" },
};

type S = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxContext: number;
  fallbackProvider: string;
  fallbackModel: string;
  fallbackApiKey: string;
  fallbackBaseUrl: string;
};

export function SettingsView({ initial, authorName }: { initial: S; authorName: string }) {
  const [s, setS] = useState<S>(initial);
  const [name, setName] = useState(authorName);
  const [pending, start] = useTransition();
  const [testing, setTesting] = useState("");

  const set = <K extends keyof S>(k: K, v: S[K]) => setS((p) => ({ ...p, [k]: v }));

  function save() {
    start(async () => {
      await updateSettings(s);
      if (name !== authorName) await updateAuthorName(name);
      toast.success("Settings saved");
    });
  }

  async function test(which: "primary" | "fallback") {
    setTesting(which);
    await updateSettings(s);
    const res = which === "primary" ? await testConnection() : await testFallback();
    setTesting("");
    if (res.ok) toast.success("Connection works", res.message);
    else toast.error("Connection failed", res.message);
  }

  function swap() {
    start(async () => {
      await updateSettings(s); // persist current edits first
      await swapProviders();
      setS((cur) => ({
        ...cur,
        provider: cur.fallbackProvider || "workersai",
        model: cur.fallbackModel,
        apiKey: cur.fallbackApiKey,
        baseUrl: cur.fallbackBaseUrl,
        fallbackProvider: cur.provider,
        fallbackModel: cur.model,
        fallbackApiKey: cur.apiKey,
        fallbackBaseUrl: cur.baseUrl,
      }));
      toast.success("Swapped", "Primary and fallback switched.");
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-display-md font-semibold text-ink">Settings</h1>
      <p className="mt-2 text-ink-soft">
        Quire uses your <strong>primary</strong> AI, and automatically switches to the{" "}
        <strong>fallback</strong> if the primary is rate-limited or unavailable. Keys are
        stored on your server and used only for your generations.
      </p>

      {/* Primary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="mt-7 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brass" />
            <h2 className="font-display text-lg font-semibold text-ink">Primary AI</h2>
            <ReadyBadge provider={s.provider} apiKey={s.apiKey} />
          </div>
          <ProviderBlock
            provider={s.provider}
            model={s.model}
            apiKey={s.apiKey}
            baseUrl={s.baseUrl}
            onChange={(f, v) => set(f as keyof S, v as never)}
          />
          <div className="mt-5">
            <Button variant="outline" size="sm" disabled={testing !== ""} onClick={() => test("primary")}>
              {testing === "primary" ? <Spinner /> : <Plug className="h-4 w-4" />} Test primary
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Swap */}
      <div className="my-3 flex justify-center">
        <Button variant="soft" size="sm" disabled={pending} onClick={swap}>
          <ArrowDownUp className="h-4 w-4" /> Swap primary &amp; fallback
        </Button>
      </div>

      {/* Fallback */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-muse" />
          <h2 className="font-display text-lg font-semibold text-ink">Fallback AI</h2>
          {s.fallbackProvider ? (
            <ReadyBadge provider={s.fallbackProvider} apiKey={s.fallbackApiKey} />
          ) : (
            <Badge tone="neutral" className="ml-auto">
              Off
            </Badge>
          )}
        </div>
        <FieldHint>
          Used automatically when the primary fails. Tip: a free Cloudflare/Groq fallback
          keeps you writing through rate limits.
        </FieldHint>
        <div className="mt-3">
          <ProviderBlock
            provider={s.fallbackProvider}
            model={s.fallbackModel}
            apiKey={s.fallbackApiKey}
            baseUrl={s.fallbackBaseUrl}
            allowOff
            onChange={(f, v) => {
              const map: Record<string, keyof S> = {
                provider: "fallbackProvider",
                model: "fallbackModel",
                apiKey: "fallbackApiKey",
                baseUrl: "fallbackBaseUrl",
              };
              set(map[f], v as never);
            }}
          />
        </div>
        {s.fallbackProvider && (
          <div className="mt-5">
            <Button variant="outline" size="sm" disabled={testing !== ""} onClick={() => test("fallback")}>
              {testing === "fallback" ? <Spinner /> : <Plug className="h-4 w-4" />} Test fallback
            </Button>
          </div>
        )}
      </Card>

      {/* Temperature */}
      <Card className="mt-5 p-6">
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
        <FieldHint>Lower is precise and consistent; higher is more creative. Applies to both providers.</FieldHint>
      </Card>

      {/* Save */}
      <div className="sticky bottom-4 mt-5 flex items-center gap-2 rounded-2xl border border-line bg-paper-raised/95 p-3 shadow-float backdrop-blur">
        <Button variant="brass" disabled={pending} onClick={save}>
          {pending ? <Spinner /> : <KeyRound className="h-4 w-4" />} Save settings
        </Button>
        <span className="text-xs text-muted">Primary, fallback, temperature, and author.</span>
      </div>

      {/* Author */}
      <Card className="mt-5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-brass" />
          <h2 className="font-display text-lg font-semibold text-ink">Author</h2>
        </div>
        <Label>Display name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
        <FieldHint>Used on title pages and the author byline in exports.</FieldHint>
      </Card>
    </div>
  );
}

function ReadyBadge({ provider, apiKey }: { provider: string; apiKey: string }) {
  const preset = PROVIDER_PRESETS[provider as keyof typeof PROVIDER_PRESETS];
  if (!preset) return null;
  if (!preset.needsKey)
    return (
      <Badge tone="sage" className="ml-auto">
        <Check className="h-3 w-3" /> Free · no key
      </Badge>
    );
  return apiKey ? (
    <Badge tone="sage" className="ml-auto">
      <Check className="h-3 w-3" /> Configured
    </Badge>
  ) : (
    <Badge tone="brass" className="ml-auto">
      Needs key
    </Badge>
  );
}

function ProviderBlock({
  provider,
  model,
  apiKey,
  baseUrl,
  allowOff,
  onChange,
}: {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  allowOff?: boolean;
  onChange: (field: string, value: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const preset = PROVIDER_PRESETS[provider as keyof typeof PROVIDER_PRESETS];

  function pick(p: string) {
    if (p === "") {
      onChange("provider", "");
      return;
    }
    const pre = PROVIDER_PRESETS[p as keyof typeof PROVIDER_PRESETS];
    onChange("provider", p);
    onChange("model", pre.models[0]);
    onChange("baseUrl", "");
    // Keys are provider-specific; clear it so a leftover key from another
    // provider can't cause a 401 on the new one.
    if (p !== provider) onChange("apiKey", "");
  }

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {allowOff && (
          <button
            onClick={() => pick("")}
            className={`rounded-xl border p-3 text-left transition-all ${
              !provider ? "border-brass/50 bg-brass-soft" : "border-line bg-paper-raised hover:border-brass/30"
            }`}
          >
            <p className="text-sm font-semibold text-ink">No fallback</p>
            <p className="mt-0.5 text-xs text-muted">Disable automatic switching.</p>
          </button>
        )}
        {Object.entries(PROVIDER_PRESETS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => pick(key)}
            className={`rounded-xl border p-3 text-left transition-all ${
              provider === key ? "border-brass/50 bg-brass-soft" : "border-line bg-paper-raised hover:border-brass/30"
            }`}
          >
            <p className="text-sm font-semibold text-ink">{p.label}</p>
            <p className="mt-0.5 text-xs text-muted">{p.help}</p>
          </button>
        ))}
      </div>

      {preset && (
        <>
          <div>
            <Label>Model</Label>
            <Select value={model} onChange={(e) => onChange("model", e.target.value)}>
              {preset.models.map((m) => (
                <option key={m}>{m}</option>
              ))}
              {!preset.models.includes(model) && model && <option>{model}</option>}
            </Select>
            <FieldHint>
              Or paste any model id below. Must be a <strong>chat / instruct</strong> model
              — rerank, embedding, and content-safety models can&apos;t generate text.
            </FieldHint>
            <Input
              className="mt-2 font-mono text-xs"
              value={model}
              onChange={(e) => onChange("model", e.target.value)}
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free"
            />
          </div>

          {preset.needsKey && (
            <div>
              <Label>API key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => onChange("apiKey", e.target.value)}
                  placeholder={KEY_HINT[provider]?.placeholder ?? "your API key"}
                  className="pr-10 font-mono"
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {KEY_HINT[provider] && (
                <FieldHint>
                  This should be a <strong>{preset.label.split(" ")[0]}</strong> key (starts
                  with <code className="font-mono">{KEY_HINT[provider].prefix}</code>), from{" "}
                  {KEY_HINT[provider].where}. Paste carefully — no spaces.
                </FieldHint>
              )}
            </div>
          )}

          <div>
            <Label>Provider URL (optional)</Label>
            <Input
              value={baseUrl}
              onChange={(e) => onChange("baseUrl", e.target.value)}
              placeholder={preset.baseUrl}
              className="font-mono text-xs"
            />
          </div>
        </>
      )}
    </div>
  );
}
