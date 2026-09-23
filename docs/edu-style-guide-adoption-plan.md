# Educator suite style-guide adoption plan

Written 2026-08-21 against `wildbil2me/edu-style-guide` edition 2, commit
`a5933e7`, and BaudStyler commit `766e653`.

## Implementation status

Implemented on `feat/edu-style-guide-adoption` on 2026-08-21 through Phase 5.
The authority actually vendored is the completed edition 3 bundled-platform
branch at `65bc4f5d3bbabd280724ee66f2c473f98cc9747a`, recorded with file hashes in
`design/upstream.json`.

- Phase 1 vendors the generated authority, declares both bundled shells, and
  runs source and built conformance in CI and Pages deployment.
- Phase 2 adds shared modal focus management, keyboard/menu behavior, touch
  targets, semantic state, polite announcements, and reduced-motion handling.
- Phase 3 migrates the application chrome to the suite palette, type, spacing,
  shape, depth, header, and responsive surface system.
- Phase 4 standardizes statuses, save language, loading and empty states,
  inline SVG controls, and component behavior across both shells.
- Phase 5 pins generated authority integrity, inventories the narrow computed
  exceptions, documents upgrades, and produces 0-violation/0-warning source
  and built conformance results.

The style-guide migration itself left exported HTML unchanged; workspace schema
remains version 1 and extension permissions remain unchanged. A subsequent
2026-08-21 Blackbaud probe deliberately updated the disclosure goldens and
strikethrough sanitizer snapshot based on newly measured behavior. Final browser
review captures and the real unpacked-extension handoff are recorded separately
from the automated implementation gates.

## Goal

Bring BaudStyler's educator-facing interface into the educator admin suite's
design system without weakening BaudStyler's two-shell architecture or changing
the HTML it exports to Blackbaud.

This is an application-chrome migration, not a content-profile migration. The
two style systems remain separate:

| System | Governs | Does not govern |
| --- | --- | --- |
| Educator suite style guide | BaudStyler header, panels, forms, buttons, modals, states, touch behavior, accessibility, motion and voice | The HTML copied into Blackbaud |
| BaudStyler profiles and palettes | Student-facing exported content and its Blackbaud compatibility degradation | The composer application's chrome |

`docs/style-guide-spec.md`, `core/profiles/` and `core/palettes.ts` keep their
current meaning. The suite book should be called the **admin UI style guide** in
BaudStyler documentation so the two are never confused.

## Decisions

These are settled for this implementation.

1. **BaudStyler joins the suite.** The admin UI style guide is authoritative for
   its application chrome, not merely inspiration.
2. **React, Vite, GitHub Pages and MV3 stay.** BaudStyler receives a narrowly
   fenced `bundled` platform in the upstream book. It is not rewritten as a
   single-file `file://` application.
3. **The exception is architectural, not visual.** The bundled platform may use
   a build step, dependencies, a framework and ES modules. It does not receive
   exceptions for colors, type, radii, focus, touch, motion, component states or
   voice.
4. **Exported HTML is out of scope.** `core/render.ts`, the three profiles, six
   palettes, templates, compatibility spec and golden HTML must remain
   byte-identical throughout the migration.
5. **The upstream book remains canonical.** BaudStyler vendors generated copies
   and never edits them locally. Upstream changes land and regenerate before a
   sync into BaudStyler.
6. **Both shells migrate together.** Shared UI changes land in `ui/`; the web
   composer and extension panel cannot develop separate design systems.
7. **No remote runtime assets.** The bundled exception does not permit web
   fonts, icon fonts, remote scripts or remote images. The built web app and
   installed extension must still work after their own files are available.
8. **Dynamic inline styles remain allowed.** The class-palette dot, live custom
   style specimen and preview width are genuinely runtime-computed values under
   `CODE-08`. Static visual values move to the stylesheet.
9. **All implementation work happens on fresh branches.** Neither repository's
   `main` branch receives in-progress adjustments. The plan itself may be merged
   separately; implementation begins only after clean branches are cut from the
   agreed baseline commits.
