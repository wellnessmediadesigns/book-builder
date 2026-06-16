"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RotateCcw, Loader2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { generateBrandIdentity } from "@/lib/actions/ai";

export function BrandActions({
  projectId,
  name,
  positioning,
  brainstormHref,
}: {
  projectId: string;
  name: string;
  positioning: string;
  brainstormHref: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function regenerate() {
    if (!confirm("Regenerate this brand's identity? This rebuilds the identity from its theme and voice.")) return;
    setBusy(true);
    const res = await generateBrandIdentity(projectId);
    setBusy(false);
    if (res.ok) {
      toast.success("Brand identity refreshed");
      router.refresh();
    } else {
      toast.error(res.error === "no_key" ? "Add your AI key first" : "Couldn't regenerate", res.error === "no_key" ? "Open Settings to connect a provider." : res.error);
    }
  }

  return (
    <div className="mx-auto mb-6 max-w-4xl px-6 pt-10">
      <div className="grain relative overflow-hidden rounded-3xl border border-line bg-paper-raised p-6 shadow-soft sm:p-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(70% 90% at 90% 0%, hsl(var(--brass) / 0.12), transparent 60%)" }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Badge tone="brass">
              <Sparkles className="h-3 w-3" /> Brand
            </Badge>
            <h1 className="mt-3 line-clamp-2 font-display text-display-md font-semibold text-ink">{name}</h1>
            {positioning && <p className="mt-1.5 max-w-lg text-ink-soft">{positioning}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {brainstormHref && (
              <Link href={brainstormHref}>
                <Button variant="museSoft">
                  <Lightbulb className="h-4 w-4" /> <span className="hidden sm:inline">Continue brainstorming</span><span className="sm:hidden">Brainstorm</span>
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={regenerate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Regenerate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
