#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "design", "upstream.json"), "utf8"));
const failures = [];

// The recorded digests are of the upstream bytes, which use LF. `.gitattributes`
// now keeps `design/**` byte-exact on checkout, but a working copy cloned before
// that existed can still hold CRLF, and a line-ending rewrite is not upstream
// drift. Normalise first so this reports content, not the clone it came from.
for (const [name, expected] of Object.entries(manifest.sha256)) {
  const text = readFileSync(join(root, "design", name), "utf8").replace(/\r\n/g, "\n");
  const actual = createHash("sha256").update(text, "utf8").digest("hex");
  if (actual !== expected) failures.push(`${name}: expected ${expected}, received ${actual}`);
}

if (failures.length) {
  console.error(`Vendored admin UI style guide differs from recorded upstream commit ${manifest.commit}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("Regenerate upstream, run its sync tool, review the diff, and update design/upstream.json.");
  process.exit(1);
}

console.log(`Admin UI style guide edition ${manifest.edition} matches upstream ${manifest.commit.slice(0, 7)}.`);
