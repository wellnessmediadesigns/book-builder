"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Type,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Save,
  Download,
  BookOpen,
  Loader2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCw,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { celebrate } from "@/lib/confetti";
import { COVER_FONTS, coverFont } from "@/lib/cover-fonts";
import {
  COVER_PALETTE,
  PRESET_LABEL,
  presetLayer,
  type TextLayer,
  type LayerKind,
} from "@/lib/cover-design";
import { assignDesignToBook, listAssignableBooks } from "@/lib/actions/cover-studio";

const PRESETS: LayerKind[] = ["title", "subtitle", "author", "backcopy", "spine", "custom"];

export function CoverEditor({
  designId,
  name: initialName,
  width,
  height,
  baseUrl,
  initialLayers,
}: {
  designId: string;
  name: string;
  width: number;
  height: number;
  baseUrl: string;
  initialLayers: TextLayer[];
}) {
  const [name, setName] = useState(initialName);
  const [layers, setLayers] = useState<TextLayer[]>(initialLayers);
  const [selectedId, setSelectedId] = useState<string | null>(initialLayers[0]?.id ?? null);
  const [scale, setScale] = useState(0.2);
  const [snap, setSnap] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const stageWrapRef = useRef<HTMLDivElement>(null);
  const baseImgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  // Fit the stage to the available area.
  const fit = useCallback(() => {
    const el = stageWrapRef.current;
    if (!el || !width || !height) return;
    const pad = 32;
    const s = Math.min((el.clientWidth - pad) / width, (el.clientHeight - pad) / height, 1);
    setScale(s > 0 ? s : 0.1);
  }, [width, height]);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  function patch(id: string, p: Partial<TextLayer>) {
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  }

  function addPreset(kind: LayerKind) {
    const l = presetLayer(kind, width, height);
    setLayers((ls) => [...ls, l]);
    setSelectedId(l.id);
  }

  function duplicate(id: string) {
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const copy: TextLayer = { ...src, id: `l${Date.now().toString(36)}`, x: src.x + Math.round(width * 0.02), y: src.y + Math.round(height * 0.02) };
    setLayers((ls) => [...ls, copy]);
    setSelectedId(copy.id);
  }

  function remove(id: string) {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function move(id: string, dir: -1 | 1) {
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  // ——— dragging ———
  function onLayerPointerDown(e: React.PointerEvent, l: TextLayer) {
    e.preventDefault();
    setSelectedId(l.id);
    drag.current = { id: l.id, startX: e.clientX, startY: e.clientY, ox: l.x, oy: l.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    const l = layers.find((x) => x.id === d.id);
    if (!l) return;
    let nx = Math.round(d.ox + dx);
    let ny = Math.round(d.oy + dy);
    // center snap
    const cx = nx + l.width / 2;
    const thresh = 10 / scale;
    const vSnap = Math.abs(cx - width / 2) < thresh;
    if (vSnap) nx = Math.round(width / 2 - l.width / 2);
    const hSnap = false; // vertical-center snap needs block height; keep horizontal centering only
    setSnap({ v: vSnap, h: hSnap });
    patch(d.id, { x: nx, y: ny });
  }
  function onPointerUp() {
    drag.current = null;
    setSnap({ v: false, h: false });
  }

  // ——— fonts + render ———
  async function ensureFonts() {
    const seen = new Set<string>();
    for (const l of layers) {
      const key = `${l.italic ? "italic " : ""}${l.weight} 64px "${l.fontFamily}"`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        await document.fonts.load(key);
      } catch {
        /* ignore */
      }
    }
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        out.push("");
        continue;
      }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const test = `${line} ${words[i]}`;
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = words[i];
        } else line = test;
      }
      out.push(line);
    }
    return out;
  }

  async function renderCanvas(): Promise<HTMLCanvasElement> {
    await ensureFonts();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const img = baseImgRef.current;
    if (img) {
      try {
        await img.decode();
      } catch {
        /* already decoded */
      }
      ctx.drawImage(img, 0, 0, width, height);
    }
    for (const l of layers) {
      ctx.save();
      ctx.globalAlpha = l.opacity;
      ctx.fillStyle = l.color;
      ctx.textBaseline = "top";
      ctx.font = `${l.italic ? "italic " : ""}${l.weight} ${l.fontSize}px "${l.fontFamily}"`;
      try {
        ctx.letterSpacing = `${l.letterSpacing || 0}px`;
      } catch {
        /* unsupported */
      }
      const lines = wrap(ctx, l.text, l.width);
      const lineH = l.fontSize * l.lineHeight;
      const blockH = lines.length * lineH;
      const cx = l.x + l.width / 2;
      const cy = l.y + blockH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((l.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
      if (l.shadow) {
        ctx.shadowColor = l.shadow.color;
        ctx.shadowBlur = l.shadow.blur;
        ctx.shadowOffsetX = l.shadow.dx;
        ctx.shadowOffsetY = l.shadow.dy;
      }
      lines.forEach((ln, i) => {
        const w = ctx.measureText(ln).width;
        let lx = l.x;
        if (l.align === "center") lx = l.x + (l.width - w) / 2;
        else if (l.align === "right") lx = l.x + (l.width - w);
        const ly = l.y + i * lineH;
        if (l.stroke && l.stroke.width > 0) {
          ctx.lineWidth = l.stroke.width;
          ctx.strokeStyle = l.stroke.color;
          ctx.strokeText(ln, lx, ly);
        }
        ctx.fillText(ln, lx, ly);
      });
      ctx.restore();
    }
    return canvas;
  }

  function canvasToBlob(canvas: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
    return new Promise((res) => canvas.toBlob((b) => res(b!), type, q));
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function thumbnail(full: HTMLCanvasElement): Promise<Blob> {
    const tw = 600;
    const th = Math.round((height / width) * tw);
    const c = document.createElement("canvas");
    c.width = tw;
    c.height = th;
    c.getContext("2d")!.drawImage(full, 0, 0, tw, th);
    return canvasToBlob(c, "image/jpeg", 0.82);
  }

  const slug = (name || "cover").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cover";

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      const canvas = await renderCanvas();
      const [png, thumb] = await Promise.all([canvasToBlob(canvas, "image/png"), thumbnail(canvas)]);
      const body = new FormData();
      body.set("designId", designId);
      body.set("name", name);
      body.set("layersJson", JSON.stringify(layers));
      body.set("export", new File([png], "export.png", { type: "image/png" }));
      body.set("thumb", new File([thumb], "thumb.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/designs/save", { method: "POST", body });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Design saved");
      return true;
    } catch {
      toast.error("Couldn't save", "Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function exportImage(type: "image/png" | "image/jpeg") {
    setBusy(type);
    try {
      const canvas = await renderCanvas();
      const blob = await canvasToBlob(canvas, type, type === "image/jpeg" ? 0.95 : undefined);
      downloadBlob(blob, `${slug}.${type === "image/png" ? "png" : "jpg"}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    try {
      const canvas = await renderCanvas();
      const png = await canvasToBlob(canvas, "image/png");
      const bytes = new Uint8Array(await png.arrayBuffer());
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const img = await doc.embedPng(bytes);
      // 300 DPI → points (72pt/in)
      const wPt = (width / 300) * 72;
      const hPt = (height / 300) * 72;
      const page = doc.addPage([wPt, hPt]);
      page.drawImage(img, { x: 0, y: 0, width: wPt, height: hPt });
      const pdf = await doc.save();
      downloadBlob(new Blob([pdf as BufferSource], { type: "application/pdf" }), `${slug}.pdf`);
    } catch {
      toast.error("PDF export failed");
    } finally {
      setBusy(null);
    }
  }

  const dispW = Math.round(width * scale);
  const dispH = Math.round(height * scale);

  return (
    <div className="flex h-[calc(100dvh-0px)] flex-col bg-paper-sunken/40">
      {/* top bar */}
      <header className="flex items-center gap-2 border-b border-line bg-paper px-3 py-2.5">
        <Link href="/studio/covers" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-paper-sunken hover:text-ink" aria-label="Back to Cover Studio">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <input
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          className="min-w-0 flex-1 truncate bg-transparent font-display text-sm font-semibold text-ink outline-none sm:max-w-xs"
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="soft" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
          <ExportMenu busy={busy} onPng={() => exportImage("image/png")} onJpg={() => exportImage("image/jpeg")} onPdf={exportPdf} />
          <Button variant="brass" size="sm" onClick={() => setAssignOpen(true)}>
            <BookOpen className="h-3.5 w-3.5" /> Assign
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* left: presets + layers */}
        <aside className="order-2 border-t border-line bg-paper lg:order-1 lg:w-56 lg:border-r lg:border-t-0">
          <div className="p-3">
            <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Add text</p>
            <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-2">
              {PRESETS.map((k) => (
                <button
                  key={k}
                  onClick={() => addPreset(k)}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-paper-raised px-2 py-2 text-xs text-ink-soft transition-colors hover:border-brass/30 hover:text-ink"
                >
                  <Plus className="h-3 w-3" /> {PRESET_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden border-t border-line p-3 lg:block">
            <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">Layers</p>
            <div className="space-y-1">
              {layers.length === 0 && <p className="text-xs text-muted">No text yet.</p>}
              {[...layers].reverse().map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                    selectedId === l.id ? "bg-muse-soft text-ink" : "text-ink-soft hover:bg-paper-sunken",
                  )}
                >
                  <Type className="h-3 w-3 shrink-0" />
                  <span className="flex-1 truncate">{l.text || PRESET_LABEL[l.kind]}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* center: stage */}
        <div ref={stageWrapRef} className="order-1 flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 lg:order-2" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <div
            className="relative shadow-float"
            style={{ width: dispW, height: dispH }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={baseImgRef} src={baseUrl} alt="" crossOrigin="anonymous" className="absolute inset-0 h-full w-full select-none" draggable={false} />
            {layers.map((l) => (
              <div
                key={l.id}
                onPointerDown={(e) => onLayerPointerDown(e, l)}
                className={cn("absolute cursor-move select-none", selectedId === l.id && "outline outline-1 outline-muse/70")}
                style={{
                  left: l.x * scale,
                  top: l.y * scale,
                  width: l.width * scale,
                  transform: `rotate(${l.rotation}deg)`,
                  transformOrigin: "center center",
                  fontFamily: `"${l.fontFamily}"`,
                  fontSize: l.fontSize * scale,
                  lineHeight: l.lineHeight,
                  color: l.color,
                  fontWeight: l.weight,
                  fontStyle: l.italic ? "italic" : "normal",
                  textAlign: l.align,
                  letterSpacing: l.letterSpacing * scale,
                  opacity: l.opacity,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textShadow: l.shadow ? `${l.shadow.dx * scale}px ${l.shadow.dy * scale}px ${l.shadow.blur * scale}px ${l.shadow.color}` : undefined,
                  WebkitTextStroke: l.stroke && l.stroke.width > 0 ? `${l.stroke.width * scale}px ${l.stroke.color}` : undefined,
                }}
              >
                {l.text || PRESET_LABEL[l.kind]}
              </div>
            ))}
            {snap.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-muse" />}
          </div>
        </div>

        {/* right: properties */}
        <aside className="order-3 max-h-[55vh] overflow-y-auto border-t border-line bg-paper lg:max-h-none lg:w-72 lg:border-l lg:border-t-0">
          {selected ? (
            <Properties
              key={selected.id}
              layer={selected}
              onPatch={(p) => patch(selected.id, p)}
              onDuplicate={() => duplicate(selected.id)}
              onDelete={() => remove(selected.id)}
              onForward={() => move(selected.id, 1)}
              onBack={() => move(selected.id, -1)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-muted">
              <Type className="mb-2 h-6 w-6" />
              Select a text layer, or add one from the left.
            </div>
          )}
        </aside>
      </div>

      {assignOpen && (
        <AssignModal
          designId={designId}
          onClose={() => setAssignOpen(false)}
          onBeforeAssign={save}
        />
      )}
    </div>
  );
}

function ExportMenu({ busy, onPng, onJpg, onPdf }: { busy: string | null; onPng: () => void; onJpg: () => void; onPdf: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="soft" size="sm" onClick={() => setOpen((o) => !o)} disabled={!!busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-40 overflow-hidden rounded-xl border border-line bg-paper-raised p-1 shadow-float">
            {[
              { label: "PNG image", run: onPng },
              { label: "JPG image", run: onJpg },
              { label: "Print PDF", run: onPdf },
            ].map((o) => (
              <button key={o.label} onClick={() => { setOpen(false); o.run(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-paper-sunken hover:text-ink">
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function Properties({
  layer,
  onPatch,
  onDuplicate,
  onDelete,
  onForward,
  onBack,
}: {
  layer: TextLayer;
  onPatch: (p: Partial<TextLayer>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onForward: () => void;
  onBack: () => void;
}) {
  const font = coverFont(layer.fontFamily);
  const weights = font?.weights ?? [400, 700];
  return (
    <div className="space-y-3.5 p-3.5">
      <div className="flex items-center gap-1">
        <Badge tone="muse">{PRESET_LABEL[layer.kind]}</Badge>
        <div className="ml-auto flex items-center gap-0.5">
          <IconBtn label="Back" onClick={onBack}><ChevronDown className="h-4 w-4" /></IconBtn>
          <IconBtn label="Forward" onClick={onForward}><ChevronUp className="h-4 w-4" /></IconBtn>
          <IconBtn label="Duplicate" onClick={onDuplicate}><Copy className="h-4 w-4" /></IconBtn>
          <IconBtn label="Delete" onClick={onDelete} danger><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      </div>

      <Field label="Text">
        <textarea
          value={layer.text}
          onChange={(e) => onPatch({ text: e.target.value })}
          rows={layer.kind === "backcopy" ? 4 : 2}
          className="w-full resize-y rounded-lg border border-line bg-paper-raised px-2.5 py-2 text-sm text-ink outline-none focus:border-muse/40 focus:ring-2 focus:ring-muse/20"
        />
      </Field>

      <Field label="Font">
        <select
          value={layer.fontFamily}
          onChange={(e) => {
            const f = coverFont(e.target.value);
            const w = f && !f.weights.includes(layer.weight) ? f.weights[0] : layer.weight;
            onPatch({ fontFamily: e.target.value, weight: w });
          }}
          className="h-9 w-full rounded-lg border border-line bg-paper-raised px-2 text-sm text-ink outline-none focus:border-muse/40"
          style={{ fontFamily: `"${layer.fontFamily}"` }}
        >
          {COVER_FONTS.map((f) => (
            <option key={f.family} value={f.family} style={{ fontFamily: `"${f.family}"` }}>{f.label}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label={`Size ${layer.fontSize}`}>
          <input type="range" min={8} max={Math.max(200, layer.fontSize)} value={layer.fontSize} onChange={(e) => onPatch({ fontSize: Number(e.target.value) })} className="w-full accent-[hsl(var(--muse))]" />
        </Field>
        <Field label="Weight">
          <select value={layer.weight} onChange={(e) => onPatch({ weight: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-line bg-paper-raised px-2 text-sm text-ink outline-none">
            {weights.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-1">
        <Toggle active={layer.italic} onClick={() => onPatch({ italic: !layer.italic })} label="Italic"><Italic className="h-4 w-4" /></Toggle>
        <Toggle active={layer.weight >= 700} onClick={() => onPatch({ weight: layer.weight >= 700 ? (weights.includes(400) ? 400 : weights[0]) : (weights.includes(700) ? 700 : weights[weights.length - 1]) })} label="Bold"><Bold className="h-4 w-4" /></Toggle>
        <span className="mx-1 h-5 w-px bg-line" />
        <Toggle active={layer.align === "left"} onClick={() => onPatch({ align: "left" })} label="Left"><AlignLeft className="h-4 w-4" /></Toggle>
        <Toggle active={layer.align === "center"} onClick={() => onPatch({ align: "center" })} label="Center"><AlignCenter className="h-4 w-4" /></Toggle>
        <Toggle active={layer.align === "right"} onClick={() => onPatch({ align: "right" })} label="Right"><AlignRight className="h-4 w-4" /></Toggle>
      </div>

      <Field label="Color">
        <div className="flex flex-wrap gap-1.5">
          {COVER_PALETTE.map((c) => (
            <button key={c} onClick={() => onPatch({ color: c })} className={cn("h-6 w-6 rounded-md border border-line", layer.color.toLowerCase() === c.toLowerCase() && "ring-2 ring-muse ring-offset-1")} style={{ background: c }} aria-label={c} />
          ))}
          <input type="color" value={layer.color} onChange={(e) => onPatch({ color: e.target.value })} className="h-6 w-6 cursor-pointer rounded-md border border-line bg-transparent" aria-label="Custom color" />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label={`Line ${layer.lineHeight.toFixed(2)}`}>
          <input type="range" min={0.8} max={2} step={0.05} value={layer.lineHeight} onChange={(e) => onPatch({ lineHeight: Number(e.target.value) })} className="w-full accent-[hsl(var(--muse))]" />
        </Field>
        <Field label={`Spacing ${layer.letterSpacing}`}>
          <input type="range" min={-5} max={40} value={layer.letterSpacing} onChange={(e) => onPatch({ letterSpacing: Number(e.target.value) })} className="w-full accent-[hsl(var(--muse))]" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label={`Rotation ${layer.rotation}°`}>
          <div className="flex items-center gap-1">
            <input type="range" min={-180} max={180} value={layer.rotation} onChange={(e) => onPatch({ rotation: Number(e.target.value) })} className="w-full accent-[hsl(var(--muse))]" />
            <IconBtn label="90°" onClick={() => onPatch({ rotation: layer.rotation === 90 ? 0 : 90 })}><RotateCw className="h-4 w-4" /></IconBtn>
          </div>
        </Field>
        <Field label={`Opacity ${Math.round(layer.opacity * 100)}%`}>
          <input type="range" min={0} max={1} step={0.05} value={layer.opacity} onChange={(e) => onPatch({ opacity: Number(e.target.value) })} className="w-full accent-[hsl(var(--muse))]" />
        </Field>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-3">
        <Toggle active={!!layer.shadow} onClick={() => onPatch({ shadow: layer.shadow ? null : { color: "#000000", blur: Math.round(layer.fontSize * 0.15), dx: 0, dy: Math.round(layer.fontSize * 0.05) } })} label="Shadow">Shadow</Toggle>
        <Toggle active={!!layer.stroke} onClick={() => onPatch({ stroke: layer.stroke ? null : { color: "#000000", width: Math.max(1, Math.round(layer.fontSize * 0.03)) } })} label="Outline">Outline</Toggle>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken", danger ? "hover:bg-clay/10 hover:text-clay" : "hover:text-ink")}>
      {children}
    </button>
  );
}

function Toggle({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs transition-colors", active ? "border-muse/40 bg-muse-soft text-muse-deep" : "border-line bg-paper-raised text-ink-soft hover:text-ink")}>
      {children}
    </button>
  );
}

function AssignModal({ designId, onClose, onBeforeAssign }: { designId: string; onClose: () => void; onBeforeAssign: () => Promise<boolean> }) {
  const [books, setBooks] = useState<{ id: string; title: string }[]>([]);
  const [bookId, setBookId] = useState("");
  const [slot, setSlot] = useState("front");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    listAssignableBooks().then((b) => {
      setBooks(b);
      setBookId(b[0]?.id ?? "");
    }).catch(() => {});
  }, []);

  async function go() {
    if (!bookId) return;
    setPending(true);
    const saved = await onBeforeAssign();
    if (!saved) {
      setPending(false);
      return;
    }
    const res = await assignDesignToBook(designId, bookId, slot);
    setPending(false);
    if (res.ok) {
      celebrate("goal");
      toast.success("Cover assigned", "It's now on your book.");
      onClose();
    } else {
      toast.error("Couldn't assign", res.error);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="relative w-full max-w-sm rounded-2xl border border-line bg-paper-raised p-5 shadow-float">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink">Assign to a book</h3>
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-paper-sunken hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Saves this design, then sets it as the book&apos;s cover.</p>
          {books.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">No books yet. Create one first.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <Field label="Book">
                <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-paper-raised px-2.5 text-sm text-ink outline-none">
                  {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </Field>
              <Field label="Slot">
                <div className="flex gap-2">
                  {(["front", "back", "wrap"] as const).map((s) => (
                    <button key={s} onClick={() => setSlot(s)} className={cn("flex-1 rounded-lg border px-2 py-2 text-sm capitalize transition-colors", slot === s ? "border-brass/50 bg-brass-soft text-brass-deep" : "border-line bg-paper-raised text-ink-soft hover:text-ink")}>{s}</button>
                  ))}
                </div>
              </Field>
              <Button variant="brass" className="w-full" onClick={go} disabled={pending || !bookId}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Save &amp; assign
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
