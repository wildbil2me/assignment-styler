# Rebuild plan: prototype → real project

Written 2026-08-11. Status: **not started.** Nothing in this plan has been
implemented; the repo is still the prototype described below.

Pick this up by reading "Decisions already made", then going to **Phase 0** — it
is the only phase that needs something other than this machine.

## Decisions already made

Settled 2026-08-11, so they don't need relitigating:

| Question | Decision | Consequence |
| --- | --- | --- |
| Audience | **Public / other schools** | Compatibility rules must be data, not constants. Output accessibility becomes compliance-adjacent, not cosmetic. Needs a license, docs, semver. |
| Form factor | **Both** — web app and extension | Forces a shared core that is UI-agnostic and server-free. This is roughly today's design and the reason it works at all. |
| AI drafting | **Future feature** | Removed for now, kept behind a seam. This is what makes "public" affordable: no backend, no per-user cost, no rate limiting, no abuse surface. |

Those three together mean the target is a **purely client-side, zero-backend
tool** — essentially free to publish, with no ongoing cost per user.

## What the prototype is

A compiler for a hostile paste target. Blackbaud's editors strip `<style>`
blocks, stylesheets, and class attributes, so surviving style must be inline on
every element. The app is a block composer whose output is email-style HTML you
paste into Blackbaud's source editor.

The domain model follows a teacher's mental model rather than a document model:
13 block types, six subject presets pairing colors and fonts, four Blackbaud
surfaces (bulletin 720px, topic 760, assignment 680, announcement 620).

Three builds render the same `app/page.tsx`: the vinext/Cloudflare build (the
only one with a server, so the only one with `/api/draft`), a static Vite build
deployed to GitHub Pages, and an MV3 side-panel extension.

## Salvage inventory

### Keep — domain knowledge, all data, cheap to move

