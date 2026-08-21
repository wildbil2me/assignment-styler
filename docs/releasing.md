# Releasing Betterbaud

Betterbaud uses Semantic Versioning. During the `0.x` series, increment the
minor version for user-visible features or exported-HTML changes and the patch
version for backward-compatible fixes. A breaking workspace migration or a
deliberately incompatible exported-HTML contract requires a major version once
the project reaches `1.0.0`.

## Release checklist

1. Move the relevant entries from `Unreleased` into a dated version section in
   `CHANGELOG.md`.
2. Set the same version in `package.json`, `package-lock.json`, and
   `apps/ext/public/manifest.json`.
3. Run `npm run check:release`.
4. Run `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`, and
   `npm run build:ext`.
5. Smoke-test `pages-dist/` and load `extension-dist/` as an unpacked extension.
6. Commit the release, tag it as `vX.Y.Z`, and publish the GitHub release using
   the matching changelog section as its notes.

The build directories are intentionally ignored. GitHub Pages rebuilds the web
app from the tag's source, and the extension ZIP should be made from the
contents of `extension-dist/`, with `manifest.json` at the archive root.
