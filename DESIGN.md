# Quire — Design Language

A living reference for the **Ink & Ivory** design system. The interactive version lives at
`/studio/style`.

## Brand

- **Name:** Quire — a *quire* is the binding unit of a book (a folded set of leaves).
  Short, ownable, literary, premium.
- **Tagline:** *From a spark to a finished book.*
- **Voice:** calm, literate, encouraging. Quire speaks like a thoughtful editor, never a
  chatbot.
- **Logo:** a folded quire — two curved leaves that read as a "Q", the inner stroke
  tapering like a quill nib. Lives as an SVG in `src/components/brand/logo.tsx`
  (`QuireMark`, `QuireLogo`), inheriting `currentColor`.

## Principle

> The user is the author. The AI is the assistant. Every AI surface is marked in **muse
> violet** so the author can always tell their words from a suggestion.

## Color — Ink & Ivory

Warm paper, deep ink, one jewel accent for AI. Tokens are HSL CSS variables in
`globals.css`, mapped to Tailwind in `tailwind.config.ts`. Full dark mode ("Midnight
Study") redefines the same tokens.

| Token | Light | Role |
|---|---|---|
| `paper` | `#FBF9F4` | app background (warm ivory) |
| `paper-raised` | `#FFFFFF` | cards, canvas |
| `ink` | `#1B1E2B` | primary text |
| `ink-soft` | `#4A4E5E` | secondary text |
| `muted` | `#8A8E9C` | labels |
| `line` | `#ECE7DD` | hairline borders |
| `brass` | `#B5894F` | **brand accent** |
| `muse` | `#6B5CC4` | **AI accent** — all AI surfaces/actions |
| `sage` | `#5E8B72` | accept / success |
| `clay` | `#C0584B` | reject / danger |

## Typography

| Use | Typeface | Notes |
|---|---|---|
| Display / headings | **Fraunces** | literary serif, optical sizing |
| Reading canvas | **Newsreader** | true book serif — drafts feel like a book |
| Interface | **Inter** | neutral UI chrome |
| Mono | **JetBrains Mono** | counts, diffs, version history |

Loaded via `next/font` (self-hosted, no layout shift) in `src/lib/fonts.ts`.

## Motion

Framer Motion, restrained: 150–250ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`. Entrances
fade-up; popovers scale-in. Motion serves clarity, never spectacle.

## Layout principles

- The **writing canvas is the hero**; chrome recedes (collapsible rails, focus mode).
- Generous whitespace, hairline borders, rounded-`2xl` cards, soft layered shadows.
- A constrained reading measure (~38rem) and loose leading for comfortable prose.
- Surfaces feel like paper (subtle grain on hero surfaces via `.grain`).

## Components

Primitives live in `src/components/ui` — `Button` (primary/brass/muse/outline/soft/ghost),
`Badge`, `Card`, `Input`/`Textarea`/`Select`, `Spinner`, `EmptyState`, `Toaster`,
`ThemeToggle`. Editor surfaces (floating toolbar, revision card, command center) always
carry the muse accent to signal AI.
