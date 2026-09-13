# Blackbaud compatibility

Measured 2026-08-21 with the 50-row `docs/compat-probe.html`, analyzed with
`docs/compat-analyzer.html`. Procedure: paste into the
HTML/source editor, save, switch to the visual editor, save again, reopen the
source editor, copy out.

**One tenant, three surfaces.** Everything here describes St John's Blackbaud
instance. Other schools should run the probe themselves — `core/compat.ts` is
designed to be overridden, not assumed.

## Headline

**Blackbaud is far more permissive than the prototype assumed.** The current
results match across bulletin, topic, and assignment. Style blocks and CSS
keyframes are stripped as expected; strikethrough is normalized without visual
loss; R48 still needs reanalysis with the corrected multi-marker analyzer.

Three findings change the plan:

1. **Top-level `<style>` blocks are stripped on every measured surface.** The
   inline-only architecture remains necessary for ordinary HTML. Dedicated
   2026-08-22 probes found a bounded exception: a style nested inside inline
   SVG survives and executes within that SVG. See
   [SVG motion and interaction](svg-motion-reference.md).
2. **Everything soft cards is made of survives.** `border-radius`, `box-shadow`,
   `rgba()`, tinted fills, all three surfaces. The chosen direction ships as
   drawn. No degradation needed.
3. **`degrade()` shrinks from an architecture to a guard.** It was scoped for a
   hostile target. The target is permissive. See "What this changes" below.

## Results

| Row | Test | Bulletin | Topic | Assignment |
| --- | --- | --- | --- | --- |
| R01 | inline style on a div | survived | survived | survived |
| R02 | `border-radius` | survived | survived | survived |
| R03 | `box-shadow` | survived | survived | survived |
| R04 | tinted `background-color` | survived | survived | survived |
| R05 | `rgba()` colour values | survived | survived | survived |
| R06 | **`<style>` block with a class rule** | **stripped** | **stripped** | **stripped** |
| R07 | `inline-block` + `calc()` + `min-width` | survived | survived | survived |
| R08 | thick `border-left` accent bar | survived | survived | survived |
| R09 | `display:flex` | survived | survived | survived |
| R10 | `display:grid` | survived | survived | survived |
| R11 | two-column `<table>` | survived | survived | survived |
| R12 | `float:left` | survived | survived | survived |
| R13 | `max-width` + `margin:0 auto` | survived | survived | survived |
| R14 | `class` attribute | survived | survived | survived |
| R15 | `data-*` attribute | survived | survived | survived |
| R16 | `!important` inline | survived | survived | survived |
| R17 | `letter-spacing` | survived | survived | survived |
| R18 | `opacity` | survived | survived | survived |
| R19 | `linear-gradient` | survived | survived | survived |
| R20 | websafe `font-family` | survived | survived | survived |
| R21 | non-websafe `font-family` | survived | survived | survived |
| R22 | `font-size` / `line-height` | survived | survived | survived |
| R23 | `text-transform` | survived | survived | survived |
| R24 | `<h1>` | survived | survived | survived |
| R25 | `<h2>` / `<h3>` / `<h4>` | survived | survived | survived |
| R26 | `<blockquote>` | survived | survived | survived |
| R27 | `<ul>` + `list-style-type:none` | survived | survived | survived |
| R28 | `<ol>` | survived | survived | survived |
| R29 | consecutive `<br>` runs | survived | survived | survived |
| R30 | `<a href>` | survived | survived | survived |
| R31 | `target` / `rel` hardening | survived | survived | survived |
| R32 | `<span style="color">` | survived | survived | survived |
| R33 | emoji in a heading | survived | survived | survived |
| R34 | entities and `&nbsp;` | survived | survived | survived |
| R35 | divs nested three deep | survived | survived | survived |
| R36 | `<img>` with inline width | survived | survived | survived |
| R37 | inline `<svg>` | survived | survived | survived |
| R38 | **`@keyframes` in `<style>`** | **stripped** | **stripped** | **stripped** |
| R39 | SVG SMIL `<animate>` | survived | survived | survived |
| R40 | `<details>` / `<summary>` | survived | survived | survived |
| R41 | animated GIF | *manual* | *manual* | *manual* |
| R42 | `flex-wrap` on a flex row | survived | survived | survived |
| R43 | `<h2>` inside `<summary>` | survived | survived | survived |
| R44 | `<b>` bold text | survived | survived | survived |
| R45 | `<i>` italic text | survived | survived | survived |
| R46 | `<u>` underlined text | survived | survived | survived |
| R47 | `<strike>` struck text | rewritten to line-through span | rewritten to line-through span | rewritten to line-through span |
| R48 | `text-align` values | justify survived; reanalyze others | justify survived; reanalyze others | justify survived; reanalyze others |
| R49 | combined rich inline formatting | survived | survived | survived |
| R50 | list nested inside a rendered card | survived | survived | survived |

