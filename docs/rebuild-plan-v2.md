# Rebuild plan v2

Written 2026-08-11. Superseded `rebuild-plan.md`, which was written against an
earlier `app/page.tsx` and had drifted: it said 4 surfaces (there are 3), 13
block types (there are now 17), 5 templates (15), and every line reference in its
salvage inventory was off by ~21 lines. Deleted in Phase 2, as it asked.

## The goal, restated

Replace Blackbaud's WYSIWYG editor with something modern, and make the content it
produces *feel* modern too. Two shells: a GitHub Pages app for full editing, an
MV3 side panel for quick posting. No backend, no accounts, no per-user cost.

## Decisions

Settled 2026-08-11. Don't relitigate.

| Question | Decision |
| --- | --- |
| Extension integration | **Clipboard only.** `sidePanel` + `storage`, no host permissions, no content script. Survives every Blackbaud redesign; "nothing reads the page, ever" is a real selling point for schools. |
| Blackbaud probe | **Yes, running it.** Phase 0 goes first and everything inherits from its results. |
| Visual direction | **Soft cards.** Rounded, tinted, layered, emoji markers. Becomes `core/profiles/soft.ts` and the default. Editorial and bold ship as alternates. |
| Motion | **Off.** Settled by the probe, not by preference — see "Later — motion". |
| AI drafting | **Deferred**, behind a `Drafter` seam. Prompt + schema preserved in `docs/ai-drafting.md`. |
| Audience | **Public / other schools** (carried from v1). Compat rules must be data, not constants. |

## The architectural idea

v1 treated "the renderer" as the product. It's half of it. The other half is what
makes "modern" achievable at all:

```
  profile (feel)  ×  palette (subject)
          \            /
           v          v
        render(blocks, profile, palette, surface)
                    |
                    v
        degrade(html, compatSpec)   <- drops/substitutes what Blackbaud strips
                    |
                    v
           inline-styled HTML
```

Three consequences worth the refactor:

1. **"Modern" becomes data.** Today six subject presets each hardcode a color
   *and* a font *and* implicitly a layout feel. Split them: a **profile** owns
   structure and treatment (radii, shadows, rules, spacing, type scale), a
   **palette** owns the six subject colors. 3 profiles × 6 palettes = 18 looks
   from two small data files, and a new look is a JSON file, not a code change.
   This is also the model your root-level `classProfile` spec already described —
   see "Reconciling the root spec" below.

2. **Risky CSS becomes survivable.** `degrade()` is the piece that doesn't exist
   today. `border-radius: 12px` emits only if the compat spec says it survives;
   `box-shadow` falls back to a 1px border; `display:flex` falls back to
   `inline-block`. Modern styling stops being a gamble, so the soft/rounded
   direction stays viable even if Blackbaud is hostile to it.

3. **The compat spec is per-tenant.** Other schools run the probe, get their own
   spec, and the same build degrades differently for them.

## Structure

```
core/                    pure TS. no React, no module-level DOM access
  model.ts               Block, BlockType, Profile, Palette, Surface, CompatSpec
  catalog.ts             the 17-type block taxonomy + labels, icons, tones
  profiles/              editorial.ts | soft.ts | bold.ts        <- the feel
  palettes.ts            6 subject palettes                      <- the color
  surfaces.ts            3 surfaces + widths + guidance
  templates.ts           15 templates, 5 per surface
  render.ts              blocks -> html                          <- the product
  degrade.ts             compat-driven property fallbacks        <- new
  sanitize.ts            inline-tag allowlist
  import.ts              html -> blocks
  checks.ts              contrast math, heading order            <- real, not 4/4
  compat.ts              Blackbaud rules as data, from Phase 0
  storage.ts             versioned workspace + export/import
ui/                      shared React: composer, inspector, preview, richtext
apps/web/                Pages shell
apps/ext/                MV3 side panel shell (manifest, background, index.html)
tools/probe/             compat probe generator
tests/                   golden output, adversarial sanitizer, import fixtures
docs/
  blackbaud-compatibility.md    Phase 0 results + how they were measured
  ai-drafting.md                deferred design, prompt + schema preserved
```

