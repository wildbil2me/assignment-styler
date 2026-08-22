# SVG motion and interaction in Blackbaud rich text

Measured 2026-08-22 in the current Blackbaud tenant with
`docs/animation-probe.html`. These findings are tenant evidence, not a guarantee
for every school or surface. Rerun the probe for new destinations.

## Executive summary

Blackbaud removes a top-level `<style>`, so ordinary pasted HTML cannot use
document-level keyframes. It does retain and execute a `<style>` nested inside
an inline `<svg>`. CSS, SMIL, and HTML inside `<foreignObject>` therefore form a
useful but sharply bounded platform for declarative learning objects.

- SVG CSS and `@keyframes` execute inside their owning SVG.
- SVG SMIL executes, including direct click triggers and chained timing.
- `<foreignObject>` HTML renders and can use the SVG stylesheet.
- SVG hover and keyboard focus work.
- SVG CSS does not animate ordinary HTML outside the SVG.
- Fragment links used as controls interfere with Blackbaud; do not use them.
- JavaScript, saved answers, grading, and persistent state are not established.

## Capability matrix

| Capability | Result | Boundary |
| --- | --- | --- |
| Top-level `<style>` | Unsupported | Removed on save. |
| Inline `animation-*` on HTML | Retained but inert | Keyframe definitions are removed. |
| SVG-nested `<style>` and keyframes | Confirmed visually | Applies within its SVG only. |
| SVG CSS controlling outside HTML | Unsupported | A02–A11 remained static. |
| CSS transforms and animation in SVG | Confirmed visually | Rotation, translation, colour, opacity, strokes, masks, text, and multiple animations were exercised. |
| SMIL `<animateTransform>` | Confirmed visually | Rotation worked after save. |
| SMIL `<animate>` | Confirmed visually | Direct `begin="click"` worked. |
| SMIL chaining | Confirmed visually | `begin="first-motion.end+0.2s"` worked after a direct first trigger. |
| `<animateMotion>` / `<mpath>` | Structurally retained | Elements and local reference survived. |
| `<foreignObject>` | Confirmed visually | Embedded HTML cards, wrapping, lists, and controls rendered. |
| CSS animation of embedded HTML | Confirmed visually | Animated card worked inside the SVG boundary. |
| SVG `:hover` | Confirmed visually | Shape/card emphasis worked. |
| SVG `:focus` and `tabindex="0"` | Confirmed visually | Keyboard focus styling worked. |
| Fragment links as state | Unsafe | Retained, but clicks disturbed Blackbaud behavior. |
| CSS custom properties | Confirmed visually | A variable supplied animation distance. |
| `@supports` | Retained and rendered | Conditional canary worked. |
| `prefers-reduced-motion` | Retained | Controls CSS, not SMIL automatically. |
| Responsive media queries | Retained | Condition follows the document viewport, not viewBox width. |
| `<symbol>` / `<use>` | Retained | Definitions and local references survived. |
| Gradients, masks, patterns, clipping | Retained | Definitions and `url(#id)` references survived. |
| SVG filter primitives | Retained | Blur and merge primitives survived. |
| 50 animated elements | Retained | This is a stress result, not a recommended budget. |
| JavaScript | Not established | Never emit scripts or event-handler attributes. |

## Execution boundary

This fails because the keyframes are removed:

```html
<style>@keyframes slide { to { transform:translateX(80px) } }</style>
<div style="animation:slide 2s infinite">Static after save</div>
```

Keep the stylesheet and targets in one SVG:

```html
<svg viewBox="0 0 120 40" width="120" role="img"
     aria-label="A blue square rotating">
  <style>
    @keyframes spin { to { transform:rotate(360deg) } }
    .spinner {
      transform-box:fill-box;
      transform-origin:center;
      animation:spin 1.8s linear infinite;
    }
    @media (prefers-reduced-motion:reduce) {
      .spinner { animation:none }
    }
  </style>
  <rect class="spinner" x="44" y="4" width="32" height="32"
        rx="5" fill="#4e66c5" />
</svg>
```

## Production-safe interaction

The preferred pattern is hover plus keyboard focus, with no link and no click
handler:

```html
<svg viewBox="0 0 320 100" width="100%">
  <style>
    .stage { opacity:.25; transition:opacity .2s }
    .stage:hover, .stage:focus { opacity:1 }
    .stage:focus { outline:none }
    @media (prefers-reduced-motion:reduce) {
      .stage { opacity:1; transition:none }
    }
  </style>
  <g class="stage" tabindex="0" role="group" aria-label="Subject: fox">
    <rect width="320" height="100" rx="8" fill="#eef2ff" />
    <text x="20" y="56">fox</text>
  </g>
</svg>
```

Pointer users hover; keyboard users tab into the stage. Clicking has no
navigation effect. This is the current pattern in both prototypes.

### Finite SMIL demonstrations

A direct click trigger works when the animation is a child of the clicked SVG
element:

```html
<circle cx="20" cy="20" r="12" fill="#e67e22">
  <animate attributeName="cx" from="20" to="100" dur="1s"
           begin="click" fill="freeze" restart="always" />
</circle>
```

Chaining also works:

```html
<rect x="10" y="10" width="20" height="8" fill="#4e66c5">
  <animate id="first" attributeName="x" from="10" to="100"
           dur="1s" begin="click" fill="freeze" />
</rect>
<rect x="10" y="28" width="20" height="8" fill="#187348">
  <animate attributeName="x" from="10" to="100"
           dur="1s" begin="first.end+0.2s" fill="freeze" />
</rect>
```

The failed F08 version used a circular event dependency. Keep the first trigger
direct and the timing graph one-way.

### Unsafe fragment controls

Do not use `<a href="#stage-two">`, `:target`, or dummy fragment links as UI
state. Blackbaud retained them, but clicking disturbed the host window.

## Rich HTML with `<foreignObject>`

```html
<svg viewBox="0 0 360 120" width="100%">
  <style>
    @keyframes drift { 50% { transform:translateX(24px) } }
    .card {
      width:190px; padding:10px; background:#eef2ff;
      border-left:5px solid #4e66c5;
      animation:drift 2s ease-in-out infinite;
    }
    @media (prefers-reduced-motion:reduce) {
      .card { animation:none }
    }
  </style>
  <foreignObject x="20" y="20" width="300" height="90">
    <div xmlns="http://www.w3.org/1999/xhtml" class="card">
      <strong>Rich HTML</strong> wraps naturally here.
    </div>
  </foreignObject>
</svg>
```

Use explicit dimensions; overflowing content can clip. Blackbaud rewrote
`<strong>` to `<b>` and `<em>` to `<i>` without observed visual loss.

## Accessibility requirements

Every production learning object should:

1. Give the SVG an appropriate role and reference `<title>` and `<desc>` with
   `aria-labelledby`.
2. Put a useful `aria-label` on every focusable stage.
3. Use `tabindex="0"` only when focus produces meaningful feedback.
4. Remain understandable with all motion disabled.
5. Include a local `prefers-reduced-motion` rule.
6. Use `viewBox`, `width="100%"`, and `height:auto` for responsive rendering.
7. Avoid rapid flashes and unnecessary perpetual motion.

`prefers-reduced-motion` stops CSS only. It does not automatically stop SMIL;
keep SMIL finite and user-triggered or provide an equivalent static state.

## Stored-HTML rewrites

Blackbaud parses and reserializes payloads. Observed rewrites include:

- spaces added after CSS colons;
- some colour values lowercased;
- SVG names displayed in lowercase (`foreignobject`, `animatetransform`,
  `fegaussianblur`, and others);
- camel-cased SVG attributes displayed in lowercase;
- `<strong>` rewritten to `<b>` and `<em>` to `<i>`;
- empty SVG elements expanded to closing-tag pairs.

Browsers reparsed the recognized SVG structures. Compare semantics, not exact
bytes or source casing.

## Performance guidance

The probe stored 50 independently animated elements and their negative delays.
That proves retention, not acceptable performance on every student device.

Prefer `transform` and `opacity`, animate a parent when independent movement is
unnecessary, keep demonstrations finite, and test on a representative student
Chromebook or phone. Treat the 50-element case as an upper stress canary rather
than a design target.

## What this can build

Good fits include process diagrams, sentence diagrams, finite worked examples,
label-and-reveal illustrations, timelines, plot arcs, concept maps, animated
charts with static meaning, visual choice boards, and rich HTML cards contained
in `<foreignObject>`.

Do not present these as graded or stateful activities. Without a confirmed
script, storage, or submission channel they cannot reliably save answers,
score responses, randomize questions, or report progress.

## Production checklist

- [ ] One SVG owns all CSS and animation targets.
- [ ] No top-level stylesheet dependency.
- [ ] No same-document fragment link used as a control.
- [ ] No script or inline event-handler attribute.
- [ ] Hover behavior has a keyboard-focus equivalent.
- [ ] Content remains meaningful with motion disabled.
- [ ] Local reduced-motion rule included.
- [ ] SMIL is finite and user-triggered when used.
- [ ] Accessible title, description, and focus labels included.
- [ ] Responsive rendering checked at narrow width.
- [ ] Saved, reopened visually, and saved again.
- [ ] Stored HTML inspected after the second save.
- [ ] Tested on each target surface and a student-class device.
- [ ] Scrolling remains smooth.

## Repository artifacts

- `docs/animation-probe.html` — capability and load probes.
- `docs/worked-example-prototype.html` — hover/focus algebra walkthrough.
- `docs/sentence-diagram-prototype.html` — hover/focus sentence diagram; safe
  payload marker is `sentence-diagram-v2`.
- `docs/blackbaud-compatibility.md` — broader compatibility record.

