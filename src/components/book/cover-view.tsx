"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Download,
  FileText,
  Loader2,
  Package,
  BookOpen,
  Check,
} from "lucide-react";
import { Card, Badge, EmptyState, Spinner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { previewHtml } from "@/lib/actions/export";
import { deleteCover, type CoverInfo } from "@/lib/actions/covers";
import {
  COVER_SLOTS,
  COVER_ACCEPT,
  COVER_MAX_BYTES,
  COVER_MIME,
  type CoverType,
} from "@/lib/covers";

function fmtSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CoverView({
  projectId,
  title,
  covers,
  chapterCount,
  writtenCount,
  wordCount,
}: {
  projectId: string;
  title: string;
  covers: CoverInfo[];
  chapterCount: number;
  writtenCount: number;
  wordCount: number;
}) {
  const [slots, setSlots] = useState<Record<string, CoverInfo | undefined>>(
    () => Object.fromEntries(covers.map((c) => [c.type, c])),
  );
  const have = COVER_SLOTS.filter((s) => slots[s.type]).length;

  function update(type: CoverType, info: CoverInfo | null) {
    setSlots((s) => ({ ...s, [type]: info ?? undefined }));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Badge tone="brass">
        <ImageIcon className="h-3 w-3" /> Cover &amp; showcase
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
        Your cover, ready for KDP
      </h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Upload the covers you designed for <span className="font-medium text-ink">{title}</span>,
        see the whole book come together, then download everything you need to publish on Amazon KDP —
        no design tools or AI required.
      </p>

      {/* Upload + gallery slots */}
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {COVER_SLOTS.map((slot, i) => (
          <motion.div
            key={slot.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <CoverSlot
              projectId={projectId}
              type={slot.type}
              label={slot.label}
              blurb={slot.blurb}
              info={slots[slot.type]}
              onChange={(info) => update(slot.type, info)}
            />
          </motion.div>
        ))}
      </div>

      {/* Interior preview */}
      <h2 className="mt-12 font-display text-lg font-semibold text-ink">Inside the book</h2>
      <p className="mt-1 text-sm text-ink-soft">
        A live look at your formatted interior — the same pages you&apos;ll export.
      </p>
      <InteriorPreview projectId={projectId} />

      {/* KDP download */}
      <h2 className="mt-12 font-display text-lg font-semibold text-ink">Download for KDP</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {writtenCount}/{chapterCount} chapters written · {formatNumber(wordCount)} words ·{" "}
        {have}/3 covers uploaded
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* One-click bundle */}
        <Card className="flex flex-col p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass-soft text-brass-deep">
              <Package className="h-5 w-5" />
            </div>
            <Badge tone="brass">One click</Badge>
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold text-ink">KDP bundle (.zip)</h3>
          <p className="mt-1 flex-1 text-sm text-ink-soft">
            One archive with the manuscript PDF, every uploaded cover, and a short README of the
            upload steps. Download it, then drop the files into KDP.
          </p>
          <div className="mt-4">
            <Button
              variant="brass"
              onClick={() => window.open(`/api/export/kdp?project=${projectId}`, "_blank")}
            >
              <Download className="h-4 w-4" /> Download KDP bundle
            </Button>
          </div>
        </Card>

        {/* Individual files */}
        <Card className="flex flex-col p-5">
          <h3 className="font-display text-lg font-semibold text-ink">Individual files</h3>
          <p className="mt-1 text-sm text-ink-soft">Grab just what you need.</p>
          <div className="mt-3 space-y-2">
            <a
              href={`/api/export/pdf?project=${projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-brass/30 hover:bg-paper-sunken"
            >
              <FileText className="h-4 w-4 text-brass" />
              <span className="flex-1 font-medium">Manuscript (PDF)</span>
              <Download className="h-4 w-4 text-muted" />
            </a>
            {COVER_SLOTS.map((slot) =>
              slots[slot.type] ? (
                <a
                  key={slot.type}
                  href={`/api/covers/${projectId}/${slot.type}?download=1`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink transition-colors hover:border-brass/30 hover:bg-paper-sunken"
                >
                  <ImageIcon className="h-4 w-4 text-brass" />
                  <span className="flex-1 font-medium">{slot.label}</span>
                  <Download className="h-4 w-4 text-muted" />
                </a>
              ) : (
                <div
                  key={slot.type}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3.5 py-2.5 text-sm text-muted"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="flex-1">{slot.label}</span>
                  <span className="text-xs">Not uploaded</span>
                </div>
              ),
            )}
          </div>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Covers are stored privately with your book. KDP sizes the spine from your final page
        count — generate your full wrap to match your interior.
      </p>
    </div>
  );
}

function CoverSlot({
  projectId,
  type,
  label,
  blurb,
  info,
  onChange,
}: {
  projectId: string;
  type: CoverType;
  label: string;
  blurb: string;
  info?: CoverInfo;
  onChange: (info: CoverInfo | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [, startDelete] = useTransition();
  const isPdf = info?.contentType === "application/pdf";
  const isWide = type === "wrap";

  async function upload(file: File) {
    if (!COVER_MIME[file.type]) {
      toast.error("Unsupported file", "Use PNG, JPEG, WebP, or PDF.");
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      toast.error("File too large", "Covers must be 40MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("projectId", projectId);
      body.set("type", type);
      body.set("file", file);
      const res = await fetch("/api/covers/upload", { method: "POST", body });
      const data = (await res.json()) as { ok?: boolean; cover?: CoverInfo; error?: string };
      if (!res.ok || !data.ok || !data.cover) throw new Error(data.error || "Upload failed");
      onChange(data.cover);
      toast.success(`${label} uploaded`);
    } catch (e) {
      toast.error("Upload failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    startDelete(async () => {
      const res = await deleteCover(projectId, type);
      if (res.ok) {
        onChange(null);
        toast.success(`${label} removed`);
      } else {
        toast.error("Could not remove file");
      }
    });
  }

  const src = info ? `/api/covers/${projectId}/${type}?v=${info.updatedAt}` : null;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {/* Preview area */}
      <div
        onClick={() => !info && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={cn(
          "relative flex items-center justify-center border-b border-line bg-paper-sunken/50 p-3 transition-colors",
          isWide ? "aspect-[3/2]" : "aspect-[2/3]",
          drag && "bg-brass-soft/60 ring-2 ring-inset ring-brass/40",
          !info && "cursor-pointer hover:bg-paper-sunken",
        )}
      >
        {busy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper-sunken/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-brass" />
          </div>
        )}

        {src && !isPdf && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`${label} preview`} className="max-h-full max-w-full rounded-md object-contain shadow-soft" />
        )}

        {src && isPdf && (
          <a
            href={`/api/covers/${projectId}/${type}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 rounded-xl px-4 py-6 text-center text-ink-soft transition-colors hover:text-ink"
          >
            <FileText className="h-10 w-10 text-brass" />
            <span className="text-sm font-medium">PDF cover</span>
            <span className="max-w-[12rem] truncate text-xs text-muted">{info?.fileName}</span>
            <span className="text-xs underline">Open</span>
          </a>
        )}

        {!info && !busy && (
          <div className="flex flex-col items-center gap-2 text-center text-muted">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper-raised text-brass shadow-soft">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-ink-soft">Drop or click to upload</span>
            <span className="text-xs">PNG · JPEG · WebP · PDF</span>
          </div>
        )}
      </div>

      {/* Meta + actions */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold text-ink">{label}</h3>
          {info && (
            <Badge tone="sage" className="ml-auto">
              <Check className="h-3 w-3" /> Added
            </Badge>
          )}
        </div>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-soft">{blurb}</p>

        {info ? (
          <div className="mt-3">
            {info.size > 0 && (
              <p className="mb-2 truncate text-xs text-muted">
                {info.fileName || "file"} · {fmtSize(info.size)}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button variant="soft" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
                <Upload className="h-3.5 w-3.5" /> Replace
              </Button>
              <a href={`/api/covers/${projectId}/${type}?download=1`} className="ml-auto">
                <Button variant="ghost" size="iconSm" aria-label={`Download ${label}`}>
                  <Download className="h-4 w-4" />
                </Button>
              </a>
              <Button variant="ghost" size="iconSm" onClick={remove} aria-label={`Remove ${label}`}>
                <Trash2 className="h-4 w-4 text-clay" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />} Upload
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={COVER_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </div>
    </Card>
  );
}

function InteriorPreview({ projectId }: { projectId: string }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    previewHtml(projectId)
      .then((h) => active && (setHtml(h), setLoading(false)))
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId]);

  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-paper-sunken/40 shadow-soft">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper-sunken/40 text-muted backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      <div className="flex justify-center p-4 sm:p-6">
        <iframe
          title="Interior preview"
          srcDoc={html}
          className="h-[60vh] w-full max-w-[460px] rounded-lg border border-line bg-white shadow-raised"
        />
      </div>
      {!loading && !html && (
        <div className="absolute inset-0 flex items-center justify-center">
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="Nothing to preview yet"
            description="Write a chapter or two and your interior will appear here."
          />
        </div>
      )}
    </div>
  );
}
