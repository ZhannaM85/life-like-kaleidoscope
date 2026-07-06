# Life Like Kaleidoscope

*One word a day. One small memory. A lifetime of them.*

**Live app:** https://zhannam85.github.io/life-like-kaleidoscope/

Life Like Kaleidoscope (**LLK**) is a calm, local-first daily memory journal.
Traditional journals answer *"what happened today?"* — this app answers
*"who am I, across a whole life?"* Every day you get one carefully chosen
single-word prompt (*Bicycle*, *Rain*, *Grandmother*, *Kitchen*) and write one
small memory it brings back. Over years, those fragments accumulate into a
searchable, connected record of a life — many small pieces forming a picture,
which is the only sense in which it is a kaleidoscope. The UI itself stays
quiet: warm paper tones, serif type, no bright colors.

## What it deliberately is not

These are permanent product stances, not v1 limitations:

- **No AI-generated content.** The app never writes, rewrites, or summarizes
  your memories.
- **No social features.** No likes, comments, followers, or feeds.
- **No gamification.** No streaks, badges, or guilt — missing a day costs
  nothing.
- **Privacy-first.** Everything lives in your browser's IndexedDB. No backend,
  no accounts, no analytics, no telemetry.

## How it works

- A deterministic daily prompt picked from a curated word pool, with a
  no-repeat window so words don't recur too soon.
- Memories are written against the prompt; dates are always optional —
  *"I was maybe 8, sometime in the 90s"* is a first-class answer.
- Every edit creates a new immutable version; history is never overwritten.
- People, places, and tags are first-class entities, forming the graph that
  connects memories to each other.
- Because all data is local, export/backup (JSON, Markdown) is a core feature,
  not an afterthought.

## Status

Early development. The daily-prompt flow (prompt → write → save → appears in
Memories) works end to end; memory editing, search, timeline, the memory
graph, and export are in progress. See
[docs/issues-priority.md](docs/issues-priority.md) for the current roadmap and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the codebase is put
together.

## Tech

React 19 + TypeScript (strict) + Vite, React Router, Zustand for UI state,
React Hook Form + Zod, Tailwind CSS, and IndexedDB via Dexie — accessed only
through repository interfaces defined in the domain layer, so a future backend
is one new repository implementation away. Deployed to GitHub Pages by a
workflow on every push to `master`.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # vitest run
npm run build      # type-check + production build
npm run lint       # oxlint
```

The original product brief that bootstrapped the project lives in
[PROJECT_BRIEF.md](PROJECT_BRIEF.md).
