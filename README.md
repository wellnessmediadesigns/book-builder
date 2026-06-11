<div align="center">

# Quire — The AI Writing Studio

**From a spark to a finished book.**

A premium, AI-native studio for writing real books — built to run on Cloudflare so you
can write from your PC or your phone. You hold the pen; Quire holds the outline, the
memory, the continuity, and the busywork.

</div>

---

## What it is

Quire combines the strengths of Scrivener, Atticus, Sudowrite, Notion, and Google Docs
into one calm, editorial workspace built around a single principle:

> **The user is the author. The AI is the assistant.** Every word the AI writes stays
> editable, lockable, and yours to accept or reject.

It takes you from an idea → a complete, editable **blueprint** → **chapter-by-chapter**
generation → front & back matter → a polished manuscript → **publishing-ready export**.

## Features

- **Project wizard** — idea, audience, tone, structure, goals.
- **AI Blueprint** — titles, positioning, reader promise, full chapter outline,
  characters/concepts, style/tone/continuity guides. Every field editable.
- **Per-chapter generation** — streams in live; each chapter is continuity-aware of the
  outline, Book Memory, and everything written before it. Never a whole book at once.
- **Manuscript editor** — distraction-free TipTap canvas, drag-reorder chapters, focus
  mode, autosave with live status. Fully responsive: side rails become slide-in drawers
  on the phone, and the selection toolbar docks to the bottom of the screen.
- **Highlight & Ask AI** — Rewrite, Improve, Expand, Humanize, Add emotion/dialogue/
  tension, Fix grammar… plus free-form **Ask AI**. Only the selection changes.
- **AI Revision Mode** — original vs. proposed with **Accept / Reject**. Nothing
  overwrites your words without consent.
- **Chapter Command Center** — generate, continue, improve, strengthen intro/conclusion,
  readability/continuity/repetition checks, custom requests.
- **Book Memory** — premise, voice, characters, facts, threads — read by every AI call.
- **Front & back matter generators** — copyright page, dedication, epigraph, foreword,
  preface, introduction, disclaimer, conclusion, about the author, acknowledgments,
  reader & book-club questions, CTA, and more — each generated for *your* book.
- **Marketing studio** — back-cover copy, Amazon description, subtitle ideas, categories,
  keywords. Kept out of the manuscript exports.
- **Locked content** — lock sentences or chapters; AI refuses to touch them.
- **Version history with visual diff** — snapshot, compare word-by-word, restore.
- **Notes & bookmarks** — chapter notes with resolve/reopen; bookmark passages and jump
  back to them.
- **Real exports** — **DOCX** (6×9 trim, styled, page breaks), **EPUB 3** (Kindle/Apple
  Books-ready), **Markdown**, **HTML** print view (→ Save as PDF). Drafted front/back
  matter is included automatically.
- **Bring-your-own AI** — OpenAI, OpenRouter, or any OpenAI-compatible endpoint.
- **Password gate** — set one secret and the whole studio sits behind a login screen.
- **Installable PWA** — add it to your phone's home screen.

## Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC + server actions) + TypeScript |
| Runtime | **Cloudflare Workers** via `@opennextjs/cloudflare` |
| Database | **Cloudflare D1** via Prisma (WASM engine on workerd); plain SQLite fallback for local Node dev |
| Editor | TipTap / ProseMirror with a custom Lock mark |
| Exports | Hand-rolled OOXML (DOCX) + EPUB 3, zipped with `fflate` — pure JS, Workers-safe |
| AI | Modular OpenAI-compatible provider layer, server-side proxy with streaming |
| Auth | Stateless HMAC session cookie gated by the `APP_PASSWORD` secret (edge middleware) |

## Deploy to Cloudflare

```bash
# 0. One-time: log wrangler into your Cloudflare account
npx wrangler login

# 1. Create the database
npx wrangler d1 create quire-db
#    → copy the printed database_id into wrangler.jsonc ("database_id": "…")

# 2. Create the schema
npm run db:migrate:remote

# 3. Protect your studio (you'll be prompted for the password)
npx wrangler secret put APP_PASSWORD

# 4. Ship it
npm install
npm run deploy
```

Open the printed `*.workers.dev` URL (or attach a custom domain in the Cloudflare
dashboard), log in with your password, open **Settings**, and paste your AI key.
On your phone, use "Add to Home Screen" to install it like an app.

> The deployed worker is ~2.3 MB gzipped — within Cloudflare's free plan limit.
> Note: a *local* Ollama isn't reachable from Cloudflare; use OpenAI/OpenRouter, or
> point the provider URL at a tunnel (e.g. `cloudflared tunnel`) to your machine.

## Local development

```bash
npm install
npm run db:migrate:local    # create the local D1 schema
npm run dev                 # http://localhost:3000 — uses local D1 via the OpenNext dev bridge
```

To preview the real Worker locally: `npm run preview`.

If wrangler/workerd isn't available, the app transparently falls back to a plain SQLite
file (`npm run db:push` once, then `npm run dev`). Schema changes: edit
`prisma/schema.prisma`, then regenerate the migration SQL with
`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
(for a fresh DB) or author an incremental SQL file in `migrations/`.

## Project structure

```
src/
  app/
    page.tsx                     landing
    login/                       password gate
    studio/                      dashboard, new, settings, style guide
    studio/book/[id]/            blueprint · write · memory · matter · export
    api/ai/generate              streaming chapter generation
    api/export/[format]          docx | epub | markdown | html
  components/  brand/ ui/ studio/ book/ editor/
  lib/
    ai/        providers · prompts · context (continuity)
    actions/   projects · chapters · memory · matter · notes · settings · ai
    export/    convert · manuscript · docx · epub
    auth.ts    HMAC session · middleware.ts edge gate
    matter.ts  canonical front/back/marketing sections
    diff.ts    paragraph+word diff for version compare
prisma/schema.prisma             data model (D1 / SQLite)
migrations/                      D1 SQL migrations
wrangler.jsonc                   Worker + D1 config
```

## Remaining niceties (not blockers)

- True server-side PDF rendering (today: the HTML print view → browser "Save as PDF",
  which produces a correct 6×9 layout).
- Multi-user accounts (today: one author profile behind the password gate — right for a
  personal studio).

## The Quire principle

> The AI is the assistant. You are the author. Every sentence stays yours — editable,
> lockable, unmistakably human.
