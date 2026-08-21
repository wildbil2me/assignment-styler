# Changelog

All notable changes to this project are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Adopted the educator suite admin UI style guide across the web composer and
  extension.
- Added suite tokens, responsive/touch behavior, reduced-motion handling,
  accessible dialogs and menus, consistent interaction states, and inline SVG
  controls.
- Replaced the unconditional autosave claim with verified saving, saved, and
  failure states backed by the active browser storage adapter.
- Revalidated compatibility with a 50-row probe across all three Blackbaud
  surfaces, including rich formatting, alignment, nested lists, and flex wrap.
- Normalized strikethrough to Blackbaud's stored line-through span and added
  measured semantic headings to collapsible sections.

### Added

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

[Unreleased]: https://github.com/toomey-sj/blackbaud-styler/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/toomey-sj/blackbaud-styler/releases/tag/v0.1.0