10. **Every phase must be locally viewable.** Automated checks do not replace
    running the web composer, loading the real unpacked extension, or reviewing
    the upstream style book's live specimens in a browser.

## Branch and local-review setup

Do this before Phase 0. Do not mix branch creation with the first design edit.

### Branches

Create one fresh branch in each repository from a clean, synchronized `main`:

| Repository | Branch | Starting point |
| --- | --- | --- |
| `wildbil2me/edu-style-guide` | `feat/bundled-app-platform` | `a5933e74913d75d546a936c30a9aed98d940a48c` |
| `wildbil2me/assignment-styler` | `feat/edu-style-guide-adoption` | `766e65320bb77cdacef39e1cf944bc1f092a0f16` |

Before branching, require `git status --short` to be empty and fetch the remote
so the branch point is not silently stale. Push the branches normally for
backup and CI, but do not open a release/tag or merge either branch until its
phase gates pass.

The two branches have an order dependency: BaudStyler may begin baseline and
accessibility preparation locally, but it must not vendor the book or claim
conformance until the upstream bundled-platform branch is complete and its
generated files are current. Record the exact upstream commit vendored by
BaudStyler in `design/`.

### Preserve a comparison baseline

Before the first UI edit:

1. Run the complete BaudStyler gate and record the commit and results.
2. Build both shells from the branch point.
3. Capture baseline images into ignored `work/visual-baseline/` at:
   - web composer: 1600×1000;
   - web composer: 1024×768;
   - web composer with coarse pointer/mobile layout: 390×844;
   - extension panel: 440×1000;
   - both current dialogs at a desktop and narrow viewport.
4. Save an exported workspace backup and representative copied HTML in the
   ignored baseline directory. The committed golden suite remains the
   authoritative byte-level export contract; these files make manual behavior
   comparison easier.
5. Keep the existing `main` checkout or a read-only worktree available for
   side-by-side comparison. Never edit the baseline checkout.

### Local viewing loop

Use two terminals from the BaudStyler implementation branch:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
npm run dev:ext -- --host 127.0.0.1 --port 5174
```

Review the full composer at
`http://127.0.0.1:5173/assignment-styler/`. The second server is useful for quick
responsive inspection of the panel UI, but it is not a substitute for an
extension-origin test: it does not prove MV3 packaging, service-worker behavior,
permissions or `chrome.storage.local`.

For the real extension loop:

```bash
npm run build:ext
```

Load `extension-dist/` through **Load unpacked** in Chrome or Edge, pin
BaudStyler, open its side panel, and use the browser's **Reload extension**
control after each rebuild. Test storage restoration, clipboard copy and panel
reopening from the installed extension, not only from port 5174.

View upstream changes by opening `style-guide.html` directly from the
`edu-style-guide` branch. Because the book is deliberately self-contained, the
canonical specimens must continue to work over `file://`; no local server may
be required to inspect them. Run its generator and fixture checks alongside
visual inspection.

### Required local review matrix

Each BaudStyler phase ends with this matrix before its commit is considered
ready:

| Area | Local review |
| --- | --- |
| Full web composer | Chrome or Edge at 1600×1000 and 1024×768 |
| Narrow/mobile web | 390×844, keyboard navigation, 200% zoom and coarse-pointer emulation |
| Extension | Real unpacked MV3 side panel at its natural width; close/reopen and browser restart persistence |
| Dialogs and menus | Mouse, keyboard-only, Escape, focus trap and focus restoration |
| Export | Copy into a scratch HTML document, compare bytes through tests, and visually inspect desktop/mobile preview |
| Reduced motion | OS/browser reduced-motion emulation enabled and disabled |
| Style book | Canonical `file://` specimens plus generated rules/tokens freshness |

Store phase review captures in ignored `work/visual-review/phase-N/`. Only the
final approved screenshots replace committed README/social assets. A visual
diff is expected during the suite migration; an unexplained functional or
export diff blocks the phase.

### Phase 0 implementation record

Phase 0 was completed on 2026-08-21 on the upstream
`feat/bundled-app-platform` branch at commit
`65bc4f5d3bbabd280724ee66f2c473f98cc9747a` and pushed to
`origin/feat/bundled-app-platform`.

