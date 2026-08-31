# Changelog

All notable changes to this project are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Retired the `reading`, `vocabulary` and `resource` block types, which rendered
  markup identical to `note` and differed only in a fallback heading. The
  taxonomy is now 15 types. Saved workspaces are migrated to schema v2, which
  remaps the three retired types rather than dropping them, so no existing post
  loses a block; the HTML importer still infers their headings, so an untitled
  imported block is titled "Reading" or "Resource link" as before.
- Retinted the `accent` tone away from `info` in all three profiles. At
  `#F0F7FF` against `info`'s `#EFF6FF` an announcement and a homework card were
  indistinguishable; accent is now teal.
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

- Added a responsive three-section application footer with a Ko-fi support link.
- Vendored design authority, source and built-output conformance gates, upstream
  integrity hashes, and a reviewed suppression inventory.

### Fixed

- Stopped inline edits being silently discarded. The preview tracked whether a
  field had been typed into with a variable local to the effect that wires the
  editors up, so any re-render that re-ran that effect — an autosave flipping
  the save indicator, a screen-reader announcement, a selection change — reset
  the flag to "clean" while the teacher's text was still in the DOM. The next
  blur then skipped the commit, and the text disappeared at the following
  render. The flag now lives in a ref that outlives the effect, and the update
  callback the effect depends on is stable, so the editors are no longer torn
  down and rebuilt mid-edit.
- Stopped duplicating a block from copying stale text. The copy was built from
  the block list captured when the button was rendered, while the insert was
  applied to the list React actually held. Clicking Duplicate blurs the open
  editor, which commits the edit into the same batch, so the copy was made from
  the pre-edit text: the original kept the new wording and the duplicate carried
  the old. Duplicate and delete are now applied inside the state updater, and
  the list operations moved to `core/blocks.ts` with tests.

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
