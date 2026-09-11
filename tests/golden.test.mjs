/**
 * Golden snapshots of exported HTML.
 *
 * `core.test.mjs` asserts the renderer's *contract*; these files pin its exact
 * bytes, so an unintended change to the look shows up as a readable diff in
 * review rather than hiding inside a refactor.
 *
 * The set was relocked in Phase 2, which changed the output on purpose: tokens
 * replaced hardcoded values, soft cards became the default, half-width rows
 * gained a flex wrapper, and `details` joined the taxonomy.
 *
 * Regenerate deliberately, never reflexively:
 *   UPDATE_GOLDENS=1 node --test tests/golden.test.mjs
 *
 * A golden that changes without a decision behind it is a regression.
 */

import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { renderHtml } from "../core/render.ts";
import { palettes } from "../core/palettes.ts";
import { profiles } from "../core/profiles/index.ts";
import { surfaces } from "../core/surfaces.ts";
import { templates, starter } from "../core/templates.ts";
import { blockTypes } from "../core/catalog.ts";
import { conservative } from "../core/compat.ts";

const dir = join(dirname(fileURLToPath(import.meta.url)), "golden");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

/** One block of every type, so a change to any branch shows up somewhere. */
const everyType = blockTypes.map((type, i) => ({
  id: 700 + i,
  type,
  title: `${type} heading`,
  body: "First line\nSecond line",
  label: type === "hero" ? "EVERY TYPE" : undefined,
}));

const adversarial = [
  { id: 1, type: "hero", label: 'A & B <c> "d"', title: "Title & <tag>", body: "Sub & 'quote'" },
  { id: 2, type: "note", title: "Rich text", body: '<strong>bold</strong> <em>i</em> <span style="color:red;font-size:99px">narrowed</span>' },
  { id: 3, type: "note", title: "Links", body: '<a href="https://ok.example" target="_blank">good</a> <a href="javascript:alert(1)">bad</a>' },
  { id: 4, type: "note", title: "Unwrapped", body: "<div><h2>heading</h2><p>para</p></div>" },
  { id: 5, type: "steps", title: "Breaks", body: "a<br>b<br/>c<br />d" },
  { id: 6, type: "checklist", title: "Entities", body: "&amp; &nbsp; ’ – — 📘" },
  { id: 7, type: "note", title: "Hidden", body: "should not appear", hidden: true },
];

const halfPair = [
  { id: 1, type: "hero", label: "HALF WIDTH", title: "Two columns", body: "No media query" },
  { id: 2, type: "reading", width: "half", title: "Left", body: "Short." },
  { id: 3, type: "focus", width: "half", title: "Right", body: "A noticeably longer body, so unequal card heights are visible in the snapshot." },
];

const CASES = [
  // The default look, on the two documents a teacher actually starts from.
  ["starter-soft-english-bulletin", starter, "soft", "english", "bulletin", undefined],
  ["starter-soft-arts-topic", starter, "soft", "arts", "topic", undefined],

  // The same document under the two alternates — this trio is the profile ×
  // palette split made visible.
  ["starter-editorial-english-bulletin", starter, "editorial", "english", "bulletin", undefined],
  ["starter-bold-english-bulletin", starter, "bold", "english", "bulletin", undefined],

  ["homework-soft-english-assignment", templates["Homework"], "soft", "english", "assignment", undefined],
  ["unit-introduction-soft-science-topic", templates["Unit Introduction"], "soft", "science", "topic", undefined],
  ["weekly-overview-editorial-math-bulletin", templates["Weekly Overview"], "editorial", "math", "bulletin", undefined],

  // Carries the `details` block promoted in Phase 2.
  ["study-guide-soft-religion-topic", templates["Study Guide"], "soft", "religion", "topic", undefined],
  ["deadlines-bold-language-bulletin", templates["Deadlines and Reminders"], "bold", "language", "bulletin", undefined],

  ["every-block-type-soft-english-bulletin", everyType, "soft", "english", "bulletin", undefined],
  ["adversarial-soft-english-bulletin", adversarial, "soft", "english", "bulletin", undefined],
  ["half-width-pair-soft-english-bulletin", halfPair, "soft", "english", "bulletin", undefined],

  // What a school whose Blackbaud has not been probed actually receives: no
  // radius, no shadow, no flex, no disclosure — and no missing content.
  ["study-guide-soft-english-topic-unmeasured", templates["Study Guide"], "soft", "english", "topic", conservative],
];

if (UPDATE) mkdirSync(dir, { recursive: true });

for (const [name, blocks, profile, palette, surface, spec] of CASES) {
  test(`golden: ${name}`, () => {
    const actual = renderHtml(
      blocks,
      profiles[profile],
      palettes[palette],
      surfaces[surface],
      spec
    );
    const file = join(dir, `${name}.html`);

    if (UPDATE) {
      writeFileSync(file, actual, "utf8");
      return;
    }

    assert.ok(
      existsSync(file),
      `missing golden ${name}.html — run: UPDATE_GOLDENS=1 node --test tests/golden.test.mjs`
    );
    assert.equal(readFileSync(file, "utf8"), actual, `golden ${name} drifted`);
  });
}
