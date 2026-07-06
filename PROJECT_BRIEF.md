# Life Like Kaleidoscope — Project Brief & Bootstrap Instructions for Claude Code

## How to use this document

Paste this entire file as your first message to Claude Code in an empty working
directory, or save it as `PROJECT_BRIEF.md` in a fresh folder and tell Claude
Code: "Read PROJECT_BRIEF.md and follow it." Claude Code should treat this as
its operating brief for the whole project, not just the first session.

## Configuration (edit before running)

- `REPO_NAME`: `life-like-kaleidoscope`
- `VISIBILITY`: `public` (recommended default for an early-stage product —
  change to `public` if you want it open source from day one)
- `GITHUB_OWNER`: *(leave blank to create under your authenticated `gh` account)*

---

## 0. Role & operating mode

You are acting as a Staff Software Engineer and Product Architect building a
real, maintainable, commercial-grade application — not a prototype or demo.

Work in two phases, and do not skip or compress them:

- **Phase 1 — Architecture & scaffolding.** Set up the repository, tooling,
  folder structure, domain model, persistence layer, design system shell, and
  routing skeleton. Nothing feature-specific yet. Stop after this phase and
  present a short summary before continuing — even though the human has
  approved moving into implementation, the architecture itself should still
  get a quick sanity check before features get built on top of it.
- **Phase 2 — Implementation.** Build features incrementally, one GitHub
  issue at a time. Each issue should be its own coherent, reviewable unit of
  work — prefer several small commits over one giant one.

Never generate the entire application in a single pass. After each epic
(see §10), pause, summarize what was built, confirm `npm run dev` and
`npm test` both still pass, and only then continue.

---

## 1. Product vision

**Life Like Kaleidoscope** is not a journaling app in the productivity-app sense.
Traditional journals answer "what happened today?" This app answers
"who am I, across a whole life?" Every day, the user gets one carefully
chosen single-word prompt (e.g. *Bicycle*, *Rain*, *Grandmother*, *Kitchen*)
and writes one small memory inspired by it. Over years, those memories become
a searchable, connected record of a life.

**Primary audience and positioning:** people who enjoy writing, want to
preserve family stories, and value privacy and self-reflection. This is the
MVP's design center.

**Secondary, non-primary value (do not design or market around these yet):**
the same archive may later be meaningful for families managing a loved one's
memory loss, and for passing memories on after death. The architecture should
not block these futures, but the MVP UI, copy, and feature set should not be
built around them. (See competitive note below — StoryWorth and Remento
already occupy the "preserve mom's memories before it's too late" framing
heavily; this product's differentiation is the daily single-word cue, the
connected memory graph, the annual-reflection callback mechanic, and being a
living decades-long archive rather than a one-year project that ends in a
printed book.)

The experience should feel **calm, elegant, distraction-free, and timeless** —
"beautiful notebook," not "productivity app."

---

## 2. Hard constraints — do not violate these

- **No AI-generated memory content, no AI summaries, no AI rewriting** of
  what the user wrote. This is a deliberate, permanent product stance, not a
  v1 limitation.
- **No social features**: no likes, comments, followers, feeds, sharing to
  other users.
- **No gamification**: no streaks, badges, points, leaderboards, or writing
  quotas. Missing a day should produce zero friction or guilt in the UI.
- **Privacy-first by default**: local persistence, no analytics SDKs, no
  third-party trackers, no telemetry beyond basic error logging the user can
  disable.
- **Calm visual language**: no bright/saturated colors, no decorative
  animation. "Kaleidoscope" is a *narrative* metaphor (many small fragments
  forming a picture of a life) — do **not** render literal kaleidoscope
  colors, mirrored patterns, or busy visuals anywhere in the UI. Visually,
  this should feel closer to a quiet paper notebook than to anything colorful
  or playful.
