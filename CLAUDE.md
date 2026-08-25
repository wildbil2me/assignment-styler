# CLAUDE.md

Guidance for Claude Code working in this repository.

## Current state: rebuild complete, phases 0–5 implemented

The plan is [docs/rebuild-plan-v2.md](docs/rebuild-plan-v2.md) — read it before
starting work. (v1, `docs/rebuild-plan.md`, was deleted in Phase 2 as v1 itself
instructed; it had drifted and said nothing was implemented.)

- **Phase 0 — done.** Blackbaud measured across three surfaces:
  [docs/blackbaud-compatibility.md](docs/blackbaud-compatibility.md), encoded as
  data in `core/compat.ts`. Four measured rows need manual observations; R42 and
  R43 were added later and need a new tenant probe run.
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
- **Phase 4 — done.** Two halves.
  - *The assurances.* The compatibility panel computes now: `core/checks.ts` does
    real WCAG contrast, heading order, and per-surface warnings derived from the
    spec, in three states — `pass | fail | unknown`, where **an unknown can never
    render as a tick.** Card headings became `<h2>` (decision D3), the one
    intended change to exported HTML; goldens relocked.
  - *The data.* `core/storage.ts` owns a versioned workspace and its migration;
    the side panel keeps its copy in `chrome.storage.local` and the web app in
    `localStorage`. A whole workspace exports to and imports from a JSON file.
    `core/ids.ts` is the single id source. Carried-forward bugs #5 and #7 fixed,
    **and the lint baseline is gone — `npm run lint` is clean.**
- **Phase 5 — implemented.** MIT license, real screenshots, a privacy-first
  README, SemVer release policy, changelog, synchronized release metadata, and
  CI over lint + tests + typecheck + both shells. The Pages deployment runs the
  same gates before publishing. Creating the `v0.1.0` tag remains an explicit
  release action, not something a local build does automatically.

Decided 2026-08-11: the target audience is other schools (public), both the web
app and the extension stay, and AI drafting is deferred to a future feature —
which is what makes a zero-backend, free-to-publish tool possible.

## What this is