The completion gate covered generated-file freshness, the 0/0 file-platform
starter, 0/0 bundled source and built scopes, fail-closed platform and marketing
negative fixtures, all 24 seeded drift violations, sync of the checker and
schema into a temporary consumer, and DOM/rule-ledger integrity for all 162
rules. Phase 1 must vendor this exact commit unless a later reviewed upstream
commit supersedes it.

## Baseline

The pre-Phase 0 upstream checker saw only `apps/*/index.html` and
`ui/styles.css`. With generated output, dependencies, tests, docs and exported
content excluded, it reports:

- 31 violations: `ARCH-08` ×15, `ARCH-01` ×6, `LAYOUT-06` ×4,
  `STATE-02` ×3, `ARCH-04` ×2 and `TOUCH-01` ×1;
- 135 warnings, mostly off-palette colors plus static-HTML false positives;
- 1 stale result because the book is not vendored.

That count is a migration baseline, not an acceptance result. The pre-Phase 0
checker could not see React-rendered `<main>` and headings, so its
missing-landmark warnings were false positives. Conversely, it could not fully inspect TSX for
labels, ARIA state, dialog focus or dynamic inline styles, so a low count would
not prove conformance. Phase 0 replaces those limitations with configured
TS/TSX and per-entry semantic scanning.

The audit also found real issues that should be fixed before visual restyling:

- three `outline:none` rules and no global `:focus-visible` replacement;
- no `(pointer: coarse)` pass, 44px touch targets or always-visible touch
  actions;
- no `prefers-reduced-motion` handling for composer transitions;
- icon-only controls with `aria-label` but no `title`;
- dialogs with no Escape behavior, initial focus, focus trap or focus restore;
- selected controls whose `.active` state is not consistently paired with an
  ARIA state;
- many readable labels below the guide's own contrast floor.

## Phase 0 — correct and fence the upstream authority

Do this on `feat/bundled-app-platform` in `edu-style-guide` first. BaudStyler
should not vendor a book known to contradict itself.

### 0a. Resolve the two accessibility contradictions

1. Remove `maximum-scale=1.0` from `TOUCH-03`, the base head specimen, starter
   template and conformance warning. User zoom must not be constrained by a
   guide that requires WCAG 2.2 AA. Keep the other iOS provisions: safe areas,
   coarse-pointer targets, 16px touch inputs, contained overscroll and touch
   manipulation.
2. Replace secondary text `#6b7a8d`, measured at 4.38:1 on white, with a token
   that clears 4.5:1. Use `#687482` as the initial candidate; BaudStyler's
   contrast implementation measures it at 4.76:1. Recompute every contrast row
   and regenerate all specimens rather than editing the generated table.
3. Remove the secondary-text item from `contrast.acceptedDebt`. A core readable
   text token cannot be both mandatory and accepted below the mandatory floor.
   Decorative and disabled tokens may remain explicitly non-text.

### 0b. Add a bundled application platform

Add a new canonical section with stable rule IDs, live declaration examples and
rationale. Use a fail-closed declaration in each HTML entry point:

```html
<!-- conformance-platform bundled -->
```

The default remains `file`; an absent or unknown declaration never grants the
exception. The bundled platform changes only these rules:

- `ARCH-04`: permits a build step, framework, runtime dependencies and ES
  modules when declared `bundled`;
- `CODE-04`: permits module entry points and compiled chunks for `bundled`;
- the `file://` requirement becomes platform-specific rather than a global
  invariant.

Add bundled-platform requirements alongside the exception:

- production output contains no remote runtime dependency;
- dependency and build artifacts are reproducible from the lockfile;
- the app declares and tests its supported delivery surfaces;
- source and built output receive separate conformance scopes;
- platform permission never implies a marketing-surface permission.

Represent platform invariants structurally in `tokens.json`, for example
`platform.file` and `platform.bundled`, rather than changing
`invariants.buildStep` from one misleading boolean to another.

### 0c. Teach the tooling about modern source trees

Extend `tools/conformance.mjs` and its fixtures:

1. Read `<!-- conformance-platform bundled -->` from each app entry point.
2. Suppress only the two platform-gated module/build findings for declared
   bundled entries.
