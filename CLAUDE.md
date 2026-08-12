# CLAUDE.md

Guidance for Claude Code working in this repository.

## Current state: rebuild in progress, phases 0–2 done

The plan is [docs/rebuild-plan-v2.md](docs/rebuild-plan-v2.md) — read it before
starting work. (v1, `docs/rebuild-plan.md`, was deleted in Phase 2 as v1 itself
instructed; it had drifted and said nothing was implemented.)

- **Phase 0 — done.** Blackbaud measured across three surfaces:
  [docs/blackbaud-compatibility.md](docs/blackbaud-compatibility.md), encoded as
  data in `core/compat.ts`. Five rows still need a human.
- **Phase 1 — done.** Domain logic extracted from `app/page.tsx` into `core/`,
  proven byte-identical at the time.
- **Phase 2 — done.** Tokenized: the fused subject presets became **profiles
  (feel) × palettes (colour)**, `render.ts` emits nothing hardcoded, half-width
  rows carry flex and inline-block in one markup, and `<details>` is a block
  type. This changed the exported HTML on purpose.
- **Phase 3 next** — two thin shells over one core, and deleting the residue.

Decided 2026-08-11: the target audience is other schools (public), both the web
app and the extension stay, and AI drafting is deferred to a future feature —
which is what makes a zero-backend, free-to-publish tool possible.

## What this is

**Blackbaud Content Composer** (`blackbaud-content-composer`) — a composer for
building student-facing class posts and exporting HTML that survives Blackbaud's
editor. Content is authored as blocks, previewed per Blackbaud surface (bulletin
board, topic, assignment, announcement), and exported as inline-styled HTML.

Layout:

- `core/` — **pure domain logic. Start here.** Model, block taxonomy, palettes,
  **profiles**, surfaces, templates, sanitizer, renderer, **degrader**, importer,
  and the measured Blackbaud compatibility spec. No React.
  - `core/profiles/` owns the *feel* (type scale, spacing, radii, shadow, tones);
    `core/palettes.ts` owns the six subject *colours*. `render.ts` reads tokens
    from both and contains no hex or magic pixel value — a test enforces that.
  - `core/degrade.ts` sits between what a profile asks for and what a tenant
    keeps. Small on purpose: Blackbaud turned out permissive.
- `app/` — the vinext (Vite + React 19 RSC) app. Now UI only; it imports
  everything else from `core/`.
- `src/main.tsx`, `vite.config.ts` — the Vite entry.
- `tests/` — the core contract suite plus golden HTML and corpus snapshots.
- `tools/probe/` — the Blackbaud compatibility probe generator (42 rows).
- `docs/` — the plan, the measured compatibility results, and the 2026-08-09
  class style-guide spec folded in from the repo root in Phase 2.
- `worker/` — Cloudflare Worker entry; `db/` + `drizzle/` are Drizzle + D1.
- `extension/` — browser extension that pastes composed HTML into Blackbaud.
- `examples/d1/` — reference example, not part of the app build.

`worker/`, `db/`, `drizzle/`, `examples/` and `app/api/` are starter-template
residue on the Phase 3 delete list. They are also the source of the three
pre-existing `npx tsc --noEmit` errors (`cloudflare:workers`, `Fetcher`,
`D1Database` — no `@cloudflare/workers-types` installed). `app/` and `core/` are
clean.

Three separate builds: `npm run build` (app), `pages:build`, `extension:build`.

## Checks

```bash
npm run build      # the real gate - must pass
npm run test:core  # 45 tests over core/ - green, keep it that way
npm run probe:test # 26 tests over the probe analyzer - green, keep it that way
npm run lint       # see the baseline below before trusting the result
npm test           # still the stale starter script, see below
npm run probe      # regenerate the compatibility kit into docs/
```

`npm run test:core` is the signal that matters when touching `core/`, and it is
two suites doing two different jobs:

