# Changelog

All notable changes to this project are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Rendered the hero eyebrow as a `div` rather than a `p`, because Blackbaud
  rewrites every `p` it is given into a `div`; exported markup and stored
  markup now match. Goldens relocked — the only byte change is that tag.
- Renamed the product and package from Betterbaud to BBStyler, and synchronized
  project links and the Pages base with `wildbil2me/assignment-styler`.
- Adopted the educator suite admin UI style guide across the web composer and
  extension.
- Added suite tokens, responsive/touch behavior, reduced-motion handling,
  accessible dialogs and menus, consistent interaction states, and inline SVG
  controls.
- Replaced the unconditional autosave claim with verified saving, saved, and
  failure states backed by the active browser storage adapter.
- Revalidated compatibility with a 50-row probe across all three Blackbaud
  surfaces, including rich formatting, alignment, nested lists, and flex wrap.
- Kept half-width cards paired in BBStyler's narrower desktop preview while
  preserving full-width stacking in the mobile preview.
- Moved the primary Copy for Blackbaud action to the top of the right-hand
  column so it remains visible before block settings and compatibility details.
- Replaced the custom Ko-fi footer button with Ko-fi's official linked image, bundled locally for offline reliability.
- Normalized strikethrough to Blackbaud's stored line-through span and added
  measured semantic headings to collapsible sections.

### Added

- Gave the side panel a template picker for the selected destination, undo and
  redo, the compatibility and contrast checks the web app already showed, and
  workspace backup and restore — previously the panel's storage had no way out.
- Added extension icons at 16, 32, 48 and 128px, generated from geometry by
  `npm run icons` with no image dependency, so the toolbar button is the product
  rather than a placeholder.
- Declared `minimum_chrome_version` for the side panel API, and reported a
  failure to bind the toolbar click instead of dropping it silently.
- Added a responsive three-section application footer with a Ko-fi support link.
- Vendored design authority, source and built-output conformance gates, upstream
  integrity hashes, and a reviewed suppression inventory.

## [0.1.0] - 2026-08-21

### Added

- A full browser-based composer with templates, HTML import, saved posts,
  custom class styles, accessibility checks, and desktop/mobile previews.
- A Chrome and Edge MV3 side panel for quick posting.
- Seventeen structured content block types, three visual profiles, six subject
  palettes, and three measured Blackbaud surfaces.
- Compatibility-aware rendering based on a reusable 43-row tenant probe.
- Versioned local workspaces with JSON backup and restore.
- Contract, golden-output, sanitizer, importer, storage, accessibility, and
  compatibility-probe tests.

### Privacy

- No backend, accounts, analytics, telemetry, host permissions, or content
  scripts. Content stays in the browser unless the user copies or exports it.

[Unreleased]: https://github.com/wildbil2me/assignment-styler/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/wildbil2me/assignment-styler/releases/tag/v0.1.0
