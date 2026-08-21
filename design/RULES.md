# Educator suite — rule reference

<!-- GENERATED FILE. Do not edit.
     Source: style-guide.html · regenerate: node tools/generate.mjs
     The HTML is canonical: it holds the live specimens, the rationale, and the
     rendered palette. This file exists so an agent can load every rule at once
     instead of grepping tag soup. Where the two differ, the HTML wins and this
     file is stale. -->

**162 rules** — 132 MUST · 25 NEVER · 4 SHOULD · 1 MAY. Generated from `style-guide.html`.

Keywords are literal. **MUST** / **NEVER** have no app-level exception; **NEVER** is
not "prefer not to". **SHOULD** may be broken with a one-line comment naming the
reason. **MAY** is genuinely optional.

Values live in `tokens.json` (also generated). Live specimens, the measured contrast
table and the full rationale live in `style-guide.html` — open it in a browser when
you need to *see* a component, and link rules as `style-guide.html#FORM-05`.

## The five invariants

Every one of these looks like a bug to fix. They are not. Full reasoning at
`style-guide.html#arch`.

1. **No CSS custom properties** — literal values, every time (`ARCH-01`)
2. **No dark mode, anywhere** — the navy chrome *is* the light theme (`ARCH-02`)
3. **Responsive blocks last**, `pointer:coarse` → 1024 → 640 → portrait (`ARCH-03`)
4. **File platform: no build step, dependency, framework or ES module.** Bundled apps declare
   `<!-- conformance-platform bundled -->` and obey §19 (`ARCH-04`, `PLAT-01`)
5. **px, not rem** (`ARCH-07`)

## Index