R42 confirms that the renderer's half-width flex row wraps on all three
surfaces. The inline-block declarations remain in the same markup as a fallback
for stricter, unmeasured tenants.

R43 confirms that Blackbaud preserves an `<h2>` inside `<summary>` on all three
surfaces. Measured tenants now receive that semantic heading; conservative
tenants retain the prior plain-summary fallback.

R44–R46, R49, and R50 survive unchanged. R47 is visually preserved but
Blackbaud rewrites `<strike>` to `<span style="text-decoration: line-through;">`;
the renderer and importer normalize to that measured form. The original
analyzer checked only R48d, so justify is confirmed while the other alignment
values await reanalysis with the corrected analyzer.

### No current per-surface difference

The 2026-08-21 run retained inline SVG and SMIL on Assignment as well as
Bulletin Board and Topic, unlike the 2026-08-12 baseline. Exported motion remains
disabled because it cannot honor reduced-motion preferences. Data-URI images
remain the more portable vector route for unmeasured tenants.

### Styles are re-serialized, not passed through

Not a row, but visible across every style verdict and worth recording. Compare
what was sent against what came back:

| Sent | Stored |
| --- | --- |
| `background-color:#E8F0FA` | `background-color: #e8f0fa` |
| `border-left:6px solid #C99700` | `border-left: 6px solid #C99700` |
| `font-family:Poppins,"Trebuchet MS",sans-serif` | `font-family: Poppins,'Trebuchet MS',sans-serif` |
| `background-color:rgba(36,59,83,0.12)` | `background-color: rgba(36,59,83,0.12)` |

Blackbaud parses each `style` attribute and re-emits it: a space after every
colon, standalone colour longhands lowercased, double quotes normalized to
single. Shorthand values and `rgba()` are preserved verbatim, including alpha.

**Blackbaud does not filter style properties at all.** This is the most useful
thing in the whole result set, and it took Phase 2 to notice: every declaration
sent came back, including `gap` and `grid-template-columns`, which no
sanitizer-with-an-allowlist would keep. All four failures in the table are
*elements* (`<style>`, inline `<svg>`), not properties.

So `core/compat.ts` carries `unlistedStyles: "allow"` for this tenant — a
property nobody probed is emitted, because denying it would invent a restriction
the measurement contradicts. The `conservative` spec, for a tenant nobody has
measured, sets `"deny"`: there, unmeasured is not permission. Without that
distinction the renderer silently drops any property the probe never named —
`border-top` on the editorial hero, for instance, which no row happened to
isolate even though `border-left` (R08) did.

**Nothing is semantically altered.** But three consequences follow:

- Byte-exact comparison against stored HTML will always differ. Goldens verify
  what we *emit*; they can never verify what Blackbaud *stored*. The analyzer's
  whitespace/case normalization is the right model for any future diffing.
- `import.ts` must tolerate reformatted styles on the way back in.
- `render.ts` should emit single quotes in `font-family`, so a round trip
  produces no gratuitous churn.

## What this changes

### degrade() is now a guard, not a layer

