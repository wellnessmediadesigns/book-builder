"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Upload,
  Trash2,
  Wand2,
  Loader2,
  ImagePlus,
  Pencil,
  Download,
  Layers,
} from "lucide-react";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn, relativeTime } from "@/lib/utils";
import {
  createDesignFromTemplate,
  deleteTemplate,
  deleteDesign,
  type TemplateInfo,
  type DesignInfo,
} from "@/lib/actions/cover-studio";

export function CoverStudio({
  templates: initialTemplates,
  designs: initialDesigns,
}: {
  templates: TemplateInfo[];
  designs: DesignInfo[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [designs, setDesigns] = useState(initialDesigns);
  const [uploading, setUploading] = useState(false);
  const [, start] = useTransition();

  async function upload(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Unsupported file", "Use a PNG, JPEG, or WebP image.");
      return;
    }
    setUploading(true);
    try {
      const dims = await readDims(file);
      const body = new FormData();
      body.set("name", file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Template");
      body.set("file", file);
      body.set("width", String(dims.width));
      body.set("height", String(dims.height));
      const res = await fetch("/api/templates/upload", { method: "POST", body });
      const data = (await res.json()) as { ok?: boolean; template?: TemplateInfo; error?: string };
      if (!res.ok || !data.ok || !data.template) throw new Error(data.error || "Upload failed");
      setTemplates((t) => [data.template!, ...t]);
      toast.success("Template added");
    } catch (e) {
      toast.error("Upload failed", e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  }

  function removeTemplate(id: string) {
    setTemplates((t) => t.filter((x) => x.id !== id));
    deleteTemplate(id).catch(() => {});
    toast.success("Template removed");
  }

  function removeDesign(id: string) {
    setDesigns((d) => d.filter((x) => x.id !== id));
    deleteDesign(id).catch(() => {});
    toast.success("Design removed");
  }

  return (
    <div className="space-y-12">
      {/* Templates */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Templates</h2>
            <p className="text-sm text-ink-soft">Reusable cover &amp; wrap images — upload the ones you designed off-site.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={cn("flex aspect-[2/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-paper-raised/50 text-center text-muted transition-colors hover:border-brass/40 hover:text-ink", uploading && "pointer-events-none opacity-60")}>
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-brass" /> : <ImagePlus className="h-7 w-7 text-brass" />}
            <span className="px-4 text-sm font-medium">{uploading ? "Uploading…" : "Upload a template"}</span>
            <span className="text-xs">PNG · JPEG · WebP</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
          </label>

          {templates.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}>
              <Card className="group relative flex flex-col overflow-hidden">
                <div className="relative aspect-[2/3] bg-paper-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/images/templates/${t.id}`} alt={t.name} className="absolute inset-0 h-full w-full object-cover" />
                  <button onClick={() => removeTemplate(t.id)} aria-label="Delete template" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-paper-raised/90 text-ink-soft opacity-0 shadow-soft backdrop-blur transition-opacity hover:text-clay group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 p-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{t.name}</span>
                  <Button variant="museSoft" size="sm" onClick={() => start(() => createDesignFromTemplate(t.id))}>
                    <Wand2 className="h-3.5 w-3.5" /> Use
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Designs */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold text-ink">Designs</h2>
          <p className="text-sm text-ink-soft">Covers you&apos;ve styled with text — edit, download, or assign to a book.</p>
        </div>

        {designs.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title="No designs yet"
            description="Upload a template above, then hit “Use” to start adding your title, author, and back-cover text."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {designs.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}>
                <Card className="group flex flex-col overflow-hidden">
                  <Link href={`/studio/covers/editor/${d.id}`} className="relative block aspect-[2/3] bg-paper-sunken">
                    {d.hasExport ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/images/designs/${d.id}/thumb`} alt={d.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/images/designs/${d.id}/base`} alt={d.name} className="absolute inset-0 h-full w-full object-cover opacity-80" />
                    )}
                    {!d.hasExport && <Badge tone="neutral" className="absolute left-2 top-2">Draft</Badge>}
                  </Link>
                  <div className="flex items-center gap-1 p-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{d.name}</span>
                    <span className="text-[0.625rem] text-muted">{relativeTime(d.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 border-t border-line p-1.5">
                    <Link href={`/studio/covers/editor/${d.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    {d.hasExport && (
                      <a href={`/api/images/designs/${d.id}/export`} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink">
                        <Download className="h-3.5 w-3.5" /> Open
                      </a>
                    )}
                    <button onClick={() => removeDesign(d.id)} aria-label="Delete design" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-clay/10 hover:text-clay">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function readDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
