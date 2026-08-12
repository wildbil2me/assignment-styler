# Blackbaud Content Composer

Create structured, student-facing class content, preview it, and export HTML that
survives Blackbaud's editor.

Two shells over one core:

- **Web app** — the full editor. Templates, HTML import, the style editor, saved
  posts, desktop and mobile preview.
- **Extension** — an MV3 side panel in quick-post mode. Open on your last post,
  edit, copy, done.

Both render through the same `core/`, so the same blocks produce the same bytes
in either one. Nothing leaves the browser: no backend, no accounts, no telemetry.

Because nothing leaves the browser, nothing is backed up for you either — so the
composer can write your whole workspace to a JSON file (**⋯ → Back up to a
file**) and read it back on any machine. That file is the only copy that
survives a cleared cache.

## Web app

```bash
npm ci
npm run dev
```

`npm run build` produces the static GitHub Pages build in `pages-dist/`, and
deploys automatically from `main`.

## Chrome or Edge extension

Build the unpacked extension:

```bash
npm run build:ext
```

Then:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the generated `extension-dist` folder.
5. Open a Blackbaud text editor and click the extension icon.
6. Compose content in the side panel and choose **Copy to clipboard**.
7. Open Blackbaud's HTML/source editor and paste.

The extension requests `sidePanel` and nothing else — no host permissions, no
content script. It cannot read the page you are on. It creates HTML and copies it
when you click the button; it never saves or publishes the Blackbaud page.

## Layout

| Directory | What it is |
| --- | --- |
| `core/` | Pure domain logic — model, blocks, profiles, palettes, renderer, sanitizer, importer, accessibility checks, versioned storage, measured Blackbaud compat spec. No React. |
| `ui/` | Shared React: the composer, the quick-post panel, and the pieces both use. |
| `apps/web/`, `apps/ext/` | The two shells. Entry point, host page, and for the extension its manifest. |
| `tests/` | Core contract suite plus golden HTML snapshots. |
| `tools/probe/` | The Blackbaud compatibility probe, so another school can measure its own tenant. |
| `docs/` | The rebuild plan, the compatibility results, the class style-guide spec. |

## Checks

```bash
npm run build      # the web build - the real gate
npm run build:ext  # the extension build
npm test           # core contract suite, goldens, and the probe analyzer
npm run lint
```
