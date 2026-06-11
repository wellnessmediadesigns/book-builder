"use client";

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
  Sparkles,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

const FORMATS = [
  { key: "docx", label: "Word", ext: ".docx", icon: FileText, real: true, desc: "Microsoft Word manuscript — 6×9 trim, styled headings, page breaks, front & back matter." },
  { key: "epub", label: "EPUB", ext: ".epub", icon: BookOpen, real: true, desc: "Reflowable EPUB 3 for Kindle & Apple Books, with navigation and semantic sections." },
  { key: "markdown", label: "Markdown", ext: ".md", icon: Code2, real: true, desc: "Clean Markdown with title page, contents, chapters, and matter sections." },
  { key: "html", label: "HTML", ext: ".html", icon: Globe, real: true, desc: "Styled, print-ready 6×9 layout with proper page breaks." },
  { key: "pdf", label: "PDF", ext: ".pdf", icon: FileType, real: false, desc: "Open the print view and use your browser's Save as PDF — pixel-perfect 6×9." },
];

export function ExportView({
  projectId,
  title,
  chapterCount,
  wordCount,
  writtenCount,
}: {
  projectId: string;
  title: string;
  chapterCount: number;
  wordCount: number;
  writtenCount: number;
}) {
  function download(format: string) {
    window.location.href = `/api/export/${format}?project=${projectId}`;
  }
  function printPdf() {
    window.open(`/api/export/html?project=${projectId}`, "_blank");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Badge tone="brass">
        <Download className="h-3 w-3" /> Export
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">
        Publishing-ready manuscript
      </h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Export <span className="font-medium text-ink">{title}</span> with a proper title
        page, table of contents, and clean chapter formatting — little to no cleanup needed.
      </p>

      {/* stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Chapters" value={`${writtenCount}/${chapterCount}`} hint="written" />
        <Stat label="Words" value={formatNumber(wordCount)} hint="total" />
        <Stat
          label="Readiness"
          value={`${chapterCount ? Math.round((writtenCount / chapterCount) * 100) : 0}%`}
          hint="drafted"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {FORMATS.map((f, i) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-sunken text-brass">
                  <f.icon className="h-5 w-5" />
                </div>
                {f.real ? (
                  <Badge tone="sage">
                    <Check className="h-3 w-3" /> Ready
                  </Badge>
                ) : f.key === "pdf" ? (
                  <Badge tone="muse">via print</Badge>
                ) : (
                  <Badge tone="neutral">Soon</Badge>
                )}
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-ink">
                {f.label} <span className="font-mono text-xs text-muted">{f.ext}</span>
              </h3>
              <p className="mt-1 flex-1 text-sm text-ink-soft">{f.desc}</p>
              <div className="mt-4">
                {f.real ? (
                  <Button variant="primary" size="sm" onClick={() => download(f.key)}>
                    <Download className="h-4 w-4" /> Download {f.label}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={printPdf}>
                    <Printer className="h-4 w-4" /> Open print view
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Exports include your drafted front &amp; back matter sections automatically.
        Marketing copy stays out of the manuscript.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper-raised p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
