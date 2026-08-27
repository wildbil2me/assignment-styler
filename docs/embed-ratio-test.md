# Embed ratio test — what does 100% width actually mean?

Written 2026-08-27. **Status: instrument built, measurements not taken yet.**
Fill in the results table from a real tenant; until then every width in this
document is an assumption, including the ones already compiled into the app.

## The question

Blackbaud's embed box accepts an iframe block, and we want the iframe at 100%
width. An iframe at 100% width has no intrinsic height — nothing inside it can
push it taller, because the parent document never learns how tall the content
is. So a ratio has to be declared, and to declare one we need the number 100%
resolves to on each surface.

That number has never been measured. `core/surfaces.ts` carries three widths —
Bulletin Board 720, Topic 760, Assignment 680 — and they are **preview**
max-widths for the composer's paper, not measured container widths. Phase 0
measured what Blackbaud *keeps* (43 rows in
[blackbaud-compatibility.md](blackbaud-compatibility.md)); it never measured how
wide the column is. This test measures it.

Second question, and the one that decides whether a fixed ratio is even the
right answer: **does the embed box keep the height we declare?** If it rewrites
or clamps it, the ratio is not ours to choose.

## The instrument

`apps/web/public/embed-probe.html`, published with the web app:

```
https://wildbil2me.github.io/assignment-styler/embed-probe.html
```

It reports its own viewport — the box it was actually given — as width, height,
reduced ratio and the `padding-bottom` percentage, live as the window resizes.
It also reports what it was *asked* for, via query parameters, so it can say
whether the request was honoured:

| Parameter | Purpose |
| --- | --- |
| `label` | Names the case in the report line. Use `E1-bulletin`, `E4-topic`, and so on. |
| `h` | The height in px the snippet asked for. The probe compares it against the height it got. |
| `w` | The width the snippet asked for, for the record only. Percent-encode it: `w=100%25`. |

The **Copy record** button yields one markdown table row, already in the column
order of the results table below.

Three things are readable without scripts, which matters if the embed box
sandboxes the frame: the 100px ruler (read the last fully visible tick), the
dashed border (if you cannot see all four edges, the box is clipping or
scrolling), and the green END OF REPORT line at the bottom.

GitHub Pages sends no `X-Frame-Options` and no `frame-ancestors` policy, so it
is framable, and it is https, which an embed box on an https page will require.
The probe page is `noindex`.

### Check the instrument first

Open [embed-harness.html](embed-harness.html) locally — it frames the probe at
680, 720, 760, 360 and 100% width. Every reading must match the width in its
heading. If it does not, the probe is wrong and no Blackbaud reading is worth
taking. Two readings differ on `file://` and are expected: Storage reports
blocked, Parent document reports cross-origin.

## The cases

Paste each block into the embed box on one surface, save, view as a student
would, and copy the record. Six cases, each isolating one mechanism. Replace
`SURFACE` in every `label` with `bulletin`, `topic` or `assignment`.

### About the `&amp;` in these URLs

It is correct, and it is required. Inside an HTML attribute, `&amp;` *is* a
literal `&` — the parser decodes it before the request is made, so the browser
asks for `?label=E1-bulletin&w=100%25&h=450`. Paste the blocks below exactly as
they are wherever the field takes iframe markup.

Two exceptions and one failure mode:

- **E0 is a bare URL, not markup.** A field that takes a plain URL wants raw `&`.
- **`w=100%25`** is the percent-encoding of `w=100%`. Only cosmetic — `w` and
  `label` are recorded in the report and never measured. Only `h` is load-bearing.
- **Double-escaping.** If a sanitizer re-encodes the separators again, the src
  arrives as `&amp;amp;` and every parameter after the first becomes `amp;h`.
  The probe reads both spellings, so it still measures correctly, and it prints
  **Query string as received** so you can see exactly what arrived. If that line
  shows `&amp;`, the tenant is re-encoding — worth its own compatibility row.

**E0 — the URL alone.** Before pasting any markup, try pasting just the URL. If
the embed box accepts it and builds its own iframe, *its* wrapper decides the
ratio and E1–E6 are moot for that surface. Record what it produces.

```
https://wildbil2me.github.io/assignment-styler/embed-probe.html?label=E0-SURFACE&w=unknown
```

**E1 — height as an attribute.** The baseline. Attributes survive sanitizers
that strip style.

