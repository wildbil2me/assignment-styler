# Blackbaud compatibility

Measured 2026-08-12 with `docs/compat-probe.html` (41 rows measured; the kit now
carries 42 — see R42), analyzed with `docs/compat-analyzer.html`. Procedure: paste into the
HTML/source editor, save, switch to the visual editor, save again, reopen the
source editor, copy out.

**One tenant, three surfaces.** Everything here describes St John's Blackbaud
instance. Other schools should run the probe themselves — `core/compat.ts` is
designed to be overridden, not assumed.

## Headline

**Blackbaud is far more permissive than the prototype assumed.** 37 of 41 rows
survive on bulletin and topic; 35 on assignment. Four rows still need eyes (see
Outstanding).

Three findings change the plan:

1. **`<style>` blocks are stripped on every surface.** The inline-only
   architecture is confirmed necessary — not superstition. This also settles
   motion: CSS animation in exported content is impossible.
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
| R29 | consecutive `<br>` runs | *manual* | *manual* | *manual* |
| R30 | `<a href>` | survived | survived | survived |
| R31 | `target` / `rel` hardening | survived | survived | survived |
| R32 | `<span style="color">` | survived | survived | survived |
| R33 | emoji in a heading | *manual* | *manual* | *manual* |
| R34 | entities and `&nbsp;` | *manual* | *manual* | *manual* |
| R35 | divs nested three deep | survived | survived | survived |
| R36 | `<img>` with inline width | survived | survived | survived |
| R37 | **inline `<svg>`** | survived | survived | **stripped** |
| R38 | **`@keyframes` in `<style>`** | **stripped** | **stripped** | **stripped** |
| R39 | **SVG SMIL `<animate>`** | survived | survived | **stripped** |
| R40 | `<details>` / `<summary>` | survived | survived | survived |
| R41 | animated GIF | *manual* | *manual* | *manual* |
| R42 | `flex-wrap` on a flex row | *unmeasured* | *unmeasured* | *unmeasured* |

R42 was added by Phase 2, after the paste session — the renderer's half-width row
asks for `display:flex` so two cards reach equal heights, and flex without
wrapping overflows a phone instead of stacking. `core/compat.ts` currently
records it as true by inference (see below); the next probe run settles it.
Until then the renderer only emits the flex wrapper when the spec says so, and
falls back to the inline-block strategy when it does not, so a wrong inference
costs equal-height cards and nothing else.

### The only per-surface difference

**Assignment strips inline `<svg>`** (R37), and SMIL with it (R39). Bulletin and
topic keep both.

Note the workaround already sitting in the data: R36 passes an SVG as
`<img src="data:image/svg+xml;base64,…">` and it survives on *all three*
surfaces. So vector graphics are available everywhere — as data-URI images, not
as inline `<svg>`. If icons ever replace emoji, that is the route.

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

### Motion is settled: off

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

Five rows need a human. Two of them affect the chosen direction:

- **R42 flex-wrap** — added after the paste session; currently inferred rather
  than measured. Decides whether half-width cards reach equal heights.

- **R33 emoji in a heading** — soft cards uses emoji as its section markers. If
  they render as monochrome glyphs or boxes rather than colour, the direction
  needs different markers.
- **R34 entities and `&nbsp;`** — decides whether `esc()` output is stable, or
  double-escapes into visible `&amp;amp;` on a round trip.
- **R29 consecutive `<br>` runs** — the rich editor emits these constantly.
- **R41 animated GIF** — moot now that motion is off; answer it only out of
  curiosity.

Re-open the saved probe, look at those four rows, and record them in the
analyzer.