**BBStyler** (`bbstyler`) — a composer for building student-facing class
posts and exporting HTML that survives Blackbaud's editor. The name is a working
one, chosen 2026-08-12; [docs/naming.md](docs/naming.md) lists every place it
appears and, more importantly, draws the line between *our* name and the many
references to **Blackbaud the product** that a rename must never touch. Content is authored as blocks, previewed per Blackbaud surface (bulletin
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
  - `core/checks.ts` is what the composer can honestly say about a post. It
    mirrors `renderHtml`'s parameter order so it cannot drift from what was
    rendered, and it is where **the hero eyebrow's 2.65:1 failure on every
    shipped palette** is reported rather than hidden. Its tri-state result is
    load-bearing: if you find yourself adding a fourth state, or defaulting an
    uncomputable pair to `pass`, you are rebuilding the bug it replaced.
  - `core/storage.ts` is the **only** place the workspace shape is known. It is
    versioned (`version: 1`), migrated in one function, and read through an
    injectable `StorageAdapter` — `chrome.storage.local` in the side panel,
    `localStorage` everywhere else. Don't reach for `localStorage` directly in
    `ui/`; that is what this replaced.
  - `core/ids.ts` mints every block id. Monotonic and seeded from the clock, so
    two blocks created in one millisecond cannot collide and a restored
    workspace cannot collide with new ones.
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
- `tools/probe/` — the Blackbaud compatibility probe generator (43 rows).
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
npm run check:release # package, lockfile, extension and changelog agree
npm run design:check # vendored authority integrity + source conformance, 0/0
npm run build      # the web build - the real gate, must pass
npm run build:ext  # the extension build - the other real gate
npm run design:check:built # run after both builds, 0/0
npm test           # test:core + test:design + probe:test - the whole suite
npm run test:core  # 64 tests over core/ - green, keep it that way
npm run test:design # admin chrome contrast, suppressions and permissions
npm run probe:test # 27 tests over the probe analyzer - green, keep it that way
npm run lint       # 0 errors - anything else is yours, or stale build output
npm run probe      # regenerate the compatibility kit into docs/
```

`npm run test:core` is the signal that matters when touching `core/`, and it is
two suites doing two different jobs:

- **`tests/core.test.mjs`** asserts contracts. The sanitizer and importer corpora
  are pinned as JSON snapshots in `tests/golden/`; the renderer is checked
  against every rule Phase 0 measured (all styles inline, no `<style>`, no
  `<svg>`, no whitespace between sibling blocks, `data-layout` intact) plus what
  a *stricter* tenant receives when `conservative` degrades the output. Since
  Phase 4 it also pins `checks-matrix.json` — the verdict of every check across
  all 54 palette × profile × surface combinations, so a colour tweak that quietly
  breaks contrast fails here instead of shipping.
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

### No known-red baseline any more

**Every check in this file is green. If something is red, you broke it.**

This section used to carry two standing failures, and both are gone as of
Phase 4 — recorded here because the history explains why the config looks the way
it does:

- **Lint was 15, then 14, now 0.** The `jsx-a11y` errors were not pedantry: the
  block rows were `<div onClick>`, so a teacher navigating by keyboard could edit
  a block's fields but never choose *which* block. The select target is a real
  `<button>` now. The modals close on a backdrop target check rather than a
  `stopPropagation` hung off a `role="dialog"`. `useTemplate` was renamed
  `applyTemplate`, since it was a plain callback that every linter and reader had
  to treat as a hook. `eslint.config.mjs` sets `ignoreRestSiblings` (dropping a
  field via rest destructuring is the point of the expression, not an oversight)
  and gives `apps/ext/public/background.js` the `chrome` global it actually runs
  with.

  It read 1681 on any machine that had run a build until 2026-08-11, because lint
  was reading minified bundles and the count depended on your build state. Only
  the two real build outputs are ignored now.
- **`npm test` was a stale starter script** until Phase 3 deleted the file it ran
  (`tests/rendered-html.test.mjs`, which asserted the app was still the
  placeholder loading skeleton). It runs `test:core` and `probe:test` now.

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

If it's False — or no `assignment-styler: already up to date` style message appears
when a session opens, or `/wrap-up` isn't offered — clone that repo and run
`install.ps1`. Its README covers the rest.

This file is where the shared `/wrap-up` looks for this project's checks, so keep
the Checks section above current. Every check there is green; if one of them goes
red for a reason that is *expected* rather than broken, say so here rather than
working around it.

### Stale output from the pre-Phase-3 stack blocks the auto-pull

On 2026-08-18 a machine that had last built at Phase 0 pulled Phase 4 and found
`dist/`, `.next/` and `.wrangler/` sitting untracked: Phase 3 narrowed
`.gitignore` to the two output directories that still exist, and those three are
no longer among them. Nothing regenerates them — the toolchain that wrote them is
deleted — but while they are present they break two things at once:

- the auto-pull hook reads the tree as dirty and declines with `uncommitted
  changes - auto-pull skipped`, so the session silently starts out of date;
- `npm run lint` reads their minified bundles and reports thousands of errors
  instead of 0, the same trap as the old 1681 count.

Deleting them fixes both, and is safe:

```powershell
Remove-Item -Recurse -Force .next, dist, .wrangler -ErrorAction SilentlyContinue
```

### Two more local-only reds, both fixed 2026-08-25

Same family as the one above — a check reading something a clean CI checkout
does not have. Recorded because the fixes are non-obvious:

- **`npm run design:check` failed on every vendored file.** `core.autocrlf=true`
  with no `.gitattributes` meant `design/**` checked out as CRLF, so all five
  SHA-256s mismatched and it read as upstream drift. `.gitattributes` now marks
  `design/** -text`, and `tools/check-design-vendor.mjs` normalises CRLF before
  hashing so a copy cloned before that still reports content rather than its
  line endings. Note the vendored `conformance.mjs` is no cross-check here: its
  `matches canonical` lines compare `design/` against itself and always pass.
- **`npm run lint` reported 3 errors from `work/`.** Gitignored local scratch
  that eslint still walked; `work/**` is in `globalIgnores` now.

`npx tsc --noEmit` was also red at `b61591c` — `import.meta.env.BASE_URL` with
nothing referencing Vite's ambient types. `ui/vite-env.d.ts` is that reference.
A `types` array in `tsconfig.json` would have worked too, and would have
silently dropped `@types/node` from the Vite config files.

## Design

This app follows the educator suite style book, vendored in `design/`:

- `design/RULES.md` — every rule, as text. Start here.
- `design/tokens.json` — every value. Authoritative; never eyeball a hex.
- `design/style-guide.html` — live specimens and rationale. Open in a browser to *see* a component.
- `design/conformance.schema.json` and `design/tools/conformance.mjs` — bundled config contract and checker.

Rules have stable IDs (`ARCH-01`, `COLOR-08`, `FORM-05`). Cite them in commits.
Audit this app from the style book repo: `node tools/conformance.mjs <path-to-this-app>`

Five invariants: no CSS custom properties, no dark mode, responsive blocks last
(coarse → 1024 → 640), file-platform apps have no build or dependencies, and px not
rem. Bundled apps declare their platform and obey §19.
