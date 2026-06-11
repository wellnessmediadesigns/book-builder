<div align="center">

# Quire — The AI Writing Studio

**From a spark to a finished book.**

A premium, AI-native studio for writing real books. You hold the pen — Quire holds the
outline, the memory, the continuity, and the busywork, so every sentence stays
unmistakably yours.

</div>

---

## What it is

Quire combines the strengths of Scrivener, Atticus, Sudowrite, Notion, and Google Docs
into one calm, editorial workspace built around a single principle:

> **The user is the author. The AI is the assistant.** Every word the AI writes stays
> editable, lockable, and yours to accept or reject.

It takes you from an idea → a complete, editable **blueprint** → **chapter-by-chapter**
generation → a polished manuscript → **publishing-ready export**.

## Core features

- **Project wizard** — capture your idea, audience, tone, structure, and goals.
- **AI Blueprint** — titles, positioning, reader promise, a full chapter outline,
  characters/concepts, and style/tone/continuity guides. Every field editable.
- **Per-chapter generation** — each chapter generates on its own, continuity-aware of the
  outline, Book Memory, and everything written before it. Never a whole book at once.
- **Manuscript editor** — a distraction-free TipTap canvas. Edit anywhere, format, reorder
  chapters by drag, focus mode, live word count, autosave with status.
- **Highlight & Ask AI** — select any text for a floating toolbar (Rewrite, Improve,
  Expand, Humanize, Add emotion/dialogue/tension, Fix grammar… + free-form **Ask AI**).
  Only the selection changes.
- **AI Revision Mode** — every AI edit shows original vs. proposed with **Accept / Reject**.
  Nothing overwrites your words without consent.
- **Chapter Command Center** — generate, continue, improve, strengthen intro/conclusion,
  and check readability/continuity/repetition.
- **Book Memory** — a living memory of premise, voice, characters, facts, and threads that
  every AI call reads from to stay consistent.
- **Locked content** — lock sentences or whole chapters; AI refuses to touch them.
- **Version history** — snapshot, restore, and recover. Like Git for writers.
- **Export** — Markdown & HTML (print-ready 6×9) today; DOCX/EPUB/PDF wired into the same
  pipeline.
- **Bring-your-own AI** — OpenAI, OpenRouter, or local Ollama. Your key, your models.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC + server actions) + TypeScript |
| UI | Tailwind CSS, custom design system, Framer Motion, lucide-react |
| Editor | TipTap / ProseMirror with custom Lock mark |
| Data | Prisma ORM → SQLite (dev), Postgres-ready |
| AI | Modular provider layer (OpenAI-compatible), server-side proxy with SSE streaming |

## Getting started

```bash
npm install
npm run db:push      # create the SQLite schema (dev.db)
npm run db:seed      # optional: a sample "The Quiet Tide" project
npm run dev          # http://localhost:3000
```

Then open **Settings**, choose a provider, and paste your API key (or point at a local
Ollama). Without a key the app runs fully — AI actions show a clear "add your key" state.

### Production database

Swap SQLite for Postgres by changing the `datasource` provider in
`prisma/schema.prisma` to `postgresql` and pointing `DATABASE_URL` at your database.
No application code changes required.

## Project structure

```
src/
  app/
    page.tsx                     landing
    studio/                      dashboard, new, settings, style
    studio/book/[id]/            blueprint · write · memory · export
    api/ai/generate              streaming chapter generation
    api/export/[format]          manuscript export
  components/
    brand/  ui/  studio/  book/  editor/
  lib/
    ai/        providers · prompts · context (continuity)
    actions/   projects · chapters · memory · settings · ai
    export/    TipTap → Markdown/HTML
prisma/schema.prisma             full data model
```

## Honest scope (this build)

A working **vertical slice** — the full authoring path is real end-to-end; a few modules
are scaffolded to grow without rework:

- ✅ Branding/design system, dashboard, wizard, blueprint, editor, highlight-AI,
  revisions, command center, Book Memory, locking, version history, Markdown/HTML export,
  multi-provider AI, autosave.
- 🚧 DOCX/EPUB/PDF export adapters (Markdown/HTML real now; PDF via browser print of HTML).
- 🚧 Single local author profile (auth boundary is stubbed, NextAuth-ready).
- 🚧 Front/back-matter generators and side-by-side version diff UI (data modeled).

## The Quire principle

> The AI is the assistant. You are the author. Every sentence stays yours — editable,
> lockable, unmistakably human.