### Dependencies: 30 → 8, in the event 16

Phase 3 landed at 16 rather than 8. The eight below are the runtime and build
essentials; the other eight are the lint stack this repo already had
(`@eslint/js`, `eslint-plugin-react`, `globals`, `typescript-eslint`, …) plus
`@types/*`, none of which the count anticipated. No dependency survived that the
plan named for deletion.

Delete `worker/`, `db/`, `drizzle/`, `examples/`, `.openai/`,
`app/chatgpt-auth.ts`, `app/api/`, `next.config.ts`, `next-env.d.ts`,
`drizzle.config.ts`, `tests/rendered-html.test.mjs`, `public/og.png` (1.05 MB,
currently shipped in the Pages artifact).

Drop with them: `vinext`, `wrangler`, `@cloudflare/vite-plugin`, `drizzle-orm`,
`drizzle-kit`, `@vitejs/plugin-rsc`, `react-server-dom-webpack`,
`@next/eslint-plugin-next`.

Also drop **Tailwind**. `app/globals.css` imports `tailwindcss` on line 1 and
then never uses a single utility class — the app is styled entirely with semantic
class names. It's there for preflight. Replace with ~20 lines of reset and delete
`tailwindcss`, `@tailwindcss/postcss`, and `postcss.config.mjs`.

**Runtime deps: `react`, `react-dom`. That's it.** No HTML parser dependency
either — v1 argued for one because `safeRich()` needed to run during SSR, and
we're deleting SSR. Both shells have a real DOM, so `sanitize.ts` and `import.ts`
use native `DOMParser`; tests shim it with `linkedom` as a devDependency. Faster,
smaller, and battle-tested where it actually runs.

Dev deps: `vite`, `typescript`, `@vitejs/plugin-react`, `eslint` +
`typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y`,
`linkedom`, `@types/*`.

## Phase 0 — measure Blackbaud, pick a direction

**Done, 2026-08-12.** Results in [blackbaud-compatibility.md](blackbaud-compatibility.md),
encoded as data in `core/compat.ts`. Four manual rows outstanding (R29, R33, R34,
R41); none block Phase 1.

Three results changed the plan below:

1. **`<style>` blocks are stripped on all three surfaces.** The inline-only
   architecture is confirmed necessary, and CSS animation is impossible.
2. **Everything soft cards is made of survives** — `border-radius`, `box-shadow`,
   `rgba()`, tinted fills, everywhere. The chosen direction ships as drawn.
3. **37 of 41 rows survive.** `degrade()` shrinks from an architecture to a
   three-line guard; see Phase 2.

The kit below stays in the repo — it is how another school measures *their*
tenant, and `core/compat.ts` is written to be replaced by their result.

<details>
<summary>Original Phase 0 brief, kept for the method</summary>

**Blocking. Needs you, not this machine.** Two paste sessions.

**0a. Compat probe.** Built 2026-08-11. `npm run probe` regenerates the kit:

| File | What it is |
| --- | --- |
| [compat-probe.html](compat-probe.html) | Open locally. Shows the reference rendering, copies the payload. 41 rows, ordered highest-stakes first, each carrying a plain-text `[Rnn]` marker that survives whatever happens to the styling. |
| [compat-analyzer.html](compat-analyzer.html) | Open locally after pasting back what Blackbaud stored. Finds each marker, reports survived / rewritten / stripped / missing per row, and exports JSON, a markdown table, or a `core/compat.ts` stub. Runs entirely in the browser. |
| `tools/probe/rows.mjs` | The 41 row definitions. Add a row here and rebuild. |
| `tools/probe/analyze.mjs` | The verdict logic. Inlined into the analyzer page by the generator, so the page and the tests run identical code. |
| `tools/probe/analyze.test.mjs` | 26 tests over fabricated damage scenarios. `npm run probe:test`. |

