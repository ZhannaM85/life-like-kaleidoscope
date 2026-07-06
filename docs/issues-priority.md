# Issues Priority List

Issues grouped by implementation tier. Work top-to-bottom within each tier; dependencies are noted where order matters within a tier. Ordering follows the sequencing in `PROJECT_BRIEF.md` §11, with one deliberate deviation: data safety (export/import/persistent storage) is pulled up right after the first vertical slice, because IndexedDB is the only copy of the user's writing and a decades-long archive can't wait for backups until the end of Tier 5.

---

## Tier 1 — Architecture foundation (Phase 1)
_Scaffolding, domain model, and persistence. Everything downstream depends on this. Ends with the Phase 1 architecture checkpoint._

| # | Issue | Notes |
|---|-------|-------|
| ~~[#1](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/1)~~ | ~~Epic 0 — Project scaffolding & tooling~~ | Done ✓ — commit `ceacb8a` |
| ~~[#2](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/2)~~ | ~~Epic 1 — Domain model & persistence layer~~ | Done ✓ — commits `287a26a`, `2203d61`; 20 unit tests; Phase 1 checkpoint summary delivered |

---

## Tier 2 — Design system & app shell
_Shared primitives and routing skeleton before any real feature screen._

| # | Issue | Notes |
|---|-------|-------|
| ~~[#3](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/3)~~ | ~~Epic 2 — Design system & shared UI~~ | Done ✓ — commits `3aa1feb`…`4ebeba7`; 7 primitives, serif typography, 31 tests |
| ~~[#14](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/14)~~ | ~~bug: header nav unusable at mobile widths~~ | Done ✓ — mobile bottom tab bar, verified at 390×844 in headless Edge (commit `7a9e89c`) |
| ~~[#15](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/15)~~ | ~~chore: replace default Vite favicon~~ | Done ✓ — hand-drawn notebook-mark SVG (commit `3aa1feb`) |

---

## Tier 3 — First vertical slice
_Prompt → write → save → appears in the memories list. Proves the whole stack end to end._

| # | Issue | Notes |
|---|-------|-------|
| ~~[#4](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/4)~~ | ~~Epic 3 — Daily Prompt~~ | Done ✓ — commits `f032c2a`, `435de35`; slice verified in browser; StrictMode double-prompt race found & fixed during verification |

---

## Tier 4 — Data safety
_Pulled up from the end of the queue: once real writing exists (Tier 3), users need a way out of the browser and back in before anything else._

| # | Issue | Notes |
|---|-------|-------|
| ~~[#17](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/17)~~ | ~~feat: persistent storage request + storage status~~ | Done ✓ — `persist()` on bootstrap, storage status + dismissible backup suggestion on Settings |
| [#11](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/11) | Epic 11 — Export | **JSON first** (it's the backup format), Markdown next; PDF can trail into Tier 5 |
| [#16](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/16) | feat: JSON backup import/restore | Round-trips #11's JSON format incl. version histories and photos; depends on #11 |

---

## Tier 5 — Core features
_Any order from here, but keep each epic its own reviewable unit of work. Suggested order below; dependencies noted._

| # | Issue | Notes |
|---|-------|-------|
| [#18](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/18) | feat: localization — Russian support | First in this tier deliberately: extracting strings from 3 screens is cheap, from 10 it's a slog. Includes a **curated** (not translated) Russian word pool |
| [#5](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/5) | Epic 4 — Memory entry CRUD & version history | Full form (RHF + Zod), detail view, version history view |
| [#6](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/6) | Epic 5 — Photos | IndexedDB blob storage; display in detail view — extends #5's detail view |
| [#7](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/7) | Epic 6 — Search | Across prompts, stories, people, places, tags |
| [#8](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/8) | Epic 7 — Timeline | Ordered by approx age/year; graceful handling of undated memories |
| [#9](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/9) | Epic 8 — Memory graph (basic) | Data model + simple static render; rich explorer deferred |
| [#10](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/10) | Epic 9 — Annual reflection | Reveal last year's memory only after writing today's — depends on #4 |
| [#13](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/13) | Epic 10 — Random memory | "On this day N years ago" + random fallback |

---

## Tier 6 — Quality pass
_Final sweep, but apply accessibility incrementally as each feature is built — don't defer it all here._

| # | Issue | Notes |
|---|-------|-------|
| [#12](https://github.com/ZhannaM85/life-like-kaleidoscope/issues/12) | Epic 12 — Accessibility & responsive QA pass | Keyboard nav, WCAG AA contrast audit, responsive check; PDF export (#11 leftover) fits here too |