```html
<iframe src="https://wildbil2me.github.io/assignment-styler/embed-probe.html?label=E1-SURFACE&amp;w=100%25&amp;h=450" width="100%" height="450" title="Embed ratio probe"></iframe>
```

**E2 — height as an inline style.** Phase 0 proved inline style survives on a
`div` (R01). This asks whether it survives on an iframe.

```html
<iframe src="https://wildbil2me.github.io/assignment-styler/embed-probe.html?label=E2-SURFACE&amp;w=100%25&amp;h=450" style="width:100%;height:450px;border:0" title="Embed ratio probe"></iframe>
```

**E3 — `aspect-ratio`.** The one-line modern answer. If it survives, the ratio
is fixed at every width and no measurement of the column is needed to keep the
box from clipping.

```html
<iframe src="https://wildbil2me.github.io/assignment-styler/embed-probe.html?label=E3-SURFACE&amp;w=100%25" style="width:100%;aspect-ratio:16/9;border:0" title="Embed ratio probe"></iframe>
```

**E4 — the `padding-bottom` wrapper.** The pre-`aspect-ratio` bulletproof
version. It needs two elements and `position` on both, so it is the one most
likely to be taken apart by a sanitizer — and the fallback if E3 fails.

```html
<div style="position:relative;width:100%;padding-bottom:56.25%;height:0;overflow:hidden"><iframe src="https://wildbil2me.github.io/assignment-styler/embed-probe.html?label=E4-SURFACE&amp;w=100%25" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" title="Embed ratio probe"></iframe></div>
```

**E5 — a tall frame.** Does the box clamp a height taller than its own layout
expects, and does it give the embed its own scrollbar?

```html
<iframe src="https://wildbil2me.github.io/assignment-styler/embed-probe.html?label=E5-SURFACE&amp;w=100%25&amp;h=900" width="100%" height="900" title="Embed ratio probe"></iframe>
```

**E6 — no height declared.** The control. `150px` is the HTML default, meaning
nothing sized the frame; any other value is Blackbaud's own CSS sizing embeds,
which is worth knowing before fighting it.

```html
<iframe src="https://wildbil2me.github.io/assignment-styler/embed-probe.html?label=E6-SURFACE&amp;w=100%25" width="100%" title="Embed ratio probe"></iframe>
```

Take every reading twice per surface: once on a desktop browser at a normal
window size, once on a phone or a narrow window. A fixed px height means the
ratio changes with the viewport, so one reading cannot describe it.

## Results

Paste the copied rows here. One row per case per surface per viewport.

| Label | Asked width | Asked height | Measured width | Measured height | Ratio | padding-bottom | Height verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |

Then record, per surface:

| Surface | App assumes | Measured at desktop | Measured at phone | Fluid or fixed? |
| --- | --- | --- | --- | --- |
| Bulletin Board | 720px | | | |
| Topic | 760px | | | |
| Assignment | 680px | | | |

## How to read it

**If E3 or E4 survives** — use a declared ratio and stop. 16:9 by default, and
the column width becomes irrelevant to clipping: the frame is the same shape at
every viewport. Prefer E3 for its one line; keep E4 as the fallback for older
tenant browsers.

**If only E1 or E2 survives** — the height is a fixed px value while the width
is fluid, so *there is no single ratio*. The box is 16:9 at exactly one window
width and wrong either side of it. In that case the ratio question becomes a
height question: choose the height from the **narrowest** viewport the content
must survive, because that is where content is tallest and clipping starts.
Record the narrow measurement, not the desktop one.

**If E6 reports 150px and nothing else works** — the embed box is stripping
sizing, and an iframe at 100% width is not viable on that surface. Say so in
[blackbaud-compatibility.md](blackbaud-compatibility.md) as a new row rather
than working around it.

If a measured width contradicts `core/surfaces.ts`, correct the file in the same
commit that records the measurement, and expect the preview to move. Those three
numbers being unmeasured is the reason this test exists.

## What this does not decide

An iframe puts the content outside Blackbaud's sanitizer entirely, which means
every style survives — a much stronger guarantee than the 43 measured rows. It
also means the content is not in the page's DOM: it will not be searched, it
reads differently to a screen reader, it needs the network, and it depends on
our hosting staying up. That is a real architectural choice and it is not part
of this test. This test only answers what shape the box is.