The distinction the analyzer exists to draw is **survived vs. quietly rewritten** —
a value Blackbaud changed rather than dropped is the one that would otherwise
ship as a false compatibility claim.

Output: `docs/blackbaud-compatibility.md`, generated from the analyzer's export.

The rows that decide the most:

| Group | Rows |
| --- | --- |
| **Process** | paste → save → reopen source; paste → switch to WYSIWYG → save (this is where editors classically mangle markup) |
| **Soft cards** | `border-radius`, `box-shadow`, `rgba()` colors, tinted `background-color`. **Highest stakes — these are what the chosen direction is made of.** |
| **Modern feel** | `linear-gradient`, `letter-spacing`, `opacity` |
| **Layout** | `inline-block` + `calc(50% - 10px)` + `min-width` (**current strategy, verify first**), `flex`, `grid`, two-column `<table>`, `float` |
| **Delivery** | inline `style` on div/p/h1, **`<style>` block** (see motion below — this row now decides two things), `class` + stylesheet, `!important`, `data-*` (the renderer emits `data-layout`) |
| **Motion** | `<style>` block containing `@keyframes`; inline `<svg>` with SMIL `<animate>`; `<details>`/`<summary>`; animated GIF in `<img>` |
| **Elements** | `h1`–`h4`, `blockquote`, `ul`/`ol` with `list-style-type:none`, `<br>` runs, `<a href>` + `target`/`rel`, `<span style="color">`, non-websafe `font-family`, emoji in headings, `&nbsp;`, 3-deep nesting, `<img>`, inline `<svg>` |

Two rows now carry more weight than the rest. **`border-radius` and `box-shadow`**
are the chosen direction's whole identity — if they're stripped, soft cards
degrade to flat squares and you may want to revisit the pick rather than ship the
degraded form. **`<style>`** decides whether motion is possible at all, and if it
survives, whether the inline-style architecture was ever necessary.

The probe ships publicly so other schools can verify their own tenant instead of
trusting ours.

**0b. Direction.** Three full mockups of the same Macbeth post, each real export
HTML. View them, paste-test them, pick one. Whichever wins becomes
`core/profiles/<name>.ts` and the default; the other two ship as alternates.

</details>

## Phase 1 — extract the core, tests locked to current output

**Done, 2026-08-12.** Zero behaviour change, proven rather than asserted.

`app/page.tsx` went from 239 lines to 131 and now imports everything from
`core/`. It is a real extraction, not a parallel copy — there is one
implementation of each function.

| Module | Contents |
| --- | --- |
| `core/model.ts` | `Block`, `BlockType`, `StylePreset`, `Surface`, `SurfaceKey` |
| `core/catalog.ts` | the taxonomy — 16 types then, 17 since Phase 2 |
| `core/palettes.ts` | 6 subject presets — colour only since Phase 2 |
| `core/surfaces.ts` | 3 surfaces + widths + guidance |
| `core/templates.ts` | 15 templates, `templateGroups`, the Macbeth starter |
| `core/sanitize.ts` | `esc`, `safeRich` |
| `core/render.ts` | `renderHtml` — the product |
| `core/import.ts` | `importHtml`, with the React state writes pulled out |
| `core/compat.ts` | Phase 0 results as data |

### How "no behaviour change" is proven

`tests/legacy-reference.mjs` is a **frozen verbatim snapshot** of the four
original functions. `tests/equivalence.test.mjs` runs both implementations over
a corpus and demands byte-identical output:

- every block type × width × emoji × label state
- every block type × 41 adversarial bodies (nested tags, bad href schemes,
  entities, `<br>` variants, style narrowing, unclosed tags)
- all 15 templates × 6 presets × 3 surfaces — 270 combinations
- 34 import fixtures, compared with `deepEqual`
- a custom preset containing a quote character, to pin the escaping

`tests/golden/*.html` holds 10 readable snapshots. They do a different job:
Phase 2's *intended* output changes become a reviewable diff instead of hiding
inside a rewrite. Both suites were verified to fail on a deliberate one-pixel
change before being trusted.