3. Add TS/TSX to semantic scanning for JSX attributes, headings, landmarks,
   icon-only controls and static `style={{...}}` values.
4. Do not report a missing `<main>` or `<h1>` solely from a root HTML shell when
   the configured React entry renders it; report against the rendered/source
   component instead.
5. Add a configuration file for multi-shell apps, with explicit included UI
   paths, entry points and excluded product-output paths. For BaudStyler the
   exclusions include `core/`, `tests/golden/`, `docs/compat-*.html`,
   `pages-dist/` and `extension-dist/`.
6. Extend the true-positive fixture with a bundled app that lacks the platform
   declaration, and the false-positive fixture with a correctly declared
   bundled React-shaped source tree.
7. Keep all existing file-platform fixtures at 0/0; the new platform must not
   weaken their rules.

Extend `tools/sync.mjs` to vendor the checker and its configuration schema with
the canonical HTML, `RULES.md` and `tokens.json`. CI in a consuming repository
must not depend on a sibling clone being present.

### Phase 0 gate

- `node tools/generate.mjs --check` passes.
- The starter template remains 0 violations / 0 warnings.
- The drifted fixture still produces at least its seeded violation count.
- New bundled positive and negative fixtures pass their assertions.
- The book contains no readable text pair below 4.5:1 and no viewport zoom
  restriction.

## Phase 1 — vendor the book and lock BaudStyler's boundaries

All BaudStyler work from this point lands on `feat/edu-style-guide-adoption`.

1. Sync the upstream book into `design/`: canonical HTML, generated rules,
   tokens, conformance checker and schema/config support.
2. Add a short root guidance pointer explaining that `design/style-guide.html`
   governs admin UI while `docs/style-guide-spec.md` governs exported content.
3. Add `design/conformance.json` with both shells, shared `ui/` sources and the
   exclusions above.
4. Add `npm run design:check`; run it in `.github/workflows/ci.yml` and before
   Pages deployment.
5. Add the bundled-platform declaration to both shell entry points.
6. Record the upstream edition and source commit in the vendored metadata so a
   stale copy is actionable.

Use the images already captured under **Preserve a comparison baseline**. The
existing README captures are release documentation, not immutable product
goldens; retain the pre-migration images in ignored review storage until the
implementation is accepted.

Add a gate that asserts the 13 exported HTML goldens are unchanged. Phase 1 is
not complete if vendoring, configuration or a CSS reorganization changes a
single rendered export byte.

## Phase 2 — accessibility and interaction first

Land the non-negotiable behavioral fixes before the broad visual diff.

### Focus and keyboard

- Add the guide's single global `:focus-visible` rule and remove every
  `outline:none` declaration.
- Ensure the editable rich-text region gets the same visible focus treatment.
- Give every icon-only control both `aria-label` and `title`; mark decorative
  glyphs and emoji `aria-hidden`.
- Pair visual selection with `aria-pressed` or the correct tab semantics for
  device, width, icon, surface and visibility controls.
- Make post menus close on Escape and return focus to their trigger.
- Implement a shared dialog primitive: initial focus, Tab/Shift+Tab trap,
  Escape close, backdrop close, and focus restoration. Both current dialogs use
  it; a second stacked dialog remains impossible.
- Add exactly one polite live region and one `announce()` path for copy,
  import/restore and other asynchronous completion messages.
- Verify one rendered `<h1>`, ordered headings and one `<main>` in each shell.

### Touch and responsive behavior

- Add the coarse-pointer block before width queries.
- Give interactive controls a 44px target and inputs a 16px touch font size.
- Make reorder, duplicate and other hover-revealed actions visible on coarse
  pointers.
- Add safe-area padding to full-bleed header and sticky export rows, contained
  overscroll to the document and momentum scrolling to panels.
- Group tappable selectors under `touch-action:manipulation` and prevent label
  selection only where the control itself remains usable.
- Keep user zoom enabled.

### Motion

