"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { PLATFORM_MAP } from "@/lib/social";
import { platformIcon } from "@/components/studio/social-icons";
import { regenerateVariant, updateVariant, deletePost, restorePost } from "@/lib/actions/social";

type Variant = { id: string; platform: string; content: string };

export function SocialPostDetail({
  post,
  variants,
}: {
  post: { id: string; title: string; idea: string; brandName: string | null };
  variants: Variant[];
}) {
  const router = useRouter();

  function removePost() {
    if (!confirm("Move this post to Trash?")) return;
    deletePost(post.id);
    toast.action("Moved to Trash", { label: "Undo", onClick: () => restorePost(post.id) });
    router.push("/studio/social");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/studio/social" className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink">
          <ChevronLeft className="h-4 w-4" /> Social
        </Link>
        <button onClick={removePost} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-clay">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      <div className="mb-7">
        <div className="flex items-center gap-2">
          <Badge tone="muse">Post</Badge>
          {post.brandName && <Badge tone="brass">{post.brandName}</Badge>}
        </div>
        <h1 className="mt-3 font-display text-display-md font-semibold text-ink">{post.title || "Untitled post"}</h1>
        {post.idea && <p className="mt-1.5 text-ink-soft">{post.idea}</p>}
      </div>

      <div className="space-y-4">
        {variants.map((v) => (
          <VariantCard key={v.id} variant={v} onChanged={() => router.refresh()} />
        ))}
      </div>
    </main>
  );
}

function VariantCard({ variant, onChanged }: { variant: Variant; onChanged: () => void }) {
  const spec = PLATFORM_MAP[variant.platform];
  const Icon = platformIcon(variant.platform);
  const [text, setText] = useState(variant.content);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const over = spec && text.length > spec.charLimit;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  async function regenerate() {
    setBusy(true);
    const res = await regenerateVariant(variant.id);
    setBusy(false);
    if (res.ok) {
      onChanged();
      toast.success(`${spec?.label ?? variant.platform} regenerated`);
    } else {
      toast.error(res.error === "no_key" ? "Add your AI key first" : "Couldn't regenerate", res.error === "no_key" ? "Open Settings to connect a provider." : res.error);
    }
  }

  function saveIfChanged() {
    if (text !== variant.content) updateVariant(variant.id, text);
  }

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper-sunken text-ink-soft">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-display text-sm font-semibold text-ink">{spec?.label ?? variant.platform}</span>
        <span className={cn("ml-auto font-mono text-xs", over ? "text-clay" : "text-muted")}>
          {text.length}{spec ? ` / ${spec.charLimit}` : ""}
        </span>
      </div>

      {busy ? (
        <div className="flex h-28 items-center justify-center text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={saveIfChanged}
          rows={Math.min(14, Math.max(4, text.split("\n").length + 1))}
          placeholder="Empty — hit Regenerate to write this variant."
          className="w-full resize-y rounded-xl border border-line bg-paper px-3.5 py-3 text-base sm:text-sm leading-relaxed text-ink outline-none transition-colors focus:border-muse/40"
        />
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button variant="soft" size="sm" onClick={copy} disabled={!text.trim()}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
        </Button>
        <Button variant="ghost" size="sm" onClick={regenerate} disabled={busy}>
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
      </div>
    </div>
  );
}