- **Dates are optional everywhere a memory's occurrence date is concerned** —
  many memories are approximate ("I was maybe 8 years old, sometime in the
  90s"). Never force a precise date.
- **Edits preserve history.** Every save of an existing memory creates a new
  immutable version; past versions are never overwritten or deleted by a
  normal edit.

---

## 3. Tech stack

**Frontend**
- React 19, TypeScript (`strict: true`)
- Vite
- React Router
- Zustand
- React Hook Form + Zod (validation)
- Tailwind CSS
- shadcn/ui
- Framer Motion — used sparingly, for subtle fade/slide transitions only,
  never decoratively

**Testing**
- Vitest + React Testing Library for domain logic and component tests

**Persistence (MVP)**
- IndexedDB via Dexie.js, accessed only through repository interfaces
  defined in the domain layer (see §4–5). No feature or UI code should ever
  import Dexie directly.

**Future backend (do not build now, but do not architect against it either)**
- NestJS, PostgreSQL, Prisma. The repository-interface pattern below exists
  specifically so a future `ApiMemoryRepository` can replace
  `IndexedDbMemoryRepository` without touching domain or feature code.

---

## 4. Domain model

Build these entities now, in full, even though a couple of fields are inert
in the MVP UI. Retrofitting them later is expensive; including them now is
nearly free.

```ts
interface Prompt {
  id: string;
  word: string;
  createdAt: string;
}

interface Memory {
  id: string;
  promptId: string;
  title?: string;
  story: string;
  approxAge?: number;
  approxYear?: number;
  peopleIds: string[];
  placeIds: string[];
  tagIds: string[];
  photoIds: string[];
  authoredBy: string;   // defaults to the single MVP user's id; not exposed
                          // in any UI yet — exists so a future "someone else
                          // writes on your behalf" caregiver mode is purely
                          // additive, not a data-model rewrite.
  aboutWhom: string;     // defaults to the same user as authoredBy, same
                          // reasoning as above.
  createdAt: string;
  updatedAt: string;
  currentVersionId: string;
}

interface MemoryVersion {
  id: string;
  memoryId: string;
  snapshot: Omit<Memory, 'currentVersionId'>;
  editedAt: string;
}

interface Person { id: string; name: string; notes?: string; }
interface Place  { id: string; name: string; notes?: string; }
interface Tag    { id: string; label: string; }

interface Photo {
  id: string;
  memoryId: string;
  blobRef: string;       // reference into IndexedDB blob storage
  caption?: string;
}

interface UserProfile {
  id: string;
  displayName: string;
  legacyContact?: { name: string; contactInfo: string }; // UNUSED in MVP.
  // Reserved field only — do not build any access-transfer, verification,
  // or sharing logic around this in Phase 1 or Phase 2. Its only job right
  // now is to exist in the schema so a future succession/inheritance
  // feature doesn't require a migration.
}
```

`Person`, `Place`, and `Tag` are the nodes a future memory-graph feature will
connect — keep them as first-class entities with stable ids from day one,
even though the MVP graph view (Epic 8) will be simple.

---

## 5. Folder structure (feature-based, Clean Architecture layering)

```
src/
  app/                  # routing, app shell, providers
  domain/               # pure TS — entities, value objects, domain logic,
                         # repository INTERFACES. Zero React, Zustand, or
                         # Dexie imports. Must be unit-testable with no DOM.
    memory/
    prompt/
    person/
    place/
    tag/
  infrastructure/
    persistence/
      indexeddb/        # Dexie schema + repository IMPLEMENTATIONS of the
                         # domain interfaces. Nothing outside this folder
                         # should import Dexie.
  features/
    daily-prompt/
    memory-entry/
    photos/
    version-history/
    annual-reflection/
    search/
    memory-graph/
    timeline/
    random-memory/
    export/
  shared/
    ui/                  # design-system primitives (shadcn-based)
    hooks/
    lib/
  stores/                 # Zustand stores, one slice per feature, composed
test/
```

Rule of thumb: if a file under `domain/` ever needs to import from `react`,
`zustand`, or `dexie`, that's a sign the logic belongs in `infrastructure/`
or `features/` instead.

---

## 6. Routing

| Path | Screen |
|---|---|
| `/` | Today's prompt + quick entry |
| `/memories` | All memories — list/timeline view |
| `/memories/:id` | Memory detail + version history |
| `/memories/:id/edit` | Edit memory |
| `/search` | Search across prompts, stories, people, places, tags |
| `/graph` | Memory graph explorer |
| `/export` | Export to Markdown / PDF / JSON |
| `/settings` | App settings |

---

## 7. State management strategy

Zustand owns **UI/session state only**: today's prompt, the in-progress draft,
search filters, the selected node in the graph view. It never owns persisted
domain data directly. Stores read and write through the domain repository
interfaces — never through Dexie directly — so swapping IndexedDB for a
remote API later means writing one new repository implementation, not
touching any store or component.

---

## 8. Design system

Tailwind + shadcn/ui as the base layer, themed with warm neutral/paper tones
(think aged paper, soft ivory, muted ink — no saturated brand colors).
Generous whitespace. A humanist serif or warm sans for body text to reinforce
the "notebook" feeling. Framer Motion limited to short fade/slide transitions
between views — never bouncing, spinning, or attention-seeking motion.

Build a small shared component set before any feature screen: `Button`,
`Card`, `TextField`, `Textarea`, `PhotoUpload`, `EmptyState`, `PageHeader`.

Accessibility is not a final pass — apply it as you build: semantic HTML,
visible focus states, ARIA labels on icon-only controls, color contrast that
passes WCAG AA, full keyboard navigability.

---

## 9. Repository & GitHub setup

1. `git init`, add a `.gitignore` appropriate for a Vite + TypeScript project.
2. Scaffold the Vite + React + TS project, install the dependencies listed in
   §3, and configure Tailwind, shadcn/ui, ESLint, Prettier, and Vitest.
3. Using the GitHub CLI (`gh`), create the repository:
   - name: `REPO_NAME` from the Configuration section above
   - visibility: `VISIBILITY` from the Configuration section above
   - owner: `GITHUB_OWNER` if set, otherwise the authenticated account
   - push the initial scaffold as the first commit on `main`
4. Create these labels: `epic`, `feature`, `chore`, `architecture`,
   `good-first-issue`.
5. Create one GitHub issue per epic in §10, each with the checklist provided.
   Label each appropriately (`epic` + a relevant secondary label).

---

## 10. Epics — create each of these as a GitHub issue before writing feature code

**Epic 0 — Project scaffolding & tooling** (`architecture`)
- [ ] Vite + React 19 + TypeScript strict scaffold
- [ ] Tailwind CSS + shadcn/ui configured
- [ ] ESLint + Prettier configured
- [ ] Vitest + React Testing Library configured
- [ ] Base folder structure from §5 created with placeholder `index.ts` files
- [ ] `npm run dev` and `npm test` both run clean on an empty shell

**Epic 1 — Domain model & persistence layer** (`architecture`)
- [ ] Domain entities and types from §4
- [ ] Repository interfaces in `domain/` (e.g. `MemoryRepository`,
  `PromptRepository`, `PersonRepository`, `PlaceRepository`, `TagRepository`)
- [ ] Dexie schema + repository implementations in
  `infrastructure/persistence/indexeddb/`
- [ ] Unit tests for domain logic and repository implementations
- [ ] Versioning logic: editing a memory always creates a new
  `MemoryVersion` rather than mutating in place

**Epic 2 — Design system & shared UI** (`feature`)
- [ ] Theme tokens (colors, type scale, spacing) matching §8
- [ ] Shared primitives: `Button`, `Card`, `TextField`, `Textarea`,
  `PhotoUpload`, `EmptyState`, `PageHeader`
- [ ] App shell + routing skeleton from §6 (empty screens are fine for now)

**Epic 3 — Daily Prompt** (`feature`)
- [ ] Daily prompt selection logic (no repeats within a configurable window)
- [ ] Today screen: show prompt, write/save a memory
- [ ] First end-to-end vertical slice: prompt → write → save → appears in
  the memories list

**Epic 4 — Memory entry CRUD + version history** (`feature`)
- [ ] Full create/edit form (title, story, approx age, approx year, people,
  places, tags) using React Hook Form + Zod
- [ ] Memory detail view
- [ ] Version history view — read-only list of past versions of a memory

**Epic 5 — Photos** (`feature`)
- [ ] Attach one or more photos to a memory (optional)
- [ ] Local blob storage via IndexedDB
- [ ] Photo display in memory detail view

**Epic 6 — Search** (`feature`)
- [ ] Search across prompts, stories, people, places, and tags
- [ ] Fast, responsive results as you type

**Epic 7 — Timeline** (`feature`)
- [ ] Display memories ordered by when the event happened (using approx
  age/year), not by when they were written
- [ ] Graceful handling of memories with no date information at all

**Epic 8 — Memory graph (basic)** (`feature`)
- [ ] Build the graph data from shared `Person`/`Place`/`Tag` references
  across memories
- [ ] Simple, static visual graph view (defer rich interactive
  visualization to a later milestone — the data model and a basic render
  are the Phase-2 goal, not a polished explorer)

**Epic 9 — Annual reflection** (`feature`)
- [ ] Detect when today's prompt was also used ~1 year ago
- [ ] Flow: show today's prompt → user writes and saves a new memory → only
  then reveal the memory written on that same prompt a year earlier

**Epic 10 — Random memory** (`feature`)
- [ ] "On this day N years ago" surfacing where data supports it
- [ ] "Random memory" surfacing as a fallback

**Epic 11 — Export** (`feature`)
- [ ] Export all memories to Markdown
- [ ] Export all memories to JSON
- [ ] Export all memories to PDF

**Epic 12 — Accessibility & responsive QA pass** (`chore`)
- [ ] Full keyboard-navigation pass across all screens
- [ ] Color-contrast audit against WCAG AA
- [ ] Responsive layout check at mobile, tablet, and desktop widths

---

## 11. Implementation sequencing

1. Epic 0 → confirm `npm run dev` and `npm test` work on the empty shell.
2. Epic 1 → write unit tests for domain logic and repositories before any UI
   consumes them. **Pause here and summarize the architecture (folder
   structure, domain model, persistence approach) before continuing — this
   is the Phase 1 checkpoint.**
3. Epic 2 → shared primitives and app shell before any real feature screen.
4. Epic 3 → the first true end-to-end vertical slice.
5. Epics 4–11 → any order from here, but keep each as its own reviewable
   unit of work; don't let unrelated epics bleed into the same commit.
6. Epic 12 → a final pass, but don't defer accessibility entirely until
   then — apply it incrementally as each feature is built.

After every epic, stop, summarize what changed, confirm the test suite
passes, and only then move to the next one.