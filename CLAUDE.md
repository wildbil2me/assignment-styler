# CLAUDE.md

Guidance for Claude Code working in this repository.

## Current state: rebuild in progress, phases 0–3 done

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
- **Phase 3 — done.** Two shells over one core. `app/page.tsx` became `ui/`;
  `apps/web` is the full editor and `apps/ext` is the quick-post side panel. The
  Cloudflare/Next/Drizzle residue and Tailwind are gone. **Exported HTML did not
  change** — the goldens stayed locked and green throughout, which is the point.
- **Phase 4 next** — make the compatibility panel's assurances true, and make a
  teacher's workspace durable.

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
- `ui/` — **all the React, shared by both shells.**
  - `state.ts` — `useComposer()`: blocks, selection, undo/redo, the `bcc-workspace`
    localStorage round trip, and the single `renderHtml` call. **A behaviour that
    lives here cannot drift between the web app and the panel.**
  - `composer.tsx` — the full editor. `quickpost.tsx` — the side panel.
  - `blocklist.tsx`, `inspector.tsx`, `preview.tsx`, `export.tsx`,
    `richtext.tsx` — the pieces both screens draw. `richtext.tsx` is the one
    place `document.execCommand` is called.
  - `styles.css` — one stylesheet, both shells. Its first 20 lines are the reset
    that replaced Tailwind.
- `apps/web/` — the Pages shell: `index.html`, `main.tsx`, `public/`.
- `apps/ext/` — the MV3 shell. `public/manifest.json` and `public/background.js`
  live under `public/` because Vite copies that directory to the output root,
  which is where the manifest's paths have to resolve.
- `tests/` — the core contract suite plus golden HTML and corpus snapshots.
- `tools/probe/` — the Blackbaud compatibility probe generator (42 rows).
- `docs/` — the plan, the measured compatibility results, the 2026-08-09 class
  style-guide spec, and the deferred AI drafting design.

Two builds, one per shell: `npm run build` (web → `pages-dist/`) and
`npm run build:ext` (→ `extension-dist/`). `npx tsc --noEmit` is clean — the
three pre-existing errors left with `worker/` and `db/` in Phase 3.

**The two shells cannot see each other's storage.** Separate origins, no host
permissions, nothing reads across by design. "Last used" means last used *in that
shell*, and a teacher who wants the same class style in both sets it in both.

## Checks

```bash
npm run build      # the web build - the real gate, must pass
npm run build:ext  # the extension build - the other real gate
npm test           # test:core + probe:test, and it is a usable signal again
npm run test:core  # 45 tests over core/ - green, keep it that way
npm run probe:test # 26 tests over the probe analyzer - green, keep it that way
npm run lint       # see the baseline below before trusting the result
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

Both build outputs are gitignored (`pages-dist/`, `extension-dist/`), so **no
generated artifact needs committing** — a build never dirties the tree.

### Known-red baseline — do not read this as a regression

- **`npm run lint` → 14 errors, in four files.** 3 in
  `apps/ext/public/background.js` (`'chrome' is not defined` —
  `eslint.config.mjs` deliberately has no webextensions global env), and 11
  across `ui/` (`jsx-a11y/*` on click handlers attached to non-interactive
  elements, `react-hooks/rules-of-hooks`, `react-hooks/set-state-in-effect` on
  the storage-restore effect, two unused `animation` rest-destructures, and one
  empty `catch`).

  **It was 15 before Phase 3, and 14 is not a fix.** The error that disappeared
  was `react-hooks/purity` on the `Date.now()` inside `duplicateBlock`; the rule
  stopped reporting it when that handler moved from the component body into the
  `useComposer` hook. The code is unchanged and carried-forward bug #7 (colliding
  ids from `Date.now()`) is still open. Every other error moved file-for-file.

  Corrected 2026-08-11: this used to read 1681 on any machine that had run a
  build, because lint was reading minified bundles and the count depended on your
  build state. Only the two real build outputs are ignored now, so the count is
  reproducible on a clean clone.

So: judge lint by whether *your* files are clean and the count is still 14.
Fixing the baseline is legitimate work — it is Phase 4's — but it is **its own
change**: don't fold it into an unrelated commit, and don't let it block a sync.

`npm test` was a stale starter script until Phase 3 deleted the file it ran
(`tests/rendered-html.test.mjs`, which asserted the app was still the placeholder
loading skeleton). It now runs `test:core` and `probe:test`, and it is green.

## Notes

- Node `>=22.13.0`, ESM (`"type": "module"`).
- **16 packages: `react`, `react-dom`, and 14 dev.** Phase 3 took it from 30 top
  level (317 total) by deleting the Cloudflare/Next/Drizzle residue and Tailwind.
  `esbuild`, `sharp` and `workerd` all left with it, so the postinstall-scripts
  note that used to live here no longer applies — nothing needs approving.
- `core/` and `ui/` use explicit `.ts`/`.tsx` import extensions
  (`allowImportingTsExtensions`), so Node's type stripping runs the tests with no
  build step.
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