- 13-type block taxonomy with labels and icons — [app/page.tsx:5](../app/page.tsx#L5), [:27-32](../app/page.tsx#L27-L32)
- Six subject presets, each a considered color + font pairing — [app/page.tsx:18-25](../app/page.tsx#L18-L25)
- Four surfaces with pixel widths and guidance notes — [app/page.tsx:11-16](../app/page.tsx#L11-L16)
- Five post templates — [app/page.tsx:34-41](../app/page.tsx#L34-L41)
- The AI instruction text and strict JSON schema — [app/api/draft/route.ts:14-16](../app/api/draft/route.ts#L14-L16). Preserve verbatim in `docs/ai-drafting.md`; the "do not invent dates, assignments, readings, or links" constraint is exactly right for school content.
- [app/globals.css](../app/globals.css) — 14KB of finished UI styling, independent of everything else. Keep if the look still appeals.

### Keep the logic, rewrite the form

All three must become pure and testable:

- **`renderHtml()`** — [app/page.tsx:88-100](../app/page.tsx#L88-L100). The inline-style compilation, and specifically `display:inline-block` + `width:calc(50% - 10px)` + `min-width:260px`, which achieves responsive stacking with no media query. This is the product.
- **`safeRich()`** — [app/page.tsx:54-68](../app/page.tsx#L54-L68). Allowlists 11 inline tags, unwraps everything else while keeping children, strips all attributes but `style`/`href`, drops non-`http(s)` hrefs, narrows surviving styles to `color` and `backgroundColor`.
- **`importExistingHtml()`** — [app/page.tsx:159-183](../app/page.tsx#L159-L183). The regex → block-type inference table is real heuristic knowledge.

### Delete

`app/chatgpt-auth.ts` (complete, careful, imported by nothing), `db/`,
`drizzle/`, `examples/`, `worker/`, `.openai/`, `tests/rendered-html.test.mjs`,
`public/og.png` (1.05 MB), and the vinext / Cloudflare / Drizzle / wrangler
dependency tree that goes with them. This is the majority of the repo's file
count and none of its value — all residue from the OpenAI "sites" starter
template this was scaffolded from.

## Proposed structure

Same repo. The prototype's history is worth keeping and the Pages deploy
workflow already works.

```
core/                    pure. no React, no DOM globals, no browser assumptions
  model.ts               Block, BlockType, StylePreset, Surface
  blocks.ts              the 13-type taxonomy
  presets.ts             6 subject styles
  surfaces.ts            4 surfaces + widths
  templates.ts           5 post templates
  sanitize.ts            rich-text allowlist
  render.ts              (blocks, preset, surface) -> html    <- the product
  import.ts              html -> blocks
  checks.ts              computed contrast + structure validation
  compat/spec.ts         Blackbaud rules as data, overridable per tenant
ui/                      shared React components
web/                     static site shell
ext/                     MV3 side-panel shell
tests/                   golden output, adversarial sanitizer, import fixtures
docs/
  blackbaud-compatibility.md   the spec + how it was measured
  ai-drafting.md               deferred design, prompt + schema preserved
```

**Add one dependency: an HTML parser** (`htmlparser2` or `parse5`). Today
`safeRich()` and `importExistingHtml()` both need `document`, which is what makes
them untestable and what causes the SSR divergence noted below. One small dep
that works in Node, browser, and any future worker beats an injected-parser
abstraction that only the tests would ever use.

## Phase 0 — measure Blackbaud

**Do this first.** Every correctness claim downstream inherits from it, it is the
one phase that cannot be done from the codebase, and the knowledge does not
currently exist anywhere in the repo. Today's renderer is sound email-HTML
instinct, but it is belief, not a verified contract — the same species of problem
as the fake `4/4` panel.

Output: `docs/blackbaud-compatibility.md`, recording for each row **survives
as-is / rewritten (how) / stripped**, per surface.

### The two process tests that matter most

More important than any single CSS property:

1. **Round-trip.** Paste → save → reopen the source editor. Does Blackbaud
   rewrite what you gave it? The importer's viability depends on this answer.
2. **Visual-editor round-trip.** Paste into source view, switch back to the
   WYSIWYG view *before* saving, then save. This is where editors classically
   mangle markup, and it is the likeliest way a teacher loses their formatting.

### Layout strategies

| Test | Why it matters |
| --- | --- |
| `display:inline-block` + `width:calc(50% - 10px)` + `min-width:260px` | **The current half-width strategy. Verify first.** |
| `display:flex` | Would simplify layout enormously if it survives |
| `display:grid` | Same |
| `<table>` two-column | The conservative fallback if inline-block fails |
| `float:left` | The older conservative fallback |
| `max-width` + `margin:0 auto` on a wrapper | The current outer container |

### Style delivery

| Test | Why it matters |
| --- | --- |
| inline `style` on div / p / h1 | Baseline assumption of the whole design |
| `<style>` block inside pasted HTML | If it survives, the entire inline strategy is unnecessary |
| `class` + external stylesheet | Expected to fail; confirm |
| `!important` in an inline style | Escape hatch if Blackbaud injects competing CSS |
| `data-*` attributes | **`renderHtml` emits `data-layout`. Verify it survives.** |

### Elements and properties

| Test | Why it matters |
| --- | --- |
| `background-color` on a div | Core to every non-hero block |
| `border-left:4px solid` | The accent bar; core to the visual identity |
| `<h1>`–`<h4>` | Preserved, or remapped to styled `<p>`? Affects heading-order validation |
| `<blockquote>` | The quote block |
| `<ul>` / `<ol>` with `list-style-type:none` | The checklist block renders `☐` with none |
| `<br>` runs | Line handling throughout |
| `<a href>` — plus `target` / `rel` | Resource block; also whether link hardening survives |
| `<span style="color">` | The sanitizer's allowlist depends on it |
| `font-family` naming a non-websafe font | Preset fonts are websafe; confirms whether that constraint is real |
| emoji in a heading | The block-icon feature |
| `&nbsp;` and entity handling | Whether `esc()` output is stable |
| nested divs 3+ deep | Wrapper + block + inner content |
| `<img>` with inline width | Not used today; decides whether images are ever viable |
| inline `<svg>` | Same |

### Suggested tool

Build `docs/compat-probe.html` — one document containing every row above, each
labeled in visible text (e.g. "ROW 12: blockquote"). Paste the probe into a
surface, look at what renders and what vanished, and the page reports its own
results. That makes Phase 0 repeatable, and shippable to other schools so they
can verify their own tenant rather than trusting yours.

## Phase 1 — extract the core, in two deliberate steps

**Step A (safe, doable now, needs no Blackbaud access).** Lift `renderHtml`,
`safeRich`, `importExistingHtml` and all the data tables into `core/`, with
golden tests locked to the **current** output. A pure refactor: zero intended
behavior change, and the tests prove it.

**Step B.** Apply Phase 0's corrections. Because the goldens were locked in step
A, every change to exported HTML shows up as an intentional, reviewable diff
instead of hiding inside a rewrite.

Doing these as one step is the main way this phase can go wrong.

## Phase 2 — two shells on the shared core

`web/` and `ext/` become thin. Delete the residue listed above and the
dependency tree with it. Keep the extension's current restraint: `sidePanel` and
`storage` permissions only, no host access, no content script — the clipboard is
the whole integration surface, and that is a genuine selling point.

## Phase 3 — make the assurances true

Replace the theatrical compatibility panel ([app/page.tsx:210](../app/page.tsx#L210) — hardcoded
`4/4` and four static ✓ rows; only the two half-width warnings are real) with
computed checks:

- WCAG contrast math: 4.5:1 body, 3:1 large text. The custom style editor lets
  users pick arbitrary colors, so this can currently be actively false.
- Heading-order validation.
- Per-surface warnings derived from `core/compat/spec.ts`.

The panel should report what it actually checked. For a public school tool this
is the difference between a feature and a false compliance claim.

Also fix the 15 baselined lint errors properly here — 12 jsx-a11y /
rules-of-hooks in `app/page.tsx`, 3 `'chrome' is not defined` in
`extension/background.js` — rather than carrying the baseline forward.

## Phase 4 — durable user data

No backend means a teacher's work lives in `localStorage` under `bcc-workspace`
and dies with a cleared cache. Needed:

- A versioned storage schema (`version: 1`) with a migration path.
- Whole-workspace JSON export/import, generalizing the style export that already
  exists at [app/page.tsx:157-158](../app/page.tsx#L157-L158).

## Phase 5 — public hygiene

LICENSE, a real README with screenshots, semver, CHANGELOG, and CI running lint +
tests + build. State prominently, because for schools it is a feature: **no data
leaves the browser.**

## Later — AI drafting

Slots in behind a `Drafter` interface. `docs/ai-drafting.md` preserves the prompt
and JSON schema so nothing is lost. Note that reintroducing it for a public
audience brings back everything deferring it removed: a hosted proxy, a shared
key, cost control, rate limiting.

## Known issues in the prototype

Carry these forward; several are already fixed by the plan above.

1. **AI drafting silently degrades to Macbeth.** [`generate()`](../app/page.tsx#L147) posts to
   `/api/draft` and falls back to [`localGenerate()`](../app/page.tsx#L134-L146) on `catch`. The Pages
   and extension builds have no server, so the fetch 404s and the fallback emits
   **hardcoded Macbeth blocks** after extracting only three regexes. A teacher
   writing about photosynthesis gets `MACBETH · ACT II`, with no indication the
   AI never ran. Resolved by deferring AI — but the fallback must go, not just
   the endpoint.
2. **The compatibility panel is decorative.** See Phase 3.
3. **`safeRich()` diverges on the server.** It early-returns `esc(value)` when
   `document` is undefined, so HTML in a block body renders as escaped visible
   markup during SSR and changes on hydration. Only affects the vinext target;
   resolved by the DOM-free parser.
4. `public/og.png` is 1.05 MB, shipped in the Pages artifact.
5. Deleting the first block calls `setSelected(blocks[0]?.id)` against the
   pre-deletion array, selecting the block it just removed and emptying the
   inspector — [app/page.tsx:208](../app/page.tsx#L208).
6. `document.execCommand` in the rich editor is deprecated, with no pleasant
   replacement. Probably keep; note it.
7. Block ids come from `Date.now()` in some paths and `stamp + i` in others,
   which can collide.

## Open questions

1. **Three names.** Repo `blackbaud-styler`, app "Blackbaud Content Composer",
   package `blackbaud-content-composer`. Pick one before publishing.
2. **Naming on someone else's trademark.** For a public release, "Composer for
   Blackbaud" reads very differently from a name implying it is a Blackbaud
   product. Not a blocker; cheaper to decide now than after people bookmark it.
3. **Tenant variation.** How much do other schools' Blackbaud instances differ?
   Unknown until someone else runs the Phase 0 probe. Design `compat/spec.ts` to
   be overridable rather than assuming one answer.
