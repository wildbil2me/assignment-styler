# Admin UI style guide

The files in this directory govern Betterbaud's application chrome: headers,
panels, forms, buttons, dialogs, interaction states, responsive behavior,
accessibility, motion, and interface voice. They do not govern the
student-facing HTML copied into Blackbaud; that contract remains in
`docs/style-guide-spec.md`, `core/profiles/`, and `core/palettes.ts`.

This copy was generated from `wildbil2me/edu-style-guide`, edition 3, commit
`65bc4f5d3bbabd280724ee66f2c473f98cc9747a` (2026-08-21). Do not edit the
vendored authority files locally. Update and regenerate the upstream book, then
run its sync tool and review the resulting diff.

`upstream.json` records that authority and the SHA-256 digest of every vendored
file. `npm run design:check` fails if any generated copy drifts from that
reviewed commit. After an intentional upstream update, refresh those hashes only
after reviewing the vendored diff and confirming the new upstream commit.

- `RULES.md` is the textual rule ledger.
- `tokens.json` contains the authoritative values.
- `style-guide.html` contains the live component specimens and rationale.
- `conformance.json` declares Betterbaud's bundled shells and audit scopes.
- `suppressions.json` inventories narrowly reviewed computed-value exceptions.
- `upstream.json` pins the source edition, commit, and generated-file hashes.
- `tools/conformance.mjs` checks source and built output.

Run `npm run design:check` for source and `npm run design:check:built` after
building both delivery surfaces.