- Use only the guide's duration ladder and transform/opacity animations.
- Add press feedback for buttons, chips and selectable rows.
- Add the canonical reduced-motion block. This governs the composer UI only;
  exported content remains motion-free because Blackbaud strips its style
  blocks.

### Phase 2 gate

- Keyboard-only smoke test covers opening, editing, reordering, copying,
  backing up and both dialogs.
- At 200% browser zoom no function or content becomes unreachable.
- Coarse-pointer emulation exposes all actions and prevents iOS input zoom.
- Automated lint, TypeScript, core/probe tests and both builds remain green.
- Exported HTML goldens remain byte-identical.

## Phase 3 — migrate the suite identity and tokens

Restyle the application in controlled layers. Do not mix token migration with
component restructuring in one unreviewable stylesheet rewrite.

### 3a. Base, palette and type

- Replace the six CSS custom properties with literal canonical values
  (`ARCH-01`). Dynamic class-content colors stay in React inline styles because
  they are user data, not chrome tokens.
- Replace near-match greys and hues by role: page, panel, subdued card, inset,
  readable secondary text, control border and semantic accent families.
- Use `'Segoe UI', system-ui, sans-serif` for app chrome. Remove the unserved
  `Inter` request and Georgia from chrome; profile-selected fonts remain inside
  the content preview and exported document.
- Move text onto the guide's size and weight ladders, retaining uppercase only
  for 10px section labels and 9px badges.
- Reorder `ui/styles.css` to base → header → banners → layout/panels → controls →
  components → BaudStyler preview chrome → responsive blocks.

### 3b. Suite header and surfaces

- Replace the white web header with the canonical three-stop navy gradient,
  amber 2px identity rule and header shadow.
- Build the extension's compact header from the same identity tokens without
  pretending its 440px side panel is a desktop page.
- Keep the BaudStyler name and “for Blackbaud” subtitle as the permitted
  per-app identity fields.
- Use the page, panel, inset and divider roles consistently across the rail,
  stage, inspector and quick-post shell.
- Preserve BaudStyler's functional three-column desktop layout as an
  app-prefixed layout. The suite controls its tokens and behavior; it does not
  remove the preview column the product requires.

### 3c. Shape, depth and layering

- Replace off-ladder 4px and 12px radii with the documented badge/button/input/
  card/panel/modal steps.
- Use 1.5px boundaries for controls on light surfaces and canonical hairlines
  for dividers.
- Replace bespoke shadows with panel, header, modal and selected-row shadows.
- Move all four z-index values onto named ladder roles: sticky header,
  popover/banner, modal and transient overlay. Document which role each layer
  occupies rather than choosing the nearest number.
- Remove all non-permitted `!important` declarations by fixing selector
  ownership and ordering. The preview's runtime inline styles are not a reason
  for app-chrome specificity escalation.

### Phase 3 gate

- No undeclared app-chrome color, radius, shadow, z-index or type size remains.
- `ARCH-01`, `ARCH-08`, `COLOR-07`, `SHAPE-01` and `LAYOUT-06` produce no
  findings in included UI code.
- Contrast tests cover every chrome text/background and interactive boundary
  pair, not only exported-content palettes.
- Both shells receive visual review at desktop, tablet, phone/coarse pointer and
  extension-panel sizes.

## Phase 4 — migrate components and voice

Map existing BaudStyler concepts to the closest canonical component rather than
inventing a parallel family:

| BaudStyler area | Suite treatment |
| --- | --- |
| Surface, device, width and icon choices | Toggle/tab rules with synchronized ARIA state |
| Content block rows | Canonical selectable rows; selected inset is the non-color signal |
| Compatibility results | Semantic wash + deep text + glyph/word; color never stands alone |
| Copy action | One primary action for the export surface |
| Backup reminder | Gold standing-condition banner when the product has evidence it is needed |
| Style/import dialogs | Canonical modal header, body, footer and focus behavior |
| Empty saved-post/history areas | Canonical empty state with absence plus next action |
| Undo, redo, reorder, duplicate, delete and close | Inline SVG icon controls with labels and titles |
| Loading or restoring work | Skeleton for arriving structure; spinner only for a blocking wait |

