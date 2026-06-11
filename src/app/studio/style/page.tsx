import { TopNav } from "@/components/studio/top-nav";
import { QuireLogo, QuireMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";

const SWATCHES = [
  { name: "Paper", var: "--paper", note: "App background" },
  { name: "Ink", var: "--ink", note: "Primary text" },
  { name: "Ink soft", var: "--ink-soft", note: "Secondary text" },
  { name: "Brass", var: "--brass", note: "Brand accent" },
  { name: "Muse", var: "--muse", note: "AI accent" },
  { name: "Sage", var: "--sage", note: "Accept / success" },
  { name: "Clay", var: "--clay", note: "Reject / danger" },
  { name: "Line", var: "--line", note: "Hairline borders" },
];

export default function StylePage() {
  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Badge tone="brass">Design language</Badge>
        <h1 className="mt-3 font-display text-display-lg font-semibold text-ink">
          The Quire system
        </h1>
        <p className="mt-3 max-w-xl text-lg text-ink-soft">
          Ink &amp; Ivory — an editorial design language. Warm paper, deep ink, one jewel
          accent for AI. Calm, literate, and built so the writing canvas is always the hero.
        </p>

        {/* Logo */}
        <Section title="Identity">
          <div className="flex flex-wrap items-center gap-8">
            <QuireLogo size="lg" />
            <QuireMark className="h-10 w-10 text-brass" />
            <QuireMark className="h-10 w-10 text-muse" />
            <div className="rounded-2xl bg-ink p-4">
              <QuireLogo size="lg" className="[&_span]:text-paper" />
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            The mark is a folded quire — two leaves reading as a “Q”, the inner stroke
            tapering like a quill nib.
          </p>
        </Section>

        {/* Color */}
        <Section title="Color — Ink & Ivory">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SWATCHES.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-xl border border-line">
                <div className="h-20" style={{ background: `hsl(var(${c.var}))` }} />
                <div className="bg-paper-raised p-2.5">
                  <p className="text-sm font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-muted">{c.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Type */}
        <Section title="Typography">
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Display — Fraunces</p>
              <p className="font-display text-display-md font-semibold text-ink">
                From a spark to a finished book
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Reading — Newsreader</p>
              <p className="max-w-prose font-serif text-lg leading-relaxed text-ink">
                The harbor had a way of keeping secrets. Mara watched the water fold over
                itself in the half-light, each wave a sentence the sea refused to finish.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Interface — Inter</p>
              <p className="text-base text-ink-soft">
                The interface recedes so the words can lead. Clean, neutral, quiet.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Mono — JetBrains Mono</p>
              <p className="font-mono text-sm text-ink-soft">12,480 words · 3 min read</p>
            </div>
          </div>
        </Section>

        {/* Components */}
        <Section title="Components">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="brass">Brass</Button>
            <Button variant="muse">Muse · AI</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="neutral">Draft</Badge>
            <Badge tone="brass">Writing</Badge>
            <Badge tone="muse">AI</Badge>
            <Badge tone="sage">Complete</Badge>
            <Badge tone="clay">Rejected</Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <p className="font-display font-semibold text-ink">Elegant card</p>
              <p className="mt-1 text-sm text-ink-soft">
                Hairline border, soft shadow, generous radius.
              </p>
            </Card>
            <div className="rounded-2xl border border-muse/25 bg-muse-soft/50 p-4 shadow-glow">
              <p className="font-display font-semibold text-muse-deep">AI surface</p>
              <p className="mt-1 text-sm text-ink-soft">
                Every AI moment is marked in muse violet.
              </p>
            </div>
          </div>
        </Section>

        <p className="mt-12 text-center text-xs text-muted">
          Quire — premium, calm, and unmistakably yours.
        </p>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-5 border-b border-line pb-2 font-display text-xl font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}