```bash
npm run test:core                                          # 27 tests
UPDATE_GOLDENS=1 node --test tests/golden.test.mjs          # regenerate, deliberately
```

Gates: all three builds pass, `npx tsc --noEmit` is clean for `app/` and `core/`,
lint is still exactly 15.

### Two notes for whoever picks this up

- **`tests/dom.mjs` wraps linkedom's `DOMParser`.** linkedom does not synthesize
  `html`/`head`/`body` around a fragment the way a browser does — given
  `"<h1>a</h1><p>b</p>"` it makes the `h1` the document element and leaves `body`
  empty, so `doc.body.children` sees nothing and the importer returns zero
  blocks. The shim wraps bare fragments so linkedom behaves like a browser.
  The core was left alone deliberately; bending it to suit the test double would
  have been a behaviour change. Matters if core ever runs outside a browser.
- **`allowImportingTsExtensions` is now on**, because `core/` uses explicit
  `.ts` import extensions so Node's type stripping can run the tests with no
  build step. `noEmit` was already set, so this is free.

Phase 0's corrections were deliberately **not** folded in here. That is Phase 2.

## Phase 2 — tokenize, then apply Phase 0

**Done, 2026-08-12.** Where "modern" actually happened.

| # | Item | Where it landed |
| --- | --- | --- |
| 1 | Split the six presets into profiles × palettes | `core/model.ts` (`Profile`, `Palette`, `ToneKey`), `core/palettes.ts` is colour only |
| 2 | Author the chosen profile | `core/profiles/soft.ts` — default. `editorial.ts` and `bold.ts` ship as alternates |
| 3 | Re-point `render.ts` at tokens | no hex and no magic px left in the file; a test asserts it |
| 4 | Single-quoted `font-family` | `fontStack()` in `core/profiles/index.ts` |
| 5 | flex + inline-block half-width markup | `render.ts`, gated on `flex-wrap` support |
| 6 | Promote `<details>`/`<summary>` | 17th block type, and the Study Guide template's answer key |
| 7 | Update the goldens | 13 cases in `tests/golden/`, relocked |

`app/page.tsx` gained a profile picker beside the class picker, and the custom
style editor now edits a palette plus a font override (`withFonts`) rather than a
fused preset. A pre-split `localStorage` workspace migrates on load: its colours
become the custom palette, and its fonts carry over only if the teacher had
actually selected the custom style.

### Three things the phase found

1. **The compat spec's `styles` map was an accidental allowlist.** Phase 1 wrote
   `resolve()` to treat an unmeasured property as unsupported, which is right for
   an unknown tenant and wrong for a measured one — it silently dropped
   `border-top` from the editorial hero because no row happened to isolate it.
   The measurement actually shows Blackbaud does not filter properties at all
   (`gap` and `grid-template-columns` both came back), so `CompatSpec` now
   carries `unlistedStyles: "allow" | "deny"`. St John's allows; `conservative`
   denies.
2. **`flex-wrap` was never probed.** `display:flex` was (R09), but flex without
   wrapping overflows a phone rather than stacking. Probe row **R42** now
   isolates it; until it is measured `core/compat.ts` infers it, and the
   renderer falls back to pure inline-block if it is ever set false.
3. **The prototype emitted `<p><ul>…</ul></p>`** for every list block — invalid
   nesting browsers repair silently and a WYSIWYG round trip would not. Bodies
   are `<div>` now. Headings stay semantic.

**`degrade.ts` came out much smaller than planned**, as Phase 0 predicted. It was
scoped for a hostile target; the target is permissive. What it does: filter
declarations through the spec, substitute a plain card where `<details>` is
unsupported, and `guard()` the three structural rules — never `<style>`, never
inline `<svg>`, never animation. The spec-driven mechanism is kept because it is
what makes the tool portable to a stricter school; no fallback was built that
nothing needs.

### Tests

