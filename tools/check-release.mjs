import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async path => JSON.parse(await readFile(path, "utf8"));
const [pkg, lock, manifest, changelog] = await Promise.all([
  readJson("package.json"),
  readJson("package-lock.json"),
  readJson("apps/ext/public/manifest.json"),
  readFile("CHANGELOG.md", "utf8"),
]);

assert.match(pkg.version, /^\d+\.\d+\.\d+$/, "package version must be SemVer");
assert.equal(lock.version, pkg.version, "package-lock version must match package.json");
assert.equal(lock.packages[""].version, pkg.version, "lockfile root version must match package.json");
assert.equal(manifest.version, pkg.version, "extension version must match package.json");
assert.match(changelog, new RegExp(`^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"), "changelog must contain the current version and a release date");

console.log(`Release metadata is consistent at ${pkg.version}.`);
