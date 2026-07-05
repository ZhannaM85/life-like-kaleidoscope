# Issues Priority List

Issues grouped by implementation tier. Work top-to-bottom within each tier; dependencies are noted where order matters within a tier. Ordering follows the sequencing in `PROJECT_BRIEF.md` §11.

---

## Tier 1 — Architecture foundation (Phase 1)
_Scaffolding, domain model, and persistence. Everything downstream depends on this. Ends with the Phase 1 architecture checkpoint._

| # | Issue | Notes |
|---|-------|-------|
| ~~[#1](https://github.com/ZhannaM85/life-kaleidoscope/issues/1)~~ | ~~Epic 0 — Project scaffolding & tooling~~ | Done ✓ — commit `ceacb8a`; issue still open on GitHub |
| ~~[#2](https://github.com/ZhannaM85/life-kaleidoscope/issues/2)~~ | ~~Epic 1 — Domain model & persistence layer~~ | Done ✓ — commits `287a26a`, `2203d61`; 20 unit tests; Phase 1 checkpoint summary delivered |

---

## Tier 2 — Design system & app shell
_Shared primitives and routing skeleton before any real feature screen._

| # | Issue | Notes |
|---|-------|-------|
| [#3](https://github.com/ZhannaM85/life-kaleidoscope/issues/3) | Epic 2 — Design system & shared UI | Theme tokens (§8), shared primitives, app shell + routing skeleton (§6) |
| [#14](https://github.com/ZhannaM85/life-kaleidoscope/issues/14) | bug: header nav unusable at mobile widths | Collapse nav below a breakpoint (menu button or bottom tab bar); fix with or right after #3 — don't defer to #12 |
| [#15](https://github.com/ZhannaM85/life-kaleidoscope/issues/15) | chore: replace default Vite favicon | Generate a calm, notebook-style favicon (no literal kaleidoscope imagery); land with #3's visual identity work |

---

## Tier 3 — First vertical slice
_Prompt → write → save → appears in the memories list. Proves the whole stack end to end._

| # | Issue | Notes |
|---|-------|-------|
| [#4](https://github.com/ZhannaM85/life-kaleidoscope/issues/4) | Epic 3 — Daily Prompt | Prompt selection logic (no repeats within window), Today screen |

---

## Tier 4 — Core features
_Any order from here, but keep each epic its own reviewable unit of work. Suggested order below; dependencies noted._

| # | Issue | Notes |
|---|-------|-------|
| [#5](https://github.com/ZhannaM85/life-kaleidoscope/issues/5) | Epic 4 — Memory entry CRUD & version history | Full form (RHF + Zod), detail view, version history view |
| [#6](https://github.com/ZhannaM85/life-kaleidoscope/issues/6) | Epic 5 — Photos | IndexedDB blob storage; display in detail view — extends #5's detail view |
| [#7](https://github.com/ZhannaM85/life-kaleidoscope/issues/7) | Epic 6 — Search | Across prompts, stories, people, places, tags |
| [#8](https://github.com/ZhannaM85/life-kaleidoscope/issues/8) | Epic 7 — Timeline | Ordered by approx age/year; graceful handling of undated memories |
| [#9](https://github.com/ZhannaM85/life-kaleidoscope/issues/9) | Epic 8 — Memory graph (basic) | Data model + simple static render; rich explorer deferred |
| [#10](https://github.com/ZhannaM85/life-kaleidoscope/issues/10) | Epic 9 — Annual reflection | Reveal last year's memory only after writing today's — depends on #4 |
| [#13](https://github.com/ZhannaM85/life-kaleidoscope/issues/13) | Epic 10 — Random memory | "On this day N years ago" + random fallback |
| [#11](https://github.com/ZhannaM85/life-kaleidoscope/issues/11) | Epic 11 — Export | Markdown, JSON, PDF |

---

## Tier 5 — Quality pass
_Final sweep, but apply accessibility incrementally as each feature is built — don't defer it all here._

| # | Issue | Notes |
|---|-------|-------|
| [#12](https://github.com/ZhannaM85/life-kaleidoscope/issues/12) | Epic 12 — Accessibility & responsive QA pass | Keyboard nav, WCAG AA contrast audit, responsive check |