- **`tests/core.test.mjs`** asserts contracts. The sanitizer and importer corpora
  are pinned as JSON snapshots in `tests/golden/`; the renderer is checked
  against every rule Phase 0 measured (all styles inline, no `<style>`, no
  `<svg>`, no whitespace between sibling blocks, `data-layout` intact) plus what
  a *stricter* tenant receives when `conservative` degrades the output.
- **`tests/golden.test.mjs`** pins exact bytes, 13 documents across all three
  profiles.

**If you intend to change exported HTML, the goldens are supposed to fail.**
Relock them deliberately and read the diff:

```bash
UPDATE_GOLDENS=1 node --test tests/core.test.mjs tests/golden.test.mjs
```

Phase 1's differential suite (`equivalence.test.mjs` against the frozen
`legacy-reference.mjs`) was deleted in Phase 2, as planned — it existed to prove
the extraction changed nothing, and Phase 2 changes the output on purpose.

All build outputs are gitignored (`dist/`, `pages-dist/`, `extension-dist/`,
`.vinext/`, `.wrangler/`), so **no generated artifact needs committing** — a
build never dirties the tree.

### Known-red baseline — do not read these as regressions

Both were already failing at commit `3c98f56`, before any local work:

- **`npm run lint` → 15 errors, in two files.** 12 in `app/page.tsx`
  (`jsx-a11y/*` on click handlers attached to non-interactive elements, plus
  `react-hooks/rules-of-hooks`), and 3 in `extension/background.js` (`'chrome' is
  not defined` — `eslint.config.mjs` has no webextensions/browser global env for
  `extension/`).

  Corrected 2026-08-11: this used to read 1681 on any machine that had run a
  build, because `globalIgnores` covered `dist/` but not `pages-dist/`,
  `extension-dist/`, `.vinext/`, or `.wrangler/` — so lint was reading minified
  bundles and the count depended on your build state. Those are ignored now. The
  real baseline of 15 is unchanged; it is just reproducible.
- **`npm test` → fails.** It runs `npm run build && node --test
  tests/rendered-html.test.mjs`, and the build passes; the test file is stale
  scaffolding from the starter template. It asserts the app is still the
  placeholder loading skeleton — `app/_sites-preview/SkeletonPreview.tsx`, a
  `<meta name="codex-preview" content="development">` tag, and a
  `react-loading-skeleton` dependency — none of which exist now that the composer
  is built out. The failure output shows the real page server-rendering correctly.

So: judge lint by whether *your* files are clean and the count is still 15. Fixing
either baseline is legitimate work, but it is **its own change** — don't fold it
into an unrelated commit, and don't let it block a sync.

`tests/rendered-html.test.mjs` should eventually be either deleted or rewritten
against the actual composer output. Until then `npm test` is not a usable signal.

## Notes

- Node `>=22.13.0`, ESM (`"type": "module"`).
- `npm install` leaves 6 postinstall scripts ungated by npm's allow-scripts
  (`esbuild`, `sharp`, `workerd`). The platform binaries install as optional deps
  anyway and the build works; approving them is not required.
## Session sync — check this on a machine you haven't used before

Session git sync is **not** in this repo. It is shared user-level config living in
[toomey-sj/wjt-claude-config](https://github.com/toomey-sj/wjt-claude-config): a
`SessionStart` hook that auto-pulls on launch, plus the `/wrap-up` and `/sync-up`
skills. This repo once had its own copy under `.claude/`; that was deleted, so a
machine without the shared config installed has **no** session sync at all.

Verify before trusting it:

```powershell
Test-Path "$env:USERPROFILE\.claude\hooks\git-auto-pull.ps1"   # should be True
```

If it's False — or no `blackbaud-styler: already up to date` style message appears
when a session opens, or `/wrap-up` isn't offered — clone that repo and run
`install.ps1`. Its README covers the rest.

This file is where the shared `/wrap-up` looks for this project's checks, so keep
the known-red baseline above current. If your lint count isn't 15, update it here
rather than working around it.
