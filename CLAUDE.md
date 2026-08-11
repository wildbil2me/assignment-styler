# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

**Blackbaud Content Composer** (`blackbaud-content-composer`) — a composer for
building student-facing class posts and exporting HTML that survives Blackbaud's
editor. Content is authored as blocks, previewed per Blackbaud surface (bulletin
board, topic, assignment, announcement), and exported as inline-styled HTML.

Layout:

- `app/` — the vinext (Vite + React 19 RSC) app, including `app/api/draft`.
- `src/main.tsx`, `vite.config.ts` — the Vite entry.
- `worker/` — Cloudflare Worker entry; `db/` + `drizzle/` are Drizzle + D1.
- `extension/` — browser extension that pastes composed HTML into Blackbaud.
- `examples/d1/` — reference example, not part of the app build.

Three separate builds: `npm run build` (app), `pages:build`, `extension:build`.

## Checks

```bash
npm run build      # the real gate - must pass
npm run lint       # see the baseline below before trusting the result
npm test           # currently broken by design, see below
```

All build outputs are gitignored (`dist/`, `pages-dist/`, `extension-dist/`,
`.vinext/`, `.wrangler/`), so **no generated artifact needs committing** — a
build never dirties the tree.

### Known-red baseline — do not read these as regressions

Both were already failing at commit `3c98f56`, before any local work:

- **`npm run lint` → 15 errors, in two files.** 12 in `app/page.tsx`
  (`jsx-a11y/*` on click handlers attached to non-interactive elements, plus
  `react-hooks/rules-of-hooks`), and 3 in `extension/background.js` (`'chrome' is
  not defined` — `eslint.config.mjs` has no webextensions/browser global env for
  `extension/`).
- **`npm test` → fails.** It runs `npm run build && node --test
  tests/rendered-html.test.mjs`, and the build passes; the test file is stale
  scaffolding from the starter template. It asserts the app is still the
  placeholder loading skeleton — `app/_sites-preview/SkeletonPreview.tsx`, a
  `<meta name="codex-preview" content="development">` tag, and a
  `react-loading-skeleton` dependency — none of which exist now that the composer
  is built out. The failure output shows the real page server-rendering correctly.

So: judge lint by whether *your* files are clean and the count is still 15. Fixing
either baseline is legitimate work, but it is **its own change** — don't fold it
into an unrelated commit, and don't let it block a sync.

`tests/rendered-html.test.mjs` should eventually be either deleted or rewritten
against the actual composer output. Until then `npm test` is not a usable signal.

## Notes

- Node `>=22.13.0`, ESM (`"type": "module"`).
- `npm install` leaves 6 postinstall scripts ungated by npm's allow-scripts
  (`esbuild`, `sharp`, `workerd`). The platform binaries install as optional deps
  anyway and the build works; approving them is not required.
- Session sync is handled by shared user-level config, not by anything in this
  repo: a `SessionStart` hook auto-pulls on launch, and the `/wrap-up` and
  `/sync-up` skills cover the rest. This file is where that shared `/wrap-up`
  looks for the project's checks — keep the baseline above current.
