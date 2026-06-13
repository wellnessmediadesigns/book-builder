"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileType,
  BookOpen,
  Code2,
  Globe,
  Download,
  Printer,
  Check,
  Palette,
  Loader2,
  Maximize2,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { previewHtml, setBookTheme } from "@/lib/actions/export";

type Format = {
  key: string;
  label: string;
  ext: string;
  icon: typeof FileText;
  real: boolean;
  badge?: string;
  desc: string;
};

const FORMATS: Format[] = [
  { key: "pdf", label: "PDF", ext: ".pdf", icon: FileType, real: true, badge: "See the pages", desc: "Real paginated 6×9 book — title page, each chapter on its own page. Opens page-by-page on any device (incl. your phone). Print/KDP-ready." },
  { key: "docx", label: "Word", ext: ".docx", icon: FileText, real: true, desc: "Editable Word manuscript — 6×9 trim, styled headings, page breaks, matter." },
  { key: "epub", label: "EPUB", ext: ".epub", icon: BookOpen, real: true, desc: "Reflowable ebook for Kindle & Apple Books, with navigation." },
  { key: "markdown", label: "Markdown", ext: ".md", icon: Code2, real: true, desc: "Clean Markdown with title page, contents, and matter." },
  { key: "html", label: "HTML", ext: ".html", icon: Globe, real: true, desc: "Styled web page in your chosen theme (view in browser / print)." },
];

type ThemeMeta = { id: string; name: string; description: string };

export function ExportView({
  projectId,
  title,
  chapterCount,
  wordCount,
  writtenCount,
  themes,
  currentTheme,
}: {
  projectId: string;
  title: string;
  chapterCount: number;
  wordCount: number;
  writtenCount: number;
  themes: ThemeMeta[];
  currentTheme: string;
}) {
  const [theme, setTheme] = useState(currentTheme);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [, startSave] = useTransition();

  useEffect(() => {
    let active = true;
    setLoading(true);
    previewHtml(projectId, theme)
      .then((h) => {
        if (active) {
          setHtml(h);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId, theme]);

  function pickTheme(id: string) {
    if (id === theme) return;
    setTheme(id);
    startSave(async () => {
      await setBookTheme(projectId, id);
    });
  }

  function download(format: string) {
    // Open in a new view (not a same-window navigation) so the app/PWA stays put
    // and the PDF/file viewer has its own Done/Back affordance.
    window.open(`/api/export/${format}?project=${projectId}`, "_blank");
  }
  function openPrint() {
    window.open(`/api/export/html?project=${projectId}&theme=${theme}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Badge tone="brass">
        <Palette className="h-3 w-3" /> Format &amp; export
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
        Design your book, then export
      </h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Pick a formatting style and see exactly how <span className="font-medium text-ink">{title}</span> will
        look — live, no exporting needed. Your choice applies to the HTML and PDF.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Theme picker */}
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Formatting style
          </p>
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTheme(t.id)}
              className={cn(
                "w-full rounded-xl border p-3.5 text-left transition-all",
                theme === t.id
                  ? "border-brass/50 bg-brass-soft shadow-soft"
                  : "border-line bg-paper-raised hover:border-brass/30",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-ink">{t.name}</span>
                {theme === t.id && (
                  <Check className="ml-auto h-4 w-4 text-brass-deep" />
                )}
                {t.id === "classic" && theme !== t.id && (
                  <Badge tone="neutral" className="ml-auto text-[0.625rem]">
                    Most common
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.description}</p>
            </button>
          ))}

          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <Stat label="Chapters" value={`${writtenCount}/${chapterCount}`} />
            <Stat label="Words" value={formatNumber(wordCount)} />
            <Stat label="Pages ≈" value={`${formatNumber(Math.max(1, Math.ceil(wordCount / 275)))}`} />
          </div>
          <p className="px-1 pt-1 text-[0.6875rem] leading-snug text-muted">
            Rough 6×9 print estimate (~275 words/page). Amazon KDP sets the final page
            count from your interior file; ebooks reflow and have no fixed pages.
          </p>
        </div>

        {/* Live preview */}
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Live preview
            </p>
            <button
              onClick={openPrint}
              className="inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-ink"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Open full view
            </button>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-sunken/40 shadow-soft">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper-sunken/40 text-muted backdrop-blur-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            <div className="flex justify-center p-4 sm:p-6">
              <iframe
                title="Book preview"
                srcDoc={html}
                className="h-[64vh] w-full max-w-[460px] rounded-lg border border-line bg-white shadow-raised"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Downloads */}
      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Download</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FORMATS.map((f, i) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-sunken text-brass">
                  <f.icon className="h-5 w-5" />
                </div>
                {f.badge ? (
                  <Badge tone="brass">{f.badge}</Badge>
                ) : (
                  <Badge tone="sage">
                    <Check className="h-3 w-3" /> Ready
                  </Badge>
                )}
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-ink">
                {f.label} <span className="font-mono text-xs text-muted">{f.ext}</span>
              </h3>
              <p className="mt-1 flex-1 text-sm text-ink-soft">{f.desc}</p>
              <div className="mt-4">
                {f.key === "html" ? (
                  <Button variant="outline" size="sm" onClick={openPrint}>
                    <Printer className="h-4 w-4" /> View in browser
                  </Button>
                ) : (
                  <Button variant={f.key === "pdf" ? "brass" : "primary"} size="sm" onClick={() => download(f.key)}>
                    <Download className="h-4 w-4" /> Download {f.label}
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        <strong className="text-ink-soft">PDF is fully paginated</strong> — open it on your
        phone to flip through the actual pages. Word &amp; EPUB are paginated too, but phone{" "}
        <em>preview</em> apps show them as one continuous scroll (they page correctly in
        Word/Google Docs or an ereader). Drafted front/back matter is included automatically.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-raised p-2.5">
      <p className="font-display text-lg font-semibold text-ink">{value}</p>
      <p className="text-[0.6875rem] text-muted">{label}</p>
    </div>
  );
}
