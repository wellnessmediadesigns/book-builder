"use client";

import { useEffect, useState } from "react";
import { Mail, Copy, Download, FileText, Loader2, ExternalLink, Check } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Issue = { id: string; title: string; wordCount: number; order: number };

export function NewsletterExport({
  projectId,
  brand,
  issues,
}: {
  projectId: string;
  brand: string;
  issues: Issue[];
}) {
  const written = issues.filter((i) => i.wordCount > 0);
  const [issueId, setIssueId] = useState(written[0]?.id ?? issues[0]?.id ?? "");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const emailUrl = (fmt: string) => `/api/export/${fmt}?project=${projectId}&chapter=${issueId}`;

  useEffect(() => {
    if (!issueId) return;
    let active = true;
    setLoading(true);
    fetch(emailUrl("email"))
      .then((r) => r.text())
      .then((h) => active && (setHtml(h), setLoading(false)))
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId, projectId]);

  async function copyFormatted() {
    try {
      const [htmlRes, textRes] = await Promise.all([fetch(emailUrl("email")), fetch(emailUrl("text"))]);
      const [h, t] = await Promise.all([htmlRes.text(), textRes.text()]);
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([h], { type: "text/html" }),
            "text/plain": new Blob([t], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(t);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied — paste into your email", "Formatting comes along.");
    } catch {
      toast.error("Couldn't copy", "Try the Download HTML button instead.");
    }
  }

  async function copyText(fmt: "text" | "markdown") {
    try {
      const r = await fetch(emailUrl(fmt));
      await navigator.clipboard.writeText(await r.text());
      toast.success(`Copied ${fmt === "text" ? "plain text" : "Markdown"}`);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  function downloadHtml() {
    fetch(emailUrl("email"))
      .then((r) => r.text())
      .then((h) => {
        const url = URL.createObjectURL(new Blob([h], { type: "text/html" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "newsletter.html";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
  }

  if (issues.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title="No issues yet"
          description="Add an issue and write it, then come back to copy it into your email."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Badge tone="brass">
        <Mail className="h-3 w-3" /> Send this issue
      </Badge>
      <h1 className="mt-3 font-display text-display-md font-semibold text-ink">Ready to send</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Pick an issue, hit <span className="font-medium text-ink">Copy newsletter</span>, and paste it
        straight into Gmail or Outlook — the formatting comes with it.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Issue</p>
            <select
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-paper-raised px-3 text-sm text-ink outline-none focus:border-muse/40"
            >
              {issues.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title} {i.wordCount === 0 ? "(empty)" : ""}
                </option>
              ))}
            </select>
          </div>

          <Button variant="brass" className="w-full" onClick={copyFormatted}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy newsletter (formatted)
          </Button>

          <div className="grid gap-2">
            <Button variant="outline" size="sm" onClick={downloadHtml}>
              <Download className="h-4 w-4" /> Download HTML
            </Button>
            <Button variant="ghost" size="sm" onClick={() => copyText("markdown")}>
              <FileText className="h-4 w-4" /> Copy Markdown
            </Button>
            <Button variant="ghost" size="sm" onClick={() => copyText("text")}>
              <FileText className="h-4 w-4" /> Copy plain text
            </Button>
            <a href={emailUrl("email")} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4" /> Open preview
              </Button>
            </a>
          </div>

          <p className="px-1 text-[0.6875rem] leading-snug text-muted">
            Pasting into Gmail/Outlook keeps headings, bold, lists, and links. Use Download HTML for
            an ESP that imports an HTML file.
          </p>
        </div>

        {/* Live preview */}
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Preview · {brand}</p>
          <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-paper-sunken/40 shadow-soft")}>
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper-sunken/40 text-muted backdrop-blur-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            <div className="flex justify-center p-4 sm:p-6">
              <iframe
                title="Newsletter preview"
                srcDoc={html}
                className="h-[64vh] w-full max-w-[620px] rounded-lg border border-line bg-white shadow-raised"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