The plan scoped `degrade()` as property-level fallbacks — `box-shadow` to a
border, `flex` to `inline-block`, and so on. Against this tenant almost none of
that fires. What remains:

1. **Never emit `<style>`.** Structural, not a fallback — it is the reason the
   renderer inlines everything.
2. **No inline `<svg>`.** Use a data-URI `<img>` if vector art is ever needed.
3. **No CSS animation.** Nothing to degrade to; see below.

Keep the mechanism — it is what makes the tool portable to other schools, and
another tenant may well be stricter — but Phase 2 should not spend effort
building fallbacks nothing currently needs. Write the guard, keep the spec as
data, move on.

### Motion is bounded to self-contained SVG

> **2026-08-22 update:** The paragraphs below record the original conclusion
> from the broad compatibility run and are superseded for self-contained SVG.
> Dedicated probes confirmed SVG-nested CSS keyframes, SMIL, `<foreignObject>`,
> hover, focus, custom properties, and reduced-motion media queries. SVG styles
> do not escape to surrounding HTML, fragment-link controls are unsafe, and
> SMIL does not automatically honor CSS reduced-motion rules. See the complete
> [SVG motion and interaction reference](svg-motion-reference.md).

`<style>` is stripped, so `@keyframes` has nowhere to live and CSS animation is
impossible. SMIL survives on two of three surfaces, but:

- it is inconsistent across surfaces, so the same post would animate or not
  depending on where it was published, and
- `prefers-reduced-motion` is a media query, so it needs a `<style>` block too —
  meaning SMIL animation **cannot honour a student's reduced-motion setting**.

For a public school tool that settles it. No motion in exported content.

**`<details>`/`<summary>` survives on all three surfaces** and is not motion — it
is native disclosure with no CSS and no accessibility cost. That is the
interaction primitive worth building on, and it is genuinely useful for long
study guides. Worth promoting from a probe row to a block type.

Animation inside the composer UI remains unconstrained and unaffected.

### Half-width layout: flex, with the current trick as its own fallback

Both `display:flex` (R09) and the existing `inline-block` + `calc()` strategy
(R07) survive. Flex is worth taking, because soft cards has a visible defect
under inline-block: two cards of unequal content length have unequal heights.

Both can ship in one markup, no branching:

```html
<div style="display:flex;flex-wrap:wrap;gap:0;">
  <div style="display:inline-block;vertical-align:top;width:calc(50% - 16px);min-width:250px;margin-right:24px;">…</div>
  <div style="display:inline-block;vertical-align:top;width:calc(50% - 16px);min-width:250px;">…</div>
</div>
```

Where flex survives, the children blockify and stretch to equal heights. Where it
is stripped, they fall back to exactly today's inline-block behaviour. One markup,
both outcomes, and it is portable to a stricter tenant for free.

### Things now available that the prototype never used

All verified, none currently emitted: `opacity`, `linear-gradient`,
`text-transform`, `!important`, `<table>`, non-websafe `font-family` (the
declaration survives; whether it *renders* still depends on the student's
machine, so websafe stacks remain the right default), `<img>`, `<details>`.

`class` and `data-*` both survive, which means `data-layout` round-trips — the
importer's best structural signal is intact.

## Outstanding

Two narrow items remain:

- **R48 alignment variants** — the original analyzer reported only the last
  lettered marker, confirming justify but not independently reporting left,
  center, and right. The corrected analyzer now evaluates all four markers; the
  same stored HTML can be pasted into it again without rerunning the probe.
  **That capture is not in this repository**, so this is only closable by
  whoever still holds the 2026-08-21 output — or by one fresh paste through
  `docs/compat-probe.html`. Worth storing the next capture alongside this
  document so a reanalysis never depends on one machine again.
- **R41 animated GIF** — intentionally left unanswered because exported motion
  is disabled. It has no product impact.

R29's original instruction was also corrected: three consecutive `<br>`
elements produce two empty visual lines between the surrounding text lines, so
the observed result is a pass rather than a discrepancy.
