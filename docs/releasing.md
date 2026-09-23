# Releasing BaudStyler

BaudStyler uses Semantic Versioning. During the `0.x` series, increment the
minor version for user-visible features or exported-HTML changes and the patch
version for backward-compatible fixes. A breaking workspace migration or a
deliberately incompatible exported-HTML contract requires a major version once
the project reaches `1.0.0`.

## Release checklist

1. Update the upstream admin UI style guide, regenerate it, sync it into
   `design/`, review the vendored diff, and update `design/upstream.json` to the
   reviewed edition, commit, and file hashes.
2. Move the relevant entries from `Unreleased` into a dated version section in
   `CHANGELOG.md`.
3. Set the same version in `package.json`, `package-lock.json`, and
   `apps/ext/public/manifest.json`.
4. Run `npm run check:release`, `npm run design:check`, `npm run lint`,
   `npm test`, and `npx tsc --noEmit`.
5. Run `npm run build`, `npm run build:ext`, and
   `npm run design:check:built`.
6. Smoke-test `pages-dist/` and load `extension-dist/` as an unpacked extension.
7. Commit the release, tag it as `vX.Y.Z`, and publish the GitHub release using
   the matching changelog section as its notes.

The build directories are intentionally ignored. GitHub Pages rebuilds the web
app from the tag's source, and the extension ZIP should be made from the
contents of `extension-dist/`, with `manifest.json` at the archive root.