`tests/legacy-reference.mjs` and `equivalence.test.mjs` are **gone** — their job
was proving Phase 1 changed nothing, and Phase 2 changes the output on purpose.
`tests/core.test.mjs` replaces them: the sanitizer and importer corpora are
pinned as JSON snapshots (both are untouched by this phase), and the renderer is
asserted against its contract — every Phase 0 rule, plus what a stricter tenant
receives — rather than against a fixed string. Fixed strings stayed in
`golden.test.mjs`, which now covers all three profiles and one `conservative`
render.

```bash
npm run test:core                                        # 45 tests
UPDATE_GOLDENS=1 node --test tests/core.test.mjs tests/golden.test.mjs
```

## Phase 3 — two shells, one core

**Done, 2026-08-12.** Both shells are thin, and the residue is gone.

`app/page.tsx` — one 145-line file that was the entire UI — became `ui/`, and the
two shells are now 8 lines each:

| Module | Contents |
| --- | --- |
| `ui/state.ts` | `useComposer()` — blocks, selection, undo/redo, the `bcc-workspace` round trip, one `renderHtml` call |
| `ui/composer.tsx` | the full editor: topbar, style editor, HTML import, saved posts, templates, stage |
| `ui/quickpost.tsx` | the side panel |
| `ui/blocklist.tsx`, `inspector.tsx`, `preview.tsx`, `export.tsx` | what both screens draw |
| `ui/richtext.tsx` | `RichEditor`, and `exec()` — the one call site of `document.execCommand` (carried-forward bug #6) |
| `apps/web/`, `apps/ext/` | `index.html` + `main.tsx`, and for the extension `public/manifest.json` + `public/background.js` |

Deleted: `worker/`, `db/`, `drizzle/`, `examples/`, `.openai/`, `build/`,
`app/api/`, `app/chatgpt-auth.ts`, `app/layout.tsx`, `next.config.ts`,
`next-env.d.ts`, `drizzle.config.ts`, `tests/rendered-html.test.mjs`,
`public/og.png` and three unused starter SVGs. **30 top-level dependencies became
16** — `react`, `react-dom`, and 14 dev — and 490 installed packages became 317.
`npx tsc --noEmit` is clean now: its three pre-existing errors were `worker/` and
`db/` importing Cloudflare types that were never installed.

### What the panel keeps, and why each thing is there

Decided 2026-08-12. Quick-post drops the template picker, the style editor, HTML
import, saved posts and export history. It keeps the **surface** picker, because
surface changes what `render.ts` emits and a post composed for the wrong one is
wrong; and it keeps the **class palette and profile**, because the panel cannot
inherit them — clipboard-only means no host permissions, which means the two
shells are separate origins and neither can read the other's `localStorage`.
"Last used" is per shell. Cold start opens on the first bulletin template rather
than the Macbeth sample.

Storage stayed on `localStorage` rather than moving to `chrome.storage.local`:
one synchronous load path serves a side panel and a Pages app identically, and
Phase 4 already owns versioning and migration, which is when an async adapter
earns its cost. The manifest's unused `storage` permission was dropped —
a permission a school can see and we don't use is worth more gone.

### Tailwind is gone, and the preview got more honest

`app/globals.css` imported `tailwindcss` on line 1 for preflight and used no
utility class. It is ~20 lines of reset now, with two of preflight's rules
deliberately not reproduced: `ol,ul{list-style:none}` and
`img{display:block;max-width:100%}` also applied **inside `.paper`**, where the
exported Blackbaud HTML renders — so the preview showed lists with no bullets and
laid images out in a way no browser would. Everything `render.ts` emits carries
its own inline `margin`, so the reset's margin rules cannot reach the preview;
those two could, and did. Dropping them means the preview now shows what a
browser shows, which is the entire job of a preview.

This is the one intended visual change in the phase, and it is in the composer's
preview, not in the export.

### Gates

Exported HTML did not change, so the goldens were **supposed to stay green** —
the inverse of Phase 2. They did: 45 core tests pass with the goldens untouched.
Both builds pass, `tsc` is clean, and both shells were smoke-rendered through
`react-dom/server` to prove the split didn't break mounting.

Lint went 15 → 14, which is **not** a fix. The error that vanished was
`react-hooks/purity` on the `Date.now()` in `duplicateBlock`; the rule stopped
reporting it once that handler moved into a custom hook. Same code, same
carried-forward bug #7. Bugs #5 and #7 were deliberately left alone so that a
changed id or a failing golden would mean something had broken.

Carried-forward bug #1 is closed: `/api/draft` and the `localGenerate()` fallback
that answered every teacher's notes with hardcoded Macbeth are both gone, and the
prompt and schema are preserved in [ai-drafting.md](ai-drafting.md). Bug #3 is
moot — there is no SSR left to diverge under.

## Phase 4 — make the assurances true, make the data durable

### First half — the assurances. Done, 2026-08-12.

`core/checks.ts` replaced four hardcoded ✓ rows and a hardcoded `4/4`. It mirrors
`renderHtml`'s parameter order and resolves tones through the same
`resolveTone`, so it cannot drift from what was rendered; the panel in
`ui/inspector.tsx` now computes nothing and only draws the result.

**What the measurement found before a line was written:** the "accessible color
contrast" ✓ was false for **every palette the tool ships**, not merely for custom
ones. The hero eyebrow is `palette.accent` at 12px bold — small text, so 4.5:1 —
and runs 2.65:1 (English gold) to 3.49:1 (Arts) against a white page. Everything
else has comfortable headroom: card body text bottoms out at 13.08:1, card
headings at 5.72:1, the hero title at 8.99:1.

Four decisions, settled before building:

| | Question | Decision |
| --- | --- | --- |
| **D1** | What sits behind the post | **Assume white, and say so in the row.** The renderer sets no page background, so the hero and intro sit on Blackbaud's own, which we cannot see. Assuming white keeps the largest text on the page checkable; the alternative marks half the pairs permanently unknown. |
| **D2** | The failing eyebrow | **Report it, fix it later.** The panel ships showing a real failure on the default palette — which is the demonstration that it works — rather than rushing a six-colour redesign. Exported HTML unchanged by this. |
| **D3** | Card headings | **Promote `<p>` → `<h2>`.** Only the hero emitted a heading, so a screen reader heard one title and a wall of paragraphs. `h1`–`h4` are measured surviving everywhere and the inline style already fixed size and margin, so the tag changed and the rendering did not. |
| **D4** | The score | **Passed over *checked*, unknowns counted apart.** An uncomputed check can inflate neither side. |

The tri-state (`pass | fail | unknown`) is the load-bearing idea. A fourth state
was considered for tenant degradations and rejected: `degrade()` is built so a
compatibility decision never hides content — a stripped `<details>` becomes an
open card — so those are passes whose detail names the substitution, not warnings.

`<summary>` was deliberately left alone. The HTML spec permits one heading
element inside it, but that nesting is unmeasured against Blackbaud, and this
renderer emits only what the probe verified. **Probe row R43** now isolates it;
until it passes, collapsible sections contribute no heading and the panel says so
in words rather than silently.

Tests: 45 → 55. Known-value contrast fixtures (`#000/#fff = 21.00`, the
just-fails `#777` grey, the six accents), a pinned verdict matrix over all 54
palette × profile × surface combinations, and an explicit assertion that a colour
the formula cannot read reaches the report as `unknown` and never as a pass.

The goldens moved, once, by design: `<p style="…">` → `<h2 style="…">` on card
headings, every style attribute byte-identical.

### Second half — the data. Done, 2026-08-12.

`core/storage.ts` is now the only place the workspace shape is known: a
`version: 1` schema, one `migrate()` that accepts every vintage the prototype
ever wrote, and an injectable `StorageAdapter`. The migration that used to sit
inline in a React effect — picking fields defensively off an unversioned blob —
is a pure function with tests.

**Where a workspace lives now depends on the shell.** The side panel gets
`chrome.storage.local`, which browsers do not clear alongside ordinary site data;
the web app keeps `localStorage`. The panel reads its old `localStorage`
workspace once on first run so nobody opens it to a blank post, and never writes
back. The `storage` permission is back in the manifest, now that it is used.

**A workspace can leave the browser.** *Back up to a file* writes the whole
thing — every post, every saved snapshot, the custom palette — as pretty-printed
JSON; *Restore from a backup* reads it back through the same migration, so an
export from any older version still imports. This is the only route by which a
teacher's work survives a cleared cache or a reimaged school laptop, which is
what the zero-backend design costs and what this pays.

Two schema decisions worth keeping: `exportHistory` was being persisted and then
discarded on load, so it is simply not in the v1 schema; and blocks whose `type`
this build does not have are dropped on the way in rather than crashing
`blockMeta[b.type]` later.

Carried-forward bugs #5 and #7 are fixed. `core/ids.ts` mints every id,
monotonic and clock-seeded, so neither a template expansion inside one
millisecond nor a workspace restored from a machine with a fast clock can
collide. Deleting a block now selects its neighbour instead of re-selecting the
block it just removed.

**The lint baseline is gone — `npm run lint` is clean**, and it was not
suppressed. The `jsx-a11y` errors described a real dead end: block rows were
`<div onClick>`, so a keyboard user could edit a block's fields but never choose
which block. Rows are `<button>`s now, with the reorder controls as siblings
rather than nested inside them.

Tests: 55 → 63, covering the v0 and pre-split migrations, a serialize/parse round
trip, id uniqueness across 1000 mints in one tick, and an adapter facing storage
that is missing, corrupt, or throwing on quota.

Verified end to end in a browser rather than only in tests: a seeded v0 workspace
— fused `customStyle`, an `animation` field, an unknown block type, a stale
`exportHistory` — loads, renders with the right palette and surface, and is
written back as `version: 1` with all four of those handled.

## Phase 5 — publish

LICENSE, README with screenshots, semver, CHANGELOG, CI running lint + test +
build on both shells. State prominently, because for schools it's a feature:
**no data leaves the browser.**

## Later — motion

**Answered 2026-08-12: off in exported content, unconstrained in the composer UI.**
Not a preference — the probe closed it. `<style>` is stripped on all three
surfaces (R06, R38), so `@keyframes` has nowhere to live. SMIL survives on
bulletin and topic but not assignment (R39), so the same post would animate or
not depending on where it was published — and it cannot honour
`prefers-reduced-motion`, since that needs a `<style>` block too.

`<details>`/`<summary>` survives everywhere (R40) and is not motion. That is the
interaction primitive to build on; it is now a Phase 2 item.

The reasoning below is kept because it is what makes the verdict re-checkable if
a future Blackbaud release starts allowing style blocks.

**Two tiers, and only one of them is free.**

*The composer UI* is our own page with our own stylesheet, so animation there is
unconstrained: card hover states, block reorder transitions, panel slides,
copy-confirmation feedback. This is where "modern feel" is cheapest to buy and
nothing blocks it. Do it whenever.

*The exported HTML* is the hard part. **CSS animation cannot be expressed
inline** — a `style` attribute carries declarations, not at-rules, so `@keyframes`
has nowhere to live. Inline `transition` is inert without a state change to
trigger it, and `:hover` is a pseudo-class that also needs a stylesheet. So:

- If the `<style>` probe row **survives**, everything opens up — and it also means
  the entire inline-style architecture was optional, which is a much bigger
  finding than the animation question.
- If it **doesn't**, CSS animation in exported content is impossible. Not hard —
  impossible.

Three non-CSS channels survive that verdict, each its own probe row:

| Channel | Notes |
| --- | --- |
| Inline `<svg>` + SMIL `<animate>` | Markup, not CSS, so no stylesheet needed. Still supported in all major browsers despite the deprecated reputation. |
| `<details>` / `<summary>` | Native disclosure, zero CSS. The genuinely useful one — progressive disclosure for long study guides. |
| Animated GIF / WebP in `<img>` | Always works if images survive at all. |

**The accessibility catch.** `prefers-reduced-motion` is a media query, so it
needs a `<style>` block too. Animate via SMIL and you *cannot* honor a student's
reduced-motion setting. For a public school tool that is a real barrier, not a
nitpick — if `<style>` doesn't survive, motion in exported content should
probably stay off regardless of what SMIL makes technically possible. `<details>`
is exempt; it isn't motion.

## Reconciling the root spec

**Done in Phase 2.** The three 2026-08-09 files that sat one directory up —
a second, more elaborate plan v1 never mentions — are now
[style-guide-spec.md](style-guide-spec.md),
[style-guide-schema.json](style-guide-schema.json) and
[ap-english-literature-style-profile.json](ap-english-literature-style-profile.json).
One set of plans, one directory.

They were not dead: they described the `classProfile` token model Phase 2 needed
and got there first. §2's token vocabulary is the shape of `Profile`; its colour
tokens are `core/palettes.ts`; the AP English profile seeded
`core/profiles/editorial.ts`. The header note on the spec records what was
adopted and what was trimmed.

One correction to the instruction above: the schema did **not** become the
on-disk format for `core/profiles/`. Profiles are TS modules, as this plan's own
Structure section has them — a JSON loader would buy nothing a zero-backend tool
can use, and the type checker is worth more than a schema validator here. The
*token model* was adopted; the file format was not. What the app does export as
JSON is a class style — `{ palette, profile, fonts }` — which is the part a
teacher actually shares with a colleague.

Trimmed rather than implemented, as planned: `allowedChildren` / nested
components (the block model is deliberately flat) and `groupingRules`
(composition advice the composer has no way to enforce usefully). Also trimmed:
per-component `variants`, which is the same axis as profiles one level down, and
the spec's `compatibility` block, superseded by the *measured* `core/compat.ts`.

## Carried-forward bugs

Fixed by the phases above, listed so none get lost:

1. ~~**AI drafting silently degrades to Macbeth.**~~ **Fixed in Phase 3.**
   `generate()` posted to `/api/draft`, which only existed in the deleted
   Cloudflare build; the `catch` fell through to `localGenerate()`, which emitted
   hardcoded `MACBETH · ACT II` after scraping three regexes. Endpoint, fallback
   and the UI that offered them are all gone; the prompt and schema live in
   [ai-drafting.md](ai-drafting.md).
2. Compatibility panel is decorative — Phase 4.
3. ~~`safeRich()` diverges under SSR~~ — **moot since Phase 3.** No SSR left.
4. ~~`public/og.png` is 1.05 MB in the Pages artifact.~~ **Deleted in Phase 3**,
   along with the `og:image` tags that referenced it. Phase 5 owns what replaces
   them.
5. ~~Deleting the first block calls `setSelected(blocks[0]?.id)` against the
   pre-deletion array, re-selecting the block it just removed.~~ **Fixed in
   Phase 4.** It selects the neighbour that slid into its place.
6. ~~`document.execCommand` is deprecated.~~ **Wrapped in Phase 3** as `exec()`
   in `ui/richtext.tsx`, the only call site. Still deprecated, still fine — the
   sanitizer cleans up after it.
7. ~~Block ids come from `Date.now()` in some paths and `stamp + i` in others,
   which can collide.~~ **Fixed in Phase 4** — `nextId()` in `core/ids.ts`, and
   nothing else mints an id.

**All seven are closed.**

## Open

1. **Three names**: repo `blackbaud-styler`, app "Blackbaud Content Composer",
   package `blackbaud-content-composer`. Pick one before publishing.
2. **Someone else's trademark.** "Composer for Blackbaud" reads very differently
   from a name implying it *is* a Blackbaud product. Cheaper to decide now than
   after people bookmark it.
3. **Tenant variation.** Unknown until a second school runs the probe. Design
   `core/compat.ts` to be overridable rather than assuming one answer.