- [0 · How to use this book](#0-how-to-use-this-book) — `style-guide.html#how`
- [1 · Palette](#1-palette) — `style-guide.html#palette`
- [2 · Semantic accents](#2-semantic-accents) — `style-guide.html#accents`
- [3 · Avatar palette](#3-avatar-palette) — `style-guide.html#avatars`
- [4 · Typography](#4-typography) — `style-guide.html#type`
- [5 · Shape, depth, spacing](#5-shape-depth-spacing) — `style-guide.html#shape`
- [6 · Layout & page skeleton](#6-layout-page-skeleton) — `style-guide.html#layout`
- [7 · Components](#7-components) — `style-guide.html#components`
- [8 · Motion](#8-motion) — `style-guide.html#motion`
- [9 · States](#9-states) — `style-guide.html#states`
- [10 · Responsive & touch](#10-responsive-touch) — `style-guide.html#touch`
- [11 · Accessibility](#11-accessibility) — `style-guide.html#a11y`
- [12 · Voice](#12-voice) — `style-guide.html#voice`
- [13 · Naming & code conventions](#13-naming-code-conventions) — `style-guide.html#code`
- [14 · The base layer](#14-the-base-layer) — `style-guide.html#base`
- [18 · Marketing surfaces](#18-marketing-surfaces) — `style-guide.html#marketing`
- [19 · Bundled application platform](#19-bundled-application-platform) — `style-guide.html#platform`

## 0 · How to use this book

<sub>`style-guide.html#how`</sub>

#### `ARCH-01` NEVER

Use a CSS custom property. Write every color, size and shadow out literally, every time.

> Hoisting the navy into `--navy` is not an improvement, it is a divergence: the whole suite would have to migrate at once or the apps stop being copy-paste compatible. This page practises what it documents — anything you copy out of it is already a literal value.

#### `ARCH-02` NEVER

Add a dark mode. No `prefers-color-scheme`, no `[data-theme]`, no dark variant of any element.

> The navy chrome **is** the light theme, not a dark skin of it. A second theme doubles every review and halves the odds that a fix travels.

#### `ARCH-03` MUST

Put the responsive blocks last, in this order: `(pointer: coarse)` → `1024px` → `640px` → `(orientation: portrait) and (max-width: 1024px)`.

> Load-bearing. The touch pass re-states base rules, so the width queries have to come after it to override them. See §10.

#### `ARCH-04` NEVER

Add a build step, a bundler, a framework, a runtime dependency or an ES module to the default **file platform**. A file may do so only after declaring the bundled platform under §19 and satisfying every bundled-platform rule.

> File-platform apps have to open and run from `file://` on a school iPad with no network and no install rights. Bundled delivery is a different, explicit contract, not an invisible exception to this one.

#### `ARCH-05` NEVER

Load a web font, an icon font, a sprite sheet or an image file for an icon.

> A network dependency on first paint, in a room where the network is the thing that fails. Icons are inline SVG (ICON-01), the favicon is an inline-SVG emoji data URI (BASE-02).

#### `ARCH-06` MUST

Keep class names identical across apps. Only the app name, the favicon emoji, the header subtitle and the storage prefix are app-specific.

> Shared names are the mechanism that lets a fix travel between sibling apps. Renaming `.class-action-btn` to something tidier costs the suite a portable fix and buys nothing.

#### `ARCH-07` MUST

Size in `px`. `ch` for a measure cap, `%`/`vw`/`vh` for layout, `env()` for insets. No `rem`, no `em`.

> Values have to be diffable across sibling apps by eye, and half the suite's sizes are half-pixel-sensitive (the 1.5px border, the 44px target). Browser zoom still scales `px`; only the OS font-size preference does not, which is why nothing in the UI goes below 9px and why the touch pass bumps every size.

#### `ARCH-08` NEVER

Write `!important`, except in `.hidden`, the reduced-motion block, and the `@media print` block.

> Those three have to beat every rule by design, and in each case the selector or the media type is itself the guard. Print especially: it hides elements whose `display` was set inline by script, so nothing weaker than `!important` reaches them, and a print rule cannot affect the screen. A fourth `!important` means a specificity problem that will be inherited by every app that lifts the file. **Corrected in edition 2** — this rule originally named only the first two, and three real apps disproved it.

#### `ARCH-09` MUST

Treat this file as canonical, and change it in the same commit as any intentional design change.

> A style book that lags the apps stops being consulted, and then it is just a file. If you cannot update the book, you are not ready to make the change.


## 1 · Palette

<sub>`style-guide.html#palette`</sub>

#### `COLOR-01` MUST

App header and full-screen chrome use the three-stop gradient `linear-gradient(135deg, #0d2137 0%, #1a3c5e 60%, #2a2a6e 100%)`. Modal headers use the two-stop variant `#0d2137 → #1a3c5e`.

> Two stops on a 56px-tall modal header; three on a full-width one. The difference is deliberate and it is how a modal reads as a child of the page rather than a second page.

#### `COLOR-08` MUST

Close the app header with `border-bottom: 2px solid #e67e22`.

> The gradient and this amber rule together **are** the suite's identity — it is the one element every educator app shares on every screen, and an app without it does not look like part of the suite. Three things about it read like mistakes and are not. **It is 2px, not 1.5px**: SHAPE-02 governs borders on light surfaces, and this is a chrome accent on a dark one — at 1.5px it reads as a rendering artifact under the header's shadow. **It is amber, and amber otherwise means "an event happened"** (ACCENT-04); this is exempt because it is permanent, and a marking that never changes cannot be read as a state. **It sits below the gradient, not above the shadow** — the shadow still falls on the content beneath it. It measures 3.98–5.72:1 against the navy above, so it reads as a deliberate accent rather than a seam.

#### `COLOR-05` MUST

On dark surfaces, build everything from white alpha, not a second set of hexes: text `#fff`, secondary `rgba(255,255,255,0.5–0.6)`, hints `rgba(255,255,255,0.45)`; control background `rgba(255,255,255,0.08)`, border `1.5px solid rgba(255,255,255,0.15–0.25)`, hover background `rgba(255,255,255,0.16–0.18)`.

> One control then works over any point of the gradient. A hex tuned to `#0d2137` is wrong by the time the gradient reaches `#2a2a6e`.

#### `COLOR-02` MUST

Take surfaces by role: page `#f0f2f5`, panel `#fff`, subdued card `#f8f9fc`, inset bar and row hover `#f8f9fb`.

#### `COLOR-03` MUST

Take text by role: `#1a1a2e` primary, `#687482` everything secondary (notes, hints, section labels, subtitles, table cells, empty states).

> Two text greys, not four. `#687482` is the floor for anything a teacher has to read.

#### `COLOR-04` MUST

Take lines by role: `#eef0f4` panel divider, `#f3f4f6` row hairline, `#e0e4ea` control and input border, `#e0e4f0` subdued-card border, `#d0d8e4` stronger hairline and input hover.

#### `COLOR-06` NEVER

Use `#8a9bb0` or `#a0aab8` for text a user has to read. `#8a9bb0` is decorative (2.84:1); `#a0aab8` is placeholder and disabled text only (2.35:1). Both fail WCAG AA at every size.

> Measured, not estimated — see §11's contrast table. A projector in a bright classroom is the worst display this suite runs on, and these two disappear on it first.

#### `COLOR-07` NEVER

Introduce a new grey or a new hue without adding it to this file in the same change.

> Four surfaces, two text greys, five line greys and six accents is the whole system. A panel with one grey reads flat and a panel with nine reads noisy — the count is the design.


## 2 · Semantic accents

<sub>`style-guide.html#accents`</sub>

#### `ACCENT-01` MUST

Treat a meaning as a set — strong, wash, tint, deep — and take all four from the same row above.

> The rule is the relationship between the four values, not any one of them. Mixing a green wash with a blue tint produces a chip that means nothing.

#### `ACCENT-02` MUST

Build chips, badges and secondary buttons as **wash background + deep text**, optionally with a 1.5px tint border.

#### `ACCENT-03` MUST

Reserve a solid strong fill for two things only: the active/selected state, and one primary action per surface.

> Break this and the screen loses its ability to say which thing is chosen — everything shouts at the same volume, which is the same as everything whispering.

#### `ACCENT-04` MUST

Keep the three "attention" accents apart: **amber** = an event that happened (tardy, late, retrying), **gold** = a standing condition (offline, no backup yet), **violet** = a mode you are in (presentation, read-only).

> A teacher glancing at the top of the screen needs to know instantly whether something happened, something is true, or something is switched on. Three accents, three questions. **These meanings govern content, not chrome** — the header's permanent amber identity rule (COLOR-08) is the one exception, and it is exempt precisely because it never changes. A marking that is always there cannot be mistaken for a state.

#### `ACCENT-05` NEVER

Add a seventh accent. Reach for a wash of an existing one first.

> Six meanings, each with four values, cover more ground than twelve hues do. A new hue is almost always a sign that two meanings should have been one.

#### `ACCENT-06` MUST

Use the **deep** tone for any text sitting on its own wash — never the strong tone.

> Measured: strong-on-wash runs 2.6–4.1:1 and fails AA at chip sizes; every deep tone clears 4.5:1 on its wash (§11). Every deep tone was already in the palette, so this costs nothing but a find-and-replace.

#### `ACCENT-07` MUST

Give the 9px warn badge no border tint; use neutral `#e0e4ea` if it needs an edge.

#### `ACCENT-08` NEVER

Put white text on solid `#27ae60`, `#e67e22` or `#c9a83f` (2.87, 2.85 and 2.29:1). Use the deep tone as the fill instead.


## 3 · Avatar palette

<sub>`style-guide.html#avatars`</sub>

#### `AVATAR-01` MUST

Assign the class by `id % 10` and never store it.

> Derived from the id, so a person keeps the same color on every screen with nothing to migrate and nothing to keep in sync.

#### `AVATAR-02` MUST

Set initials to white at weight 800.

> The two lightest tiles (`#d4ac0d`, `#0097a7`) are why 800 and not 600. Even so, treat initials as decoration: the row's name field is the accessible copy of that information, which is what AVATAR-03 depends on.

#### `AVATAR-03` NEVER

Let an avatar color mean anything. It is identity, not status.

> Four of the ten are also semantic accents. That is fine on a 32px circle of initials and it is not fine anywhere a color carries meaning — never let an avatar hue sit next to a status chip of the same hue and imply a relationship.

#### `AVATAR-04` MUST

Mark the avatar `aria-hidden="true"` when the name is already in the row.

> Otherwise every row announces two letters before the name it already contains.


## 4 · Typography

<sub>`style-guide.html#type`</sub>

#### `TYPE-01` MUST

Use `'Segoe UI', system-ui, sans-serif` everywhere. Content built to be pasted into an email uses `Arial, Helvetica, sans-serif` instead.

> Arial is what survives the trip through a mail client. No web font is ever loaded — see ARCH-05.

#### `TYPE-02` MUST

Declare `button, input, select, textarea { font-family: inherit; }` in the base layer.

> Form controls do not inherit the font on their own, and one missed input is a visibly foreign widget in the middle of a form.

#### `TYPE-03` MUST

Take sizes from the scale above. Nothing between 16px and 22px, nothing below 9px.

#### `TYPE-04` MUST

Carry hierarchy with weight, not size: 600 names and labels, 700 buttons and titles, 800 statistics and big numbers.

#### `TYPE-05` MUST

Set `font-variant-numeric: tabular-nums` on every timer, percentage, counter and column of figures.

> Without it a ticking clock jitters its own width and a column of percentages will not line up. Both are the kind of thing a teacher notices and nobody reports.

#### `TYPE-06` MUST

Use uppercase only for the 10px section label (700, `letter-spacing: 0.8px`, `#687482`) and the 9px micro-badge (700, `0.4px`).

> Uppercase anywhere else reads as shouting, and it costs a screen reader nothing but costs a dyslexic reader word shape.

#### `TYPE-07` SHOULD

Cap running prose at `max-width: 78ch`.

> The one place a relative unit is right: the measure has to track the font, not the viewport.

#### `TYPE-08` NEVER

Make something bigger to make it louder. Make it heavier, or give it a wash.

> This UI is dense on purpose — a roster of 34 students has to fit on one screen. Every point of type size is a row someone has to scroll for.


## 5 · Shape, depth, spacing

<sub>`style-guide.html#shape`</sub>

#### `SHAPE-01` MUST

Take radius from the ladder: 5 badge · 6 chip/tab · 7 button · 8 input · 10 card · 14 panel and modal · 16 hero · 20 pill · 50% avatar.

> Radius encodes size. A 14px radius on a 24px chip makes it look like a shrunken panel.

#### `SHAPE-02` MUST

Use `1.5px` for every border on a light surface, and `1px` only for hairline dividers between rows.

> The odd value in the whole system, and deliberate: at 1px these borders disappear on a retina iPad, at 2px they read as an error state. Hairlines stay 1px because they are meant to recede. **Two exceptions, and only two:** the header's 2px amber identity rule (COLOR-08), which is a chrome accent on a dark surface rather than a border on a light one; and the 2px `.spinner` ring, which is the indicator's body rather than the boundary of anything. If you are reconciling borders across a stylesheet, leave those two alone — `tools/conformance.mjs` knows about both and will flag any third.

#### `SHAPE-03` MUST

Use one of the four shadows below. There is no fifth.

#### `SHAPE-04` MUST

Set overlay scrims to `rgba(0,0,0,0.5)`, or `0.55` behind a hero modal.

> The jump between the four shadows is large on purpose: a panel barely lifts, a modal clearly floats. Four levels of "sort of floating" is no levels at all.

#### `SHAPE-05` MUST

Take spacing from the table above rather than inventing a value.

> Four steps — 4–8, 12–16, 20, 48 for empty states. Anything else is a value somebody will have to match by eye in the next app.

#### `SHAPE-06` MUST

Wrap the horizontal padding of every full-bleed row in `max(20px, env(safe-area-inset-left, 0px))`, and give `body` a `padding-bottom` of `env(safe-area-inset-bottom, 0px)`.

> A landscape iPad in a home-screen install puts the rounded corner and the home indicator over anything that assumes 0. The gradient still runs edge to edge; only the content is inset.


## 6 · Layout & page skeleton

<sub>`style-guide.html#layout`</sub>

#### `LAYOUT-01` MUST

Order the page: sticky header → banners in normal flow → one `main` → overlays last in the document.

> Overlays nested inside a panel inherit its `overflow: hidden` and get clipped. It looks like the modal failed to open.

#### `LAYOUT-02` MUST

Make `.main` a `max-width: 1300px` flex column, `margin: 0 auto`, 20px gutter, 20px gap.

#### `LAYOUT-03` MUST

Put all content in a `.panel`. A screen is a stack of panels and nothing else.

> Bare content directly on `#f0f2f5` reads as unfinished, and it is the first thing that gives away a screen somebody added in a hurry.

#### `LAYOUT-04` MUST

Follow the panel anatomy: `.panel-header` (a `.panel-title-row`, then an optional `.search-row`) → an optional `.date-batch-bar` inset toolbar → content rows or `.sg-section` blocks → or an `.empty-state`.

#### `LAYOUT-05` NEVER

Fix a banner to the viewport. Banners live in normal flow under the header, mode strip before caution.

> A fixed banner covers the first row of the list on a phone, which is exactly the row the teacher was reaching for.

#### `LAYOUT-06` MUST

Use the z-index ladder and nothing else: `80` header · `90` content banners · `999` loading · `1000` modals · `1001` setup screens · `1100` hero and toast. Nothing else in the app gets a `z-index` at all.

> Identical across the suite, so a stacking fix in one app is a stacking fix in all of them. The moment an app invents `z-index: 9999`, that portability is gone.

#### `LAYOUT-07` MUST

Have exactly one `h1` — the app name in the header. Panels and modals use `h2`. Do not skip levels below that.

#### `LAYOUT-08` MUST

Contain horizontal overflow inside its own scroller (`overflow-x: auto; -webkit-overflow-scrolling: touch`). The page body never scrolls sideways.

> A tab strip, a wide table and a code block each scroll themselves. A page that scrolls sideways loses the sticky header's left edge and looks broken.

#### `LAYOUT-09` MUST

Keep `.header-bottom` whole or drop it whole. An app with no tab concept keeps `.header-top` only.

> Thinning the nav row piecemeal is how two sibling apps end up with headers that are 4px different in height for no reason anyone can find later.


## 7 · Components

<sub>`style-guide.html#components`</sub>

#### `BTN-01` MUST

Use `.class-action-btn` for every ordinary button, with `.primary` / `.danger` for the two solid variants and `.archive` / `.restore` / `.delete` for hover-tinted ones.

> One class, three modifiers. A second button class is how a suite ends up with two buttons that are 1px different.

#### `BTN-02` MUST

Apply per-action accents **on hover only**. The resting row stays one visual family.

> In a row of five buttons the destructive one must never look like the other four — but colouring all five five ways is a row nobody can scan. So the resting state is one family and the color arrives when the pointer does.

#### `BTN-03` MUST

Show a disabled button as `opacity: 0.45` + `cursor: not-allowed`, and keep it in place.

> A control that vanishes is a control the user hunts for, and then asks you about. Disabled says "this exists and not right now"; absent says nothing at all.

#### `BTN-04` MUST

Have at most one `.primary` per surface — per panel, per modal, per banner.

#### `BTN-05` MUST

Use `.batch-btn` wash chips (`.p` present · `.a` absent · `.i` info · `.w` tardy) for batch actions in an inset toolbar.

#### `BTN-06` MUST

Add every new tappable class to **both** the grouped `touch-action: manipulation` selector in the base layer **and** the `(pointer: coarse)` block.

> Two places, one control. Miss the first and it keeps the 300ms tap delay and long-press text selection; miss the second and it stays a 24px target on an iPad.

#### `BTN-07` MUST

Give every icon-only button both `aria-label` and `title`.

> The label for a screen reader, the tooltip for a sighted user who cannot place the glyph. They are different audiences and both are real.

#### `BTN-08` MUST

Use a real `<button>`. Never a clickable `div` or a bare `<a>` with no `href`.

> You would be reimplementing Enter, Space, focus, and the accessibility role — and you would get one of the four wrong.

#### `TOGGLE-01` MUST

Give a **toggle** a _wash_ on-state — it is one of several independent switches. Give a **pill** a _solid_ on-state — exactly one of the row is chosen.

> The two grammars are the only thing that tells a user whether turning this one on turns another one off.

#### `TOGGLE-02` MUST

Keep `aria-pressed` in sync on both, and wrap a pill row in `role="group"` with an `aria-label`.

> Without it the row announces four unrelated buttons and never says which one is on.

#### `FORM-01` MUST

Stack a field as label (11px/700/`#687482`) → control → hint _or_ error, 5px gap, inside `.field`. Rows of fields are `.field-row` with a 12px gap and `flex: 1 1 220px` children.

> Labels beside controls stop lining up the moment one label wraps, and on a phone they eat half the width.

#### `FORM-02` MUST

Style controls as `1.5px solid #e0e4ea`, radius 8, 13px text, placeholder `#a0aab8`; hover border `#d0d8e4`, focus border `#5b6fcc` _in addition to_ the focus ring.

#### `FORM-03` MUST

Set every text control to `font-size: 16px` and `min-height: 44px` in the `(pointer: coarse)` block.

> Under 16px, iOS zooms the whole page on focus and does not zoom back. The teacher then taps the next field at the wrong coordinates.

#### `FORM-04` MUST

Show an invalid field as `.invalid`: border `#e74c3c`, background `#fdeaea`, and an error line in `#c0392b` that opens with a `✕` glyph. Wire it with `aria-invalid="true"` and `aria-describedby`.

> Three signals — border, wash, glyph — so the field is still obviously wrong in greyscale and still announced to a screen reader.

#### `FORM-05` NEVER

Use a placeholder as the label. Every control gets a real `<label for>`.

> A placeholder vanishes exactly when the user needs it — mid-typing, or when checking a half-filled form. It also fails at 2.35:1 (COLOR-06). The placeholder is for the _format_: "Last, First".

#### `FORM-06` MUST

Mark a required field with `required` on the control and an `aria-hidden` `*` in the label.

> The asterisk is for eyes, the attribute is for everything else. An asterisk announced as "star" in the middle of a label is noise.

#### `FORM-07` MUST

Put form actions bottom-right in a `.form-actions` row: primary last, cancel to its left. Enter submits; Escape cancels.

#### `FORM-08` SHOULD

Validate on blur and on submit — not on every keystroke.

> Validating as they type tells a teacher their half-typed name is wrong. Once a field _has_ an error, though, clear it as soon as the input becomes valid.

#### `FORM-09` MUST

Move focus to the first invalid field on a failed submit, and announce the failure through the live region (A11Y-05).

> A form that silently refuses to submit is indistinguishable from a broken button.

#### `LIST-01` MUST

Build a row as `9px 20px` padding, a `1px #f3f4f6` bottom hairline (none on the last), and a `#f8f9fb` hover.

#### `LIST-02` MUST

Order a row: avatar → `.row-main` (name 13px/600, sub 11px/`#687482`) → status badge → `.row-actions`, right-aligned and `flex-shrink: 0`.

> Actions that shrink are actions that end up 3px wide next to a long name.

#### `LIST-03` MUST

Mark a selected row twice: `#eef2ff` background _and_ `box-shadow: inset 3px 0 0 #5b6fcc`.

> The inset bar is the non-color signal. A pale wash alone is invisible on a projector and to anyone with a color vision deficiency.

#### `LIST-04` MUST

Truncate a name with `text-overflow: ellipsis` and carry the full value in a `title`. Never wrap a name onto a second line.

> A wrapped name changes the row height, and a roster of uneven rows cannot be scanned. Real names are longer than the mock data.

#### `LIST-05` MUST

Give every list an `.empty-state`.

> A panel that collapses to nothing when empty reads as a bug, and the user's next move is to reload and lose their place.

#### `LIST-06` MUST

Use a real `<table>` for tabular data, with 10px uppercase `#687482` `th`s, `1px #f3f4f6` row lines, and the whole thing inside an `overflow-x: auto` wrapper.

> A grid of divs loses row and column announcement, and a table without a wrapper takes the page sideways (LAYOUT-08).

#### `LIST-07` MUST

Right-align numeric columns and give them `tabular-nums` (TYPE-05).

#### `CHIP-01` MUST

Use the five badges — `.badge-ok` / `-info` / `-warn` / `-bad` / `-neutral` — at 9px/700 uppercase, wash + deep, radius 5, no border.

#### `CHIP-02` MUST

Give every status chip a glyph or a word as well as its wash: ⏳ ✓ ✕ ↻ ⚠.

> Around 8% of men have some form of color vision deficiency, and in a classroom the person reading the screen is often doing it over someone's shoulder, at an angle, on a projector, in daylight. Color is the redundant signal here, not the primary one.

#### `CHIP-03` MUST

Use the five save states and no others: `saving`, `saved`, `error`, `syncing`, `retry` — 11px/600 in a 10px-radius pill. A sixth, `queued`, exists only in an app with a real remote write queue.

> In a local-first app a write that has not landed has **failed**, not queued. Offering the softer word would be a lie the user acts on — they close the iPad.

#### `CHIP-04` MUST

Announce a save failure through the live region as well as showing the chip (A11Y-05).

> The chip lives in a corner nobody is looking at. That is fine for _saved_ and not fine for _failed_.

#### `CHIP-05` MUST

Build a stat tile as `.stat`: value 20px/800 with `tabular-nums`, label 10px/700 uppercase `#687482`, on the `#f8f9fc` subdued card.

#### `DARK-01` MUST

Invert the two navigation levels differently: a primary tab (`.cls-tab.active`) goes to near-black `#1a1a2e` with white text; a context tab (`.q-btn.active`) goes to white with `#1a3c5e` text.

> Two levels of navigation cannot both be the loudest thing in the bar. Make them the same and the header stops telling you where you are.

#### `DARK-02` MUST

Make an "add" affordance dashed and transparent (`.cls-tab-add`), never filled.

> Filled, it reads as a class named "+".

#### `DARK-03` MUST

Test on-dark controls against the gradient, not against white.

> On white they are invisible, which is why they are shown here on the surface they were designed for.

#### `MODAL-01` MUST

Size a modal `480px` / `max-width: 95vw`, radius 14, shadow `0 8px 32px rgba(0,0,0,0.25)`, entering with the 0.18s `srIn` animation, and head it with the **two-stop** gradient.

#### `MODAL-02` MUST

Let the overlay scroll (`overflow-y: auto`) and centre the panel with `margin: auto`, not with `align-items` alone.

> Centring a too-tall flex child clips its top edge with no way to scroll back to it. An iPad in landscape is 704px of usable height, which any modal with a form in it will pass.

#### `MODAL-03` MUST

Mark it up `role="dialog" aria-modal="true" aria-labelledby="…"`, pointing at the modal's own `h2`.

#### `MODAL-04` MUST

Close on Escape and on a backdrop click, and return focus to the element that opened it.

> Focus left on `body` sends the next Tab to the top of the page. The user's place in a 34-row roster is gone.

#### `MODAL-05` MUST

Move focus into the dialog on open, and trap Tab and Shift+Tab inside it while it is open.

#### `MODAL-06` NEVER

Stack a second modal over the first. Replace its contents instead.

> Two overlays means two scrims, two focus traps and one Escape key.

#### `ICON-01` MUST

Draw icons as inline SVG, feather-style, always `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"` with round caps and joins.

> `stroke="currentColor"` is what lets one icon sit in a white header button and a red delete button without a second copy of the path.

#### `ICON-02` MUST

Size icons 16×16 on desktop, 18×18 on touch.

#### `ICON-03` MUST

Mark every decorative SVG and every decorative emoji `aria-hidden="true"`.

> Otherwise a screen reader announces "memo" before your app's name, every single time it lands on the header.

#### `EMPTY-01` MUST

Build an empty state as 48px vertical padding, centred, `#687482` at 13px, saying what is missing _and_ what to do about it.

#### `LOAD-01` MUST

Use a `.skel` shimmer for content that is arriving, and a `.spinner` only for a wait that blocks the user.

> A skeleton says "this will be a list". A spinner says "stop". Using the spinner for both trains people to ignore it.

#### `LOAD-02` MUST

Keep the timings: shimmer `1.4s linear infinite`, spin `0.8s linear infinite`. Give the spinner `role="status"` and an `aria-label`.

#### `LOAD-03` NEVER

Show a blank white area while loading. Skeleton the panel frame that is coming.

> A blank panel and a broken panel look identical, and the teacher's next move is to reload and lose their unsaved row.

#### `BANNER-01` MUST

Use `.presentation-strip` (violet) for a _mode_ and `.backup-nag` (gold) for a _standing condition_. Neither is for an error that just happened.

> An error is transient and belongs in the save indicator or the field. A banner is for something that is still true — and will still be true after a reload (ACCENT-04).

#### `BANNER-02` MUST

Make the banner's button **solid**, not outlined.

> It is _the_ action, not a dismissal — there is no dismissing a mode, only leaving it. An outline button here reads as "close this message", which is the one thing it does not do.

#### `BANNER-03` MUST

Place banners in normal flow directly under the header, mode strip before caution, with `flex-wrap: wrap` so the text and the button stack on a phone instead of crushing (LAYOUT-05).


## 8 · Motion

<sub>`style-guide.html#motion`</sub>

#### `MOTION-01` MUST

Take durations from the table. Nothing exceeds `0.3s`, and `0.3s` is reserved for a collapse that moves the page.

#### `MOTION-02` MUST

Give every tappable control a press transform: `scale(0.95)` for buttons and chips, `scale(0.97)` for tiles and cards.

> On a touch screen there is no hover, so the press transform is the _only_ confirmation that the tap registered. Without it people tap twice.

#### `MOTION-03` SHOULD

Animate `transform` and `opacity` only.

> Both are composited. Everything else risks a janky frame on an older iPad — which is the device this suite is actually used on.

#### `MOTION-04` MUST

Honour `prefers-reduced-motion: reduce`: collapse transitions and entrances, keep looping indicators looping.

> A spinner that does not spin reads as a frozen app, so the reduced-motion block re-enables it at 1.2s and flattens the shimmer to a static wash. Copy the block from §14 — it is one of the three places `!important` is allowed (ARCH-08).

#### `MOTION-05` NEVER

Add an animation library, or animate anything on a schedule the user did not start.

> A library is a dependency (ARCH-04) and this suite has exactly four kinds of motion, all of them two lines of CSS. And motion the user did not trigger is motion they have to wait out — in a room where the bell has already gone.


## 9 · States

<sub>`style-guide.html#states`</sub>

#### `STATE-01` MUST

Give every interactive element all six states above. A control with no hover and no press reads as decoration.

#### `STATE-02` NEVER

Remove a focus outline, and never style bare `:focus`.

> If a starter template you are lifting from suppresses an outline — some do, on search inputs — **drop that rule rather than lift it**. A box that draws no focus affordance of its own leaves a keyboard user with no idea where they are.

#### `STATE-03` MUST

Declare exactly `:focus-visible { outline: 2px solid #5b6fcc; outline-offset: 2px; }` once, in the base layer.

> `:focus-visible` rather than `:focus` so a mouse click doesn't leave a ring behind but a Tab key does.

#### `STATE-04` MUST

Keep the visual state and the ARIA state in sync — `.active` with `aria-pressed`, `.invalid` with `aria-invalid`, `.hidden` with nothing else needed.

> `.hidden` uses `display: none`, which removes the element from the accessibility tree too. That is exactly why hiding with `visibility` or `opacity: 0` is wrong: it leaves a focusable ghost a keyboard user can Tab into.


## 10 · Responsive & touch

<sub>`style-guide.html#touch`</sub>

#### `TOUCH-01` MUST

Give every interactive control a 44px minimum target in the `(pointer: coarse)` block — `min-height` for text controls, 44×44 for icon buttons.

#### `TOUCH-02` MUST

Key the touch pass on `pointer: coarse`, not on a width, and declare it **before** the width queries.

> A 1024px iPad and a 1024px laptop need different targets at the same size. And the touch pass re-states base rules, so the width queries have to be able to override it.

#### `TOUCH-03` MUST

Ship the iOS integration scars without disabling browser zoom: a standard `width=device-width, initial-scale=1.0` viewport; `apple-mobile-web-app-capable`; `env(safe-area-inset-*)` on every full-bleed row; `overscroll-behavior-y: contain` on `body`; `-webkit-overflow-scrolling: touch` on every scroller; and `touch-action: manipulation; user-select: none` on every tappable class in one grouped selector at the top of the sheet.

> That last one is what removes the 300ms tap delay and stops a long-press from selecting a button's label — which on an iPad looks exactly like the app hanging.

#### `TOUCH-04` MUST

Set every text input to 16px on touch.

> Under 16px, iOS zooms the whole page on focus and does not zoom back.

#### `TOUCH-05` MUST

Make any hover-only affordance always-visible under `pointer: coarse`.

> There is no hover on a touch screen, so a row action that appears on hover simply does not exist there.

#### `TOUCH-06` NEVER

Rely on hover, long-press, or a swipe gesture to reach a function. Every action needs a visible, tappable control.

> Anything reachable only by gesture is unreachable by keyboard, by screen reader, and by the substitute teacher who has never seen the app.


## 11 · Accessibility

<sub>`style-guide.html#a11y`</sub>

#### `A11Y-01` MUST

Give every icon-only button both `aria-label` and `title` (BTN-07).

#### `A11Y-02` MUST

Put `aria-pressed` on toggles and pills, and wrap a filter row in `role="group"` with a label.

#### `A11Y-03` MUST

Hide text visually with the `.sr-only` utility, never with `display: none`, when it is meant to be read aloud.

> `display: none` removes it from the accessibility tree as well, which is the opposite of what you wanted.

#### `A11Y-04` MUST

Mark decorative emoji and SVG `aria-hidden="true"` (ICON-03).

#### `A11Y-05` MUST

Route every live announcement through **one** `announce()` helper into **one** `aria-live="polite"` region — never through the visual indicator.

> Two live regions race each other and the second message wins. Clear the region before writing to it, too: setting the same text twice announces nothing the second time.

#### `A11Y-06` NEVER

Let color be the only signal. Pair it with a glyph, a word, a border, or an inset bar.

> Around 8% of men have some form of color vision deficiency. Beyond that, this app gets read on a projector, at an angle, in daylight, over a shoulder — conditions where a pale wash is simply not there.

#### `A11Y-07` MUST

Make every function reachable by keyboard alone: Tab order follows the visual order, Enter and Space activate, Escape closes, focus is always visible and never lost to `body`.

#### `A11Y-08` MUST

Meet WCAG 2.2 AA contrast for anything a user reads: 4.5:1 for text under 18.5px (or under 14px bold), 3:1 above that and for the boundary of an interactive control.

> Almost every size in this suite counts as "normal text" for that rule — 11px bold is not "large". Use the table below rather than judging by eye.

#### `A11Y-09` MUST

Keep one `h1`, ordered headings under it, and a `<main>` landmark (LAYOUT-07).

#### `A11Y-10` MUST

Set `lang` on `<html>`, and set it on any element whose language differs — a Spanish family-facing note inside an English page.

> It picks the screen reader's voice. An English voice reading Spanish names is unintelligible, and family-facing content is where this suite most often mixes languages.


## 12 · Voice

<sub>`style-guide.html#voice`</sub>

#### `VOICE-01` MUST

Use sentence case everywhere, except the uppercase 10px section label and 9px badge.

> Title Case On Buttons reads as marketing. This is a tool.

#### `VOICE-02` MUST

Use emoji as functional signposts only — 📋 ⚠ 🚫 ✓ ↩ — in chrome and banners, never decorating body text.

#### `VOICE-03` MUST

Write an error as what happened, then what to do — in that order, one sentence each.

> "The bridge did not respond within 15 seconds. Check your connection and try again." Not "An error occurred." A message that does not end in an action the reader can take is a message that makes them find you instead.

#### `VOICE-04` NEVER

Use a softer word than the truth. A save that failed says _failed_.

> The cost of an accurate scary word is a moment of alarm. The cost of a reassuring inaccurate one is a term of work the user thought was safe.

#### `VOICE-05` NEVER

Blame the reader. Describe the value, not their mistake.

> "That date is outside the term" — not "you entered an invalid date". And drop "please": a tool that says please is a tool that is about to waste your time.

#### `VOICE-06` MUST

Write dates as `Mar 4` or `Mar 4, 2026` — never `3/4`. Times as `11:48 am`. Counts as digits, always ("1 student", not "one student").

> `3/4` is two different days depending on who is reading, and a school district is exactly the place where both readings are in the building.

#### `VOICE-07` MUST

Label a destructive confirmation with the verb and the object — "Delete 3 students" — never "OK"/"Yes".

> It is the last thing the user reads before the row is gone, and it is the only place the count appears.

#### `VOICE-08` MUST

Write about students the way you would if the student's family were reading over your shoulder, because at a conference they will be.

> Every field in these apps is discoverable. Neutral, factual, specific — "3 late arrivals this week", not "chronically late".


## 13 · Naming & code conventions

<sub>`style-guide.html#code`</sub>

#### `CODE-01` MUST

Name classes lowercase and hyphenated, keeping the suite's existing abbreviations (`cls-`, `hdr-`, `q-`, `av0`–`av9`). Do not "modernise" a name (ARCH-06).

#### `CODE-02` MUST

Prefix a document-only or app-only class so it can never collide — this book uses `sg-` for everything that belongs to the book rather than to an app.

> It is also how you strip this file to a starter template: one grep for `sg-`.

#### `CODE-03` MUST

Order the stylesheet: base → header → banners → layout/panel → controls → components → document chrome → **responsive last** (ARCH-03).

#### `CODE-04` MUST

On the default file platform, wrap page script in an IIFE with `'use strict'`, in a plain `<script>` tag. A declared bundled platform follows §19 instead.

> ES modules fail outright on a `file://` origin. Modern syntax inside the IIFE is fine; bundled apps may use modules because their declared delivery contract supplies the loader and build.

#### `CODE-05` MUST

Treat `navigator.clipboard` as the optional path and `document.execCommand('copy')` as the fallback, not the reverse.

> `navigator.clipboard` is unavailable over `file://`, which is exactly how these files get opened. Same shape of thinking for any modern API: check, then fall back, then tell the user what to do by hand.

#### `CODE-06` MUST

Give each app exactly one `localStorage` prefix, declared once at the top of the script, and namespace every key under it.

> Two apps served from the same origin share one storage area. An unprefixed key is a data-loss bug that only shows up on the machine where both are installed.

#### `CODE-07` SHOULD

Write comments that explain _why_ — the scar, the device, the failure that produced the rule. Not what the line does.

> Every non-obvious value in this suite exists because something broke on somebody's iPad. Record that, and the next person stops "cleaning it up".

#### `CODE-08` NEVER

Write inline `style` attributes in app code, except for a value that is genuinely computed at runtime.

> This document breaks that rule on purpose — its swatches carry their own hex in a `style` attribute so the specimen and the printed value cannot drift apart. That reason does not exist in an app.

#### `CODE-09` MUST

Cite the rule ID in a comment when a line exists only because of a rule, and in the commit message when a change is driven by one.

> Six months later, `/* ACCENT-06 */` next to a hex is the difference between a value somebody trusts and a value somebody "simplifies".


## 14 · The base layer

<sub>`style-guide.html#base`</sub>

#### `BASE-01` MUST

Paste the base layer above into a new app's stylesheet before anything else, unmodified.

> Or skip the pasting entirely: `starter-template.html` in the style-book repo is a working skeleton with this layer, the header, the panel, the row list, a form and a focus-trapping modal already wired. It scores 0/0 against `tools/conformance.mjs`, and it is _also_ the checker's false-positive fixture, so it cannot quietly rot.

#### `BASE-02` MUST

Ship the head block above, including the inline-SVG emoji favicon (ARCH-05).

#### `BASE-03` MUST

Change exactly four things per app: the app name in the header, the header subtitle, the favicon emoji, and the `localStorage` prefix. Everything else is suite furniture.

> If you find yourself changing a fifth thing, either it belongs in this book or the change is a divergence. Both of those are conversations, not commits.


## 18 · Marketing surfaces

<sub>`style-guide.html#marketing`</sub>

#### `MKTG-01` MUST

Confine everything in this section to a **marketing surface** — a landing or index page that no signed-in user works in. Never put display type, the large CTA or a feature tile on an app screen.

> The fence is the whole design. A landing page is read once by a stranger deciding whether to trust you; an app screen is read four hundred times by someone who already has, and every pixel it spends on emphasis is a row they have to scroll for. Unfenced, this section is just permission to make app screens bigger, which is the exact drift TYPE-08 was written to stop.

#### `MKTG-02` MUST

Take display sizes from the marketing ladder and no others: **40px** hero heading, **28px** section heading, both at weight 800, and a **16px** lead paragraph. Everything else on the page uses the §4 scale unchanged. On a phone the hero drops to 26px and the section heading to 22px.

> Both new sizes sit _above_ the §4 ladder's 22px top, so nothing new lands in the 16–22px gap TYPE-03 forbids and every value under 18px still matches an app screen exactly. This extends the ladder; it does not replace it.

#### `MKTG-03` MUST

Use `.cta-btn` for the page's call to action: radius 20, 15px/700, 14px 24px padding, 48px minimum target, solid `#5b6fcc`. Variants are `.secondary` on light, `.on-dark` and `.ghost-on-dark` on the hero band. **One primary _action_ per page**, not one primary button: repeating that same action at the foot of the page is right, and a second, different primary action never appears.

> This is a second button class and BTN-01 exists to prevent exactly that. The rule is kept where it earns its keep: inside an app the same button appears on thirty screens and two classes drift 1px apart within a year. A landing page has one action, on one surface, and it has to be findable at arm's length on a phone. Radius 20 is SHAPE-01's existing pill step, so the shape ladder gains nothing new.

#### `MKTG-04` MUST

Build a feature tile as `.feature`: a 36×36 radius-10 well filled with an accent's **wash**, its icon in that accent's **deep** tone at ICON-02's sizes, then a 15px/700 title and 13px `#687482` body. Take the well and the icon from the same accent set.

> Wash background plus deep foreground is the grammar of every chip and badge in the suite (ACCENT-02), just at tile scale — so a feature grid reads as this system enlarged rather than as a second design that happens to share a palette. Mixing sets across the grid is ACCENT-01's failure at a larger size.

#### `MKTG-05` MUST

Give a marketing surface **exactly one** dark band — the hero — using COLOR-01's three-stop gradient, directly beneath the header and its amber rule, with nothing between them. On-dark text and controls follow COLOR-05's white alpha.

> The gradient and the amber rule _are_ the suite's identity (COLOR-08); a landing page that opens on them is visibly the same product the teacher is one click from installing. A second dark band further down turns that identity into decoration, and it is also the first step toward the dark mode ARCH-02 forbids.

#### `MKTG-06` NEVER

Put a claim on a marketing surface that the app does not already do today. No roadmap feature in the present tense, no number you have not measured, no testimonial you did not receive.

> Every other voice rule in this book governs a screen the teacher reads _after_ they trusted you. VOICE-04 forbids a softer word than the truth for a failed save; the page that produced the install is held to the same standard, and it is the one surface where the temptation is structural rather than accidental. The cost of an accurate modest claim is a slower sign-up. The cost of an inaccurate one is a teacher who put a term of grades somewhere on the strength of it.

#### `MKTG-07` MUST

On a marketing surface, make the page's single `<h1>` the **hero headline**, not the wordmark. The wordmark in the header stays plain text.

> This is the one place LAYOUT-07 bends, and the count does not change — still exactly one `h1`, still ordered headings under it (A11Y-09). Inside an app the header names the thing you are working in and there is no other candidate for the `h1`. A marketing surface is read by someone who has not decided yet, and by two machines acting on their behalf: a search engine and a link preview. For all three the useful `h1` is what the page claims, not what the company is called. A screen reader user landing here gets "Less busywork. More teaching." instead of a domain they cannot yet place.

#### `MKTG-08` MUST

Declare a marketing surface in the file itself, with `<!-- conformance-surface marketing -->` in the head. Without it, `tools/conformance.mjs` reports every §18 class as a MKTG-01 violation.

> A fence nobody checks is a comment. §18 is the only visual-surface section that widens what is permitted, so it needs a guard — and the guard has to fail _closed_: a page is an app screen unless it says otherwise, because the failure that matters is §18 leaking into an app, never an app screen being mistaken for a landing page.


## 19 · Bundled application platform

<sub>`style-guide.html#platform`</sub>

#### `PLAT-01` MUST

Declare a bundled entry in that HTML file with the exact head comment `<!-- conformance-platform bundled -->`. An absent declaration means **file**; an unknown declaration fails closed.

> A build is a delivery boundary, not a detail a reviewer should infer. The marker makes the exception local, reviewable, and machine-checkable.

#### `PLAT-02` MAY

Use a build step, framework, runtime dependencies, imports, and ES modules only behind a valid bundled declaration. This is the complete exception to ARCH-04 and CODE-04; no other rule is implicitly relaxed.

#### `PLAT-03` NEVER

Load a remote runtime script, stylesheet, font, image, or essential UI asset.

> Bundling moves preparation earlier; it does not turn the classroom network into a runtime dependency. Installed output must keep working when that network fails.

#### `PLAT-04` MUST

Commit the package manifest and a supported dependency lockfile, declare `buildCommand` in `conformance.json`, and make a clean install reproduce the build.

> Without a lockfile, the same source can produce a different classroom app tomorrow, which makes review evidence and rollback unreliable.

#### `PLAT-05` MUST

Declare every supported delivery surface, its HTML entry, and its built output in `conformance.json`, then test each surface.

> A passing development shell does not prove an extension panel, embedded frame, or production route loads the same assets or renders the same landmarks.

#### `PLAT-06` MUST

Define separate **source** and **built** conformance scopes, with explicit include and exclude paths, and run both.

> Source review catches authoring regressions; built review catches transforms, omitted assets, and generated shells. Either alone leaves a predictable blind spot.

#### `PLAT-07` NEVER

Treat a bundled declaration as permission to use marketing-only classes or display rules.

> Platform and surface are independent axes. A bundled app screen remains an app screen unless it separately carries `<!-- conformance-surface marketing -->`.


---

<sub>Generated from `style-guide.html` by `tools/generate.mjs`. Verify freshness with `node tools/generate.mjs --check`.</sub>