Keep user-authored block emoji and the rendered preview untouched. Replace
decorative chrome glyphs with the guide's inline feather-style SVG grammar.

Audit all interface copy against the voice rules: sentence case, accurate save
language, actionable errors, no blame, unambiguous dates and explicit destructive
verbs. “Autosaved” must be backed by actual successful persistence; a failed
adapter cannot leave that claim visible.

### Phase 4 gate

- Every interactive component has rest, hover, focus-visible, active/press,
  disabled and busy/working behavior where applicable.
- Every status has a non-color signal.
- Modal, menu, toggle, icon and empty/loading patterns pass targeted DOM tests.
- Conformance warnings are either fixed or accompanied by a rule-specific,
  reviewed suppression explaining a genuine computed/product exception.

## Phase 5 — make conformance durable

1. Run `design:check` in local checks, CI and Pages deployment before builds.
2. Make stale vendored authority a CI failure.
3. Keep a machine-readable suppression inventory. Each entry names the rule,
   exact source location, reason, reviewer and review date; inline blanket
   suppression is not accepted.
4. Add upstream-book update instructions to `CLAUDE.md` and the release
   checklist: update upstream, regenerate, sync, review the vendored diff, run
   conformance.
5. Refresh README and social screenshots only after both shells pass the final
   visual review.
6. Run the upstream checker against its own fixtures and BaudStyler against its
   vendored checker in the same change that upgrades an edition.

The final target is **0 violations, 0 stale files and no unexplained warnings**.
Warnings acknowledged only because the checker cannot prove a runtime-computed
case should be narrowed into explicit, reviewed suppressions; “the app uses
React” is not a blanket suppression.

## Commit and rollout sequence

Keep the migration reviewable and reversible:

1. Branch both repositories and preserve the local BaudStyler baseline.
2. `edu-style-guide` branch: correct zoom and contrast contradictions.
3. `edu-style-guide` branch: add bundled platform, fixtures and sync/checker
   support; review the canonical book locally over `file://`.
4. BaudStyler branch: vendor authority, declare scopes and add CI gate.
5. BaudStyler branch: focus, keyboard, dialog, touch and reduced-motion fixes.
6. BaudStyler branch: base tokens, suite header, surfaces, shape and layer
   migration.
7. BaudStyler branch: component/state/voice migration.
8. BaudStyler branch: final conformance cleanup, full local review matrix and
   screenshot refresh.
9. Merge the upstream branch first. Update BaudStyler's vendored source commit
   if the merge commit differs, rerun all checks, then merge BaudStyler.

Do not combine the upstream authority change and BaudStyler's full visual
migration into one commit. If the new design causes a product regression, the
UI commit can then be reverted without removing the platform model or
accessibility corrections.

## Definition of done

- BaudStyler carries a current, generated copy of the admin UI style guide.
- Both entry points explicitly declare the bundled platform.
- The vendored checker reports 0 violations and 0 stale files, with every
  remaining warning explicitly reviewed and narrowly suppressed or fixed.
- Web and extension shells share the suite identity, tokens, components,
  interaction states, responsive behavior and voice.
- Keyboard, coarse pointer, 200% zoom, reduced motion and modal focus flows are
  verified.
- `npm run check:release`, `npm run design:check`, `npm run lint`, `npm test`,
  `npx tsc --noEmit`, `npm run build` and `npm run build:ext` all pass.
- The existing 13 exported HTML goldens are byte-identical to the pre-migration
  versions, workspace version remains 1 and extension permissions do not grow.
- Updated release screenshots show the real, conformant application at the
  documented viewport sizes.
- The implementation was exercised from local development servers and as a real
  unpacked extension; results from the required local review matrix are recorded
  in the branch handoff.

## Explicitly deferred

- Changing BaudStyler's working name or repository URL. (The later product and
  repository renames were completed separately on 2026-08-21.)
- Adding AI drafting, a backend, accounts, telemetry or cross-shell sync.
- Changing class-content profiles, palettes, templates or Blackbaud
  compatibility measurements.
- Rebuilding the web app as a marketing landing page. If a separate landing
  page is later added, it declares `conformance-surface marketing`; the composer
  itself remains an application surface.
