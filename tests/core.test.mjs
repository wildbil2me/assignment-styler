/**
 * Contract tests for core/.
 *
 * Replaces Phase 1's `equivalence.test.mjs`, which proved the extracted core was
 * byte-identical to `app/page.tsx` by diffing against a frozen snapshot. Phase 2
 * deliberately changes the exported HTML, so that proof has done its job and the
 * snapshot is gone (see the plan's Phase 2, "update the goldens").
 *
 * What replaces it is not weaker, just differently aimed:
 *
 *  - `sanitize` and `import` are unchanged by Phase 2, and their whole corpus is
 *    pinned as a JSON snapshot — so a future change to either shows up as a
 *    reviewable diff rather than a silent behaviour shift.
 *  - `render` is asserted against its *contract* — every compatibility rule
 *    Phase 0 measured, plus the degradation behaviour a stricter tenant gets —
 *    instead of against a fixed string. The fixed strings live in
 *    `golden.test.mjs`.
 *
 * Regenerate the corpus snapshots deliberately, never reflexively:
 *   UPDATE_GOLDENS=1 node --test tests/core.test.mjs
 */

import "./dom.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { esc, safeRich, cssSafe, harvestRich, harvestText } from "../core/sanitize.ts";
import { readableOn } from "../core/color.ts";
import { renderHtml } from "../core/render.ts";
import { importHtml } from "../core/import.ts";
import { palettes, paletteKeys } from "../core/palettes.ts";
import { profiles, profileKeys, defaultProfile, fontStack, resolveTone, withFonts } from "../core/profiles/index.ts";
import { surfaces, surfaceKeys } from "../core/surfaces.ts";
import { templates, templateNames, starter, templateGroups } from "../core/templates.ts";
import { blockMeta, blockTypes } from "../core/catalog.ts";
import { stJohns, conservative, supportsElement } from "../core/compat.ts";
import { guard, style } from "../core/degrade.ts";
import {
  runChecks, contrastRatio, parseHex, isLargeText, requiredRatio, ASSUMED_PAGE_BACKGROUND,
} from "../core/checks.ts";
import { nextId, nextIds, reserveIds } from "../core/ids.ts";
import {
  migrate, serialize, parse, backupFilename, localAdapter, STORAGE_KEY,
} from "../core/storage.ts";

const dir = join(dirname(fileURLToPath(import.meta.url)), "golden");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

/** Compare against a JSON snapshot, or rewrite it when explicitly asked to. */
function snapshot(name, actual) {
  const file = join(dir, `${name}.json`);
  if (UPDATE) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, `${JSON.stringify(actual, null, 2)}\n`, "utf8");
    return;
  }
  assert.ok(
    existsSync(file),
    `missing snapshot ${name}.json — run: UPDATE_GOLDENS=1 node --test tests/core.test.mjs`
  );
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), actual, `${name} drifted`);
}

/* --------------------------------------------------------------- corpora */

/** Bodies chosen to hit every branch of the sanitizer and the line splitter. */
const BODIES = [
  "",
  "plain text",
  "two\nlines",
  "three\nlines\nhere",
  "trailing newline\n",
  "\nleading newline",
  "double\n\nblank",
  "<br>only a break",
  "a<br>b<br/>c<br />d",
  "<BR>uppercase break",
  "<strong>bold</strong> and <em>italic</em>",
  "<b>b</b><i>i</i><u>u</u><s>s</s><strike>strike</strike>",
  "<span>span</span>",
  "<ul><li>one</li><li>two</li></ul>",
  "<ol><li>first</li></ol>",
  '<a href="https://example.org">good link</a>',
  '<a href="http://example.org">http link</a>',
  '<a href="javascript:alert(1)">bad scheme</a>',
  '<a href="/relative">relative</a>',
  '<a href="mailto:a@b.c">mailto</a>',
  "<a>no href</a>",
  '<a href="https://example.org" title="drop" target="_blank">extra attrs</a>',
  '<span style="color:red">colour kept</span>',
  '<span style="background-color:#FEF3C7">highlight kept</span>',
  '<span style="color:red;background-color:blue;font-size:99px;position:fixed">narrowed</span>',
  '<span style="font-weight:900">style dropped entirely</span>',
  "<div>div is unwrapped</div>",
  "<div><strong>nested kept inside unwrapped</strong></div>",
  "<script>alert(1)</script>after script",
  '<img src="x" onerror="alert(1)">',
  '<p onclick="x()">handler stripped</p>',
  "<h2>heading unwrapped</h2>",
  "<table><tr><td>cell</td></tr></table>",
  "ampersand & angle < > quote \" apostrophe '",
  "&amp; already escaped",
  "&nbsp;entity",
  "emoji 📘 and ☐ box",
  "curly ’ quote and – en dash and — em dash",
  "unclosed <strong>bold",
  "<strong><strong>double nested</strong></strong>",
  "Term — definition\nAnother — thing",
];

const IMPORT_FIXTURES = [
  "",
  "   ",
  "<p></p>",
  "<div></div>",
  "<h1>Just a title</h1>",
  "<p>Leading paragraph becomes the intro</p>",
  "<p>First</p><p>Second stays a note</p>",
  "<h1>Title</h1><p>Intro</p><h2>Homework</h2><ul><li>a</li><li>b</li></ul>",
  "<blockquote>Quoted text</blockquote>",
  "<ol><li>one</li><li>two</li><li>three</li></ol>",
  "<ul><li>alpha</li></ul>",
  "<h2>Upcoming quiz</h2>",
  "<h3>Exam review</h3>",
  "<h4>Announcement</h4>",
  "<div><strong>Reading</strong> Chapter 4, pages 20-30</div>",
  "<div><b>Vocabulary</b> key term list</div>",
  "<div>Learning target: I can explain the theme</div>",
  "<div>Resource link to the website</div>",
  "<div>Questions to consider before you think about it</div>",
  "<div>Homework due Friday</div>",
  "<div>Deadline coming up</div>",
  "<section><p>one</p><p>two</p><p>three</p></section>",
  "<div><p>single wrapper child</p></div>",
  "<main><h1>Wrapped</h1><p>body</p></main>",
  "<article><h2>A</h2><h2>B</h2></article>",
  "<script>evil()</script><p>after script</p>",
  "<style>.x{}</style><p>after style</p>",
  "<form><input></form><p>after form</p>",
  "<iframe src='x'></iframe><p>after iframe</p>",
  "<p>text with <strong>bold</strong> inside</p><div>next</div>",
  "<h1>A</h1><h1>B</h1>",
  "<div>   </div><p>whitespace-only sibling skipped</p>",
  "<div><h2>Heading</h2><p>and body</p></div>",
  "<ul><li>   </li><li>kept</li></ul>",
];

const WIDTHS = [undefined, "full", "half"];

/** Single-block documents covering every type × width × emoji × label state. */
function unitBlocks() {
  const out = [];
  let id = 1;
  for (const type of blockTypes)
    for (const width of WIDTHS)
      for (const emoji of [undefined, "", "📘"])
        for (const label of [undefined, "", "   ", "UNIT UPDATE"])
          out.push([{ id: id++, type, title: "Title", body: "body\nsecond", width, emoji, label }]);
  return out;
}

const HALF_PAIR = [
  { id: 1, type: "reading", width: "half", title: "L", body: "left" },
  { id: 2, type: "focus", width: "half", title: "R", body: "right" },
];

const render = (blocks, opts = {}) =>
  renderHtml(
    blocks,
    opts.profile ?? defaultProfile,
    opts.palette ?? palettes.english,
    opts.surface ?? surfaces.bulletin,
    opts.spec ?? stJohns
  );

/* ------------------------------------------------------------ sanitize.ts */

test("esc escapes exactly the five characters it claims to", () => {
  assert.equal(esc("&<>\"'"), "&amp;&lt;&gt;&quot;&#039;");
  assert.equal(esc("no specials"), "no specials");
  assert.equal(esc(""), "");
  assert.equal(esc("a&b<c>d\"e'f"), "a&amp;b&lt;c&gt;d&quot;e&#039;f");
});

test("safeRich output is pinned across the whole corpus", () => {
  snapshot("sanitize", Object.fromEntries(BODIES.map((b) => [b, safeRich(b)])));
});

test("safeRich enforces the allowlist", () => {
  assert.equal(safeRich('<div onclick="x">t</div>'), "t", "non-allowlisted tag unwrapped");
  assert.equal(safeRich("<h2>t</h2>"), "t", "headings unwrapped, children kept");
  assert.match(safeRich("<strong>t</strong>"), /^<strong>t<\/strong>$/);
  assert.equal(safeRich('<a href="javascript:x">t</a>'), "<a>t</a>", "bad scheme dropped");
  assert.equal(safeRich('<a href="/rel">t</a>'), "<a>t</a>", "relative href dropped");
  assert.doesNotMatch(safeRich('<span style="font-size:99px">t</span>'), /font-size/);
  assert.match(safeRich("<strike>t</strike>"), /^<span style="text-decoration:line-through;?">t<\/span>$/);
  assert.match(safeRich('<span style="text-decoration: line-through; font-size:99px">t</span>'), /^<span style="text-decoration:line-through;?">t<\/span>$/);
  assert.doesNotMatch(safeRich('<span title="x">t</span>'), /title/);
  assert.doesNotMatch(safeRich('<p onclick="x()">t</p>'), /onclick/);
});

test("cssSafe keeps a style attribute intact and leaves font quoting alone", () => {
  assert.equal(cssSafe('rgb(1,2,3)"'), "rgb(1,2,3)");
  assert.equal(cssSafe("'Trebuchet MS',sans-serif"), "'Trebuchet MS',sans-serif");
  assert.equal(cssSafe("</style><script>"), "/stylescript");
});

/* -------------------------------------------------------------- import.ts */

test("importHtml output is pinned across every fixture", () => {
  snapshot(
    "import",
    Object.fromEntries(IMPORT_FIXTURES.map((src) => [src, importHtml(src, 1000)]))
  );
});

test("importHtml is deterministic given a stamp", () => {
  const a = importHtml(IMPORT_FIXTURES[7], 42);
  assert.deepEqual(a, importHtml(IMPORT_FIXTURES[7], 42));
  assert.equal(a.blocks[0].id, 42, "ids derive from the stamp");
});

test("importHtml reports the count after prepending a synthetic hero", () => {
  // Preserved quirk: the message counts the hero the importer added itself.
  const r = importHtml("<p>only a paragraph</p><div>and a note</div>", 100);
  assert.equal(r.blocks.length, 3);
  assert.equal(r.blocks[0].type, "hero");
  assert.equal(r.blocks[0].id, 99, "hero takes stamp - 1");
  assert.equal(r.message, "3 editable blocks created.");
});

test("importHtml drops scripts, styles and forms rather than importing them", () => {
  for (const tag of ["script", "style", "iframe", "object", "embed", "form"]) {
    const r = importHtml(`<${tag}>payload</${tag}><p>kept</p>`, 1);
    assert.doesNotMatch(JSON.stringify(r.blocks), /payload/, `${tag} content leaked`);
  }
});

test("importHtml round-trips what the renderer emits", () => {
  // data-layout survives Blackbaud (probe R15), and the renderer still emits it.
  const html = render(starter);
  const back = importHtml(html, 1);
  assert.ok(back.blocks.length > 1, "rendered output is re-importable");
  assert.equal(back.blocks[0].type, "hero");
});

/* -------------------------------------------------------------- profiles */

test("fontStack single-quotes exactly the families that need it", () => {
  assert.equal(fontStack("Arial, sans-serif"), "Arial,sans-serif");
  assert.equal(fontStack("Trebuchet MS, sans-serif"), "'Trebuchet MS',sans-serif");
  assert.equal(fontStack('Poppins,"Trebuchet MS",sans-serif'), "Poppins,'Trebuchet MS',sans-serif");
  assert.equal(fontStack("'Odd Font', serif"), "'Odd Font',serif");
  assert.equal(fontStack("Georgia,serif"), "Georgia,serif");
});

test("every profile emits font stacks Blackbaud would not rewrite", () => {
  // Blackbaud normalizes double quotes to single ones on save; emitting them
  // that way already means a round trip produces no churn.
  for (const key of profileKeys)
    for (const font of Object.values(profiles[key].fonts)) {
      const stack = fontStack(font);
      assert.doesNotMatch(stack, /"/, `${key}: double quotes would be rewritten`);
      assert.equal(fontStack(stack), stack, `${key}: fontStack is not idempotent`);
    }
});

test("resolveTone follows the palette but keeps literal semantic colours", () => {
  const neutral = resolveTone(defaultProfile, palettes.arts, "neutral");
  assert.equal(neutral.fill, palettes.arts.surface, "palette.* references resolve");

  const info = resolveTone(defaultProfile, palettes.arts, "info");
  assert.equal(info.fill, defaultProfile.tones.info.fill, "literals do not follow the subject");
  assert.doesNotMatch(info.fill, /^palette\./);
});

test("withFonts overrides type without disturbing the rest of the profile", () => {
  const custom = withFonts(defaultProfile, { heading: "Verdana, sans-serif" });
  assert.equal(custom.heading.size, defaultProfile.heading.size);
  assert.equal(custom.fonts.body, defaultProfile.fonts.body);
  assert.equal(custom.fonts.heading, "Verdana, sans-serif");
});

/* --------------------------------------------------------------- degrade */

test("degrade drops what a spec does not support, and keeps what it does", () => {
  const decls = [
    ["background-color", "#FFF"],
    ["border-radius", "14px"],
    ["box-shadow", "0 4px 12px rgba(0,0,0,.1)"],
  ];
  assert.equal(
    style(decls, stJohns, "bulletin"),
    "background-color:#FFF;border-radius:14px;box-shadow:0 4px 12px rgba(0,0,0,.1);"
  );
  assert.equal(style(decls, conservative, "bulletin"), "background-color:#FFF;");
});

test("degrade skips empty values, so a profile opts out with an empty token", () => {
  assert.equal(style([["box-shadow", ""], ["padding", "16px"]], stJohns, "topic"), "padding:16px;");
});

test("the latest probe records inline svg on every surface", () => {
  // The 2026-08-21 R37 rerun supersedes the earlier Assignment-only strip.
  assert.equal(supportsElement(stJohns, "svg", "bulletin"), true);
  assert.equal(supportsElement(stJohns, "svg", "assignment"), true);
});

/* ---------------------------------------------------------------- render */

test("render obeys the structural rules on every template × profile × surface", () => {
  let checked = 0;
  for (const name of templateNames)
    for (const pk of profileKeys)
      for (const sk of surfaceKeys) {
        const html = render(templates[name], {
          profile: profiles[pk],
          surface: surfaces[sk],
        });
        assert.deepEqual(guard(html, stJohns), [], `${name} / ${pk} / ${sk}`);
        assert.doesNotMatch(html, /class=/i, "no class attributes to depend on");
        assert.doesNotMatch(html, /<\/(div|details)>\s+</, "siblings must stay adjacent");
        checked++;
      }
  assert.equal(checked, templateNames.length * 3 * 3);
});

test("render survives every type × width × emoji × label combination", () => {
  const docs = unitBlocks();
  for (const blocks of docs) {
    const html = render(blocks);
    assert.match(html, /^<div style="[^"]+">/);
    assert.ok(html.endsWith("</div>"));
  }
  assert.ok(docs.length >= blockTypes.length * 3 * 3 * 4, "full cross-product");
});

test("render survives every type × body without leaking markup", () => {
  for (const type of blockTypes)
    for (const body of BODIES) {
      const html = render([{ id: 1, type, title: "T", body }]);
      assert.doesNotMatch(html, /<script/i, `${type}: script survived`);
      assert.doesNotMatch(html, /onerror=|onclick=/i, `${type}: handler survived`);
    }
});

test("hidden blocks never reach the export", () => {
  const html = render([
    { id: 1, type: "note", title: "shown", body: "visible" },
    { id: 2, type: "note", title: "secret", body: "must not appear", hidden: true },
  ]);
  assert.doesNotMatch(html, /must not appear/);
  assert.match(html, /visible/);
});

test("block alignment is exported and left remains the clean default", () => {
  const centered = render([{ id: 1, type: "note", title: "Centered", body: "Body", align: "center" }]);
  assert.match(centered, /text-align:center/);
  const left = render([{ id: 1, type: "note", title: "Left", body: "Body", align: "left" }]);
  assert.doesNotMatch(left, /text-align:left/);
});

test("half-width cards carry both layouts in one markup", () => {
  const html = render(HALF_PAIR);
  // Flex, so two cards of unequal length reach equal heights (probe R09/R42)…
  assert.match(html, /display:flex;flex-wrap:wrap;/);
  // …with the prototype's inline-block strategy intact underneath it (R07).
  assert.match(html, /display:inline-block/);
  assert.match(html, /width:calc\(50% - \d+px\)/);
  assert.match(html, /min-width:\d+px/);
  assert.match(html, /data-layout="half"/);
  assert.doesNotMatch(html, /<\/div>\s+<div/, "halves must share a line");
});

test("a third half-width block wraps rather than orphaning", () => {
  const html = render([...HALF_PAIR, { id: 3, type: "note", width: "half", title: "T", body: "t" }]);
  assert.equal(html.match(/display:flex/g).length, 2, "two rows, second holds the odd card");
});

test("half-width layout falls back to inline-block for an unmeasured tenant", () => {
  const html = render(HALF_PAIR, { spec: conservative });
  assert.doesNotMatch(html, /display:flex/, "no flex without measured flex-wrap");
  assert.match(html, /display:inline-block/, "the prototype's strategy still ships");
});

test("details renders as disclosure where it survives, as a card where it does not", () => {
  const block = [{ id: 1, type: "details", title: "Answers", body: "the answer" }];

  const open = render(block);
  assert.match(open, /<details data-layout="full"/);
  assert.match(open, /<summary style="[^"]+"><h2 style="[^"]+">Answers<\/h2><\/summary>/);

  const plainSummary = render(block, { spec: { ...stJohns, headingInSummary: false } });
  assert.match(plainSummary, /<summary style="[^"]+">Answers<\/summary>/, "unmeasured nesting keeps the plain-summary fallback");

  const flat = render(block, { spec: conservative });
  assert.doesNotMatch(flat, /<details/, "unsupported disclosure degrades to a card");
  assert.match(flat, /the answer/, "and never hides the content");
});

test("the soft profile emits the properties Phase 0 verified it needs", () => {
  const html = render(starter, { profile: profiles.soft });
  assert.match(html, /border-radius:14px/, "R02");
  assert.match(html, /box-shadow:0 1px 2px rgba\(/, "R03");
  assert.match(html, /background-color:#/, "R04");
});

test("a stricter tenant loses the decoration and keeps the content", () => {
  const html = render(starter, { profile: profiles.soft, spec: conservative });
  assert.doesNotMatch(html, /border-radius/);
  assert.doesNotMatch(html, /box-shadow/);
  assert.match(html, /Vocabulary quiz · Thursday/, "content is never a casualty");
});

test("every colour in the output was declared by a token", () => {
  // The Phase 2 promise, stated as a test: render.ts contains no hex values. If
  // one is ever reintroduced it will appear in the output without any profile or
  // palette having asked for it, and this fails.
  for (const pk of profileKeys)
    for (const key of paletteKeys) {
      const declared = new Set(
        [
          ...Object.values(palettes[key]),
          // Derived from the accent, not invented alongside it: the eyebrow is
          // small text, so it takes the accent darkened just far enough to read.
          // The promise this test guards is that no colour appears which no
          // token asked for, and a variant of a token still answers to its token.
          readableOn(palettes[key].accent, ASSUMED_PAGE_BACKGROUND, 4.5),
          ...(JSON.stringify(profiles[pk]).match(/#[0-9A-Fa-f]{3,8}/g) ?? []),
        ].map((v) => String(v).toLowerCase())
      );
      const html = render(templates["Study Guide"], {
        profile: profiles[pk],
        palette: palettes[key],
      });
      for (const hex of html.match(/#[0-9A-Fa-f]{3,8}/g) ?? [])
        assert.ok(declared.has(hex.toLowerCase()), `${pk}/${key}: ${hex} came from no token`);
    }
});

test("a custom palette carrying a quote cannot break out of the style attribute", () => {
  // The custom style editor is user input reaching a style attribute. The
  // prototype interpolated it raw, so a quote character ended the attribute and
  // whatever followed became markup.
  const html = render(starter, {
    palette: { ...palettes.english, name: "Custom", className: "X", accent: 'rgb(1,2,3)"onload=x' },
  });
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const el of doc.querySelectorAll("*"))
    for (const attr of Array.from(el.attributes))
      assert.ok(
        ["style", "data-layout"].includes(attr.name),
        `${attr.name} was smuggled in through a palette colour`
      );
  assert.deepEqual(guard(html, stJohns), []);
});

test("the surface decides the wrapper width", () => {
  for (const key of surfaceKeys)
    assert.match(render(starter, { surface: surfaces[key] }), new RegExp(`max-width:${surfaces[key].width}px`));
});

/* ---------------------------------------------------- data table integrity */

test("the data tables match the shapes the renderer expects", () => {
  assert.equal(blockTypes.length, 17, "17 block types — details joined in Phase 2");
  assert.equal(paletteKeys.length, 6, "6 subject palettes");
  assert.equal(profileKeys.length, 3, "3 profiles");
  assert.equal(surfaceKeys.length, 3, "3 surfaces — not 4; announcement is a block type");
  assert.equal(templateNames.length, 17, "17 templates");
  assert.equal(defaultProfile.id, "soft", "soft cards is the chosen default");

  // The assignment surface carries the seven a teacher actually posts;
  // topic and bulletin stay at five each.
  const offered = { assignment: 7, topic: 5, bulletin: 5 };
  for (const key of surfaceKeys)
    assert.equal(templateGroups[key].length, offered[key], `${key} should offer ${offered[key]} templates`);

  // Every name a surface offers must resolve, or the picker silently no-ops.
  for (const key of surfaceKeys)
    for (const name of templateGroups[key])
      assert.ok(templates[name], `template "${name}" offered by ${key} but not defined`);

  // Every template block must be a real type, or render throws on blockMeta.
  for (const name of templateNames)
    for (const b of templates[name])
      assert.ok(blockMeta[b.type], `template "${name}" uses unknown type ${b.type}`);

  for (const b of starter) assert.ok(blockMeta[b.type], `starter uses unknown type ${b.type}`);

  // Every tone a block names must exist in every profile, or render falls back
  // silently and a block type loses its colour.
  for (const type of blockTypes)
    for (const key of profileKeys)
      assert.ok(profiles[key].tones[blockMeta[type].tone], `${key} has no ${blockMeta[type].tone} tone`);
});

test("template ids are unique within each template", () => {
  for (const name of templateNames) {
    const ids = templates[name].map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids in "${name}"`);
  }
});

test("surface widths are the ones the renderer emits", () => {
  assert.equal(surfaces.bulletin.width, 720);
  assert.equal(surfaces.topic.width, 760);
  assert.equal(surfaces.assignment.width, 680);
  for (const key of surfaceKeys) assert.equal(surfaces[key].key, key, "surfaces carry their own key");
});

/* ---------------------------------------------------------------- checks */

/**
 * Phase 4. The panel these back used to be four hardcoded ✓ rows and a
 * hardcoded 4/4; the contrast one was false for all six shipped palettes.
 *
 * The rule worth defending here is the tri-state: a check that could not be
 * computed must never surface as a pass. Everything else follows from it.
 */

test("contrast maths matches the WCAG reference values", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF").toFixed(2), "21.00");
  assert.equal(contrastRatio("#FFFFFF", "#FFFFFF").toFixed(2), "1.00");
  assert.equal(contrastRatio("#777777", "#FFFFFF").toFixed(2), "4.48", "the classic just-fails grey");
  assert.equal(contrastRatio("#000", "#fff").toFixed(2), "21.00", "3-digit hex expands");
  assert.equal(contrastRatio("#C99700", "#FFFFFF").toFixed(2), "2.65", "English gold on white");

  // Order must not matter: the formula sorts by luminance.
  assert.equal(contrastRatio("#243B53", "#FFFFFF"), contrastRatio("#FFFFFF", "#243B53"));
});

test("a colour the formula cannot read is unknown, never a pass", () => {
  assert.equal(contrastRatio("rgba(15,23,42,0.5)", "#FFFFFF"), null);
  assert.equal(contrastRatio("cornflowerblue", "#FFFFFF"), null);
  assert.equal(contrastRatio("", "#FFFFFF"), null);
  assert.equal(parseHex("#ggghhh"), null);

  // ...and it reaches the report as `unknown`, with no pass anywhere near it.
  const odd = { ...palettes.english, surface: "rgba(255,255,255,0.6)" };
  const report = runChecks(
    [{ id: 1, type: "note", title: "Note", body: "Body" }],
    profiles.soft,
    odd,
    surfaces.bulletin
  );
  const body = report.checks.find((c) => c.id === "contrast-body");
  assert.equal(body.status, "unknown");
  assert.match(body.detail, /cannot be computed/);
});

test("large text uses the WCAG thresholds, read from profile tokens", () => {
  assert.equal(isLargeText(24, 400), true);
  assert.equal(isLargeText(23.9, 400), false);
  assert.equal(isLargeText(18.66, 700), true);
  assert.equal(isLargeText(18.66, 600), false, "bold means 700+");
  assert.equal(isLargeText(16, 700), false, "soft's card heading is NOT large text");
  assert.equal(requiredRatio(16, 700), 4.5);
  assert.equal(requiredRatio(28, 400), 3);
});

test("the hero eyebrow reads at 4.5:1 on every shipped palette", () => {
  // This asserted the opposite until 2026-09-13, when the finding that motivated
  // Phase 4 was fixed rather than reported. The reason it existed still holds and
  // is the first half of this test: every shipped accent is a mid-tone picked for
  // borders and fills, and not one of them clears small text on white.
  for (const key of paletteKeys) {
    const accent = palettes[key].accent;
    const raw = contrastRatio(accent, ASSUMED_PAGE_BACKGROUND);
    assert.ok(raw < 4.5, `${key} accent clears 4.5 unaided at ${raw.toFixed(2)} — the derivation may be unnecessary`);

    const derived = readableOn(accent, ASSUMED_PAGE_BACKGROUND, 4.5);
    const lifted = contrastRatio(derived, ASSUMED_PAGE_BACKGROUND);
    assert.notEqual(derived, accent, `${key} did not move`);
    assert.ok(lifted >= 4.5, `${key} derived to ${derived} at only ${lifted.toFixed(2)}:1`);

    // Only the text moves. The accent itself still draws every border and rule.
    const html = render(starter, { profile: profiles.soft, palette: palettes[key] });
    assert.ok(html.includes(`color:${derived}`), `${key}: the eyebrow does not carry the derived colour`);
    assert.ok(html.includes(accent), `${key}: the accent vanished from the output entirely`);
  }

  const report = runChecks(starter, profiles.soft, palettes.english, surfaces.bulletin);
  const ground = report.checks.find((c) => c.id === "contrast-ground");
  assert.equal(ground.status, "pass", ground.detail);
  assert.match(ground.detail, /Assumes a white page background/, "still states the assumption");
});

test("the score counts passes over checks attempted, unknowns apart", () => {
  const report = runChecks(starter, profiles.soft, palettes.english, surfaces.bulletin);
  assert.equal(report.checked, report.passed + report.failed);
  assert.equal(report.checks.length, report.checked + report.unknown);
  assert.equal(report.failed, 0, "the starter post is clean since the eyebrow was fixed");
  assert.equal(report.tenantMeasured, true);
  assert.equal(report.tenant, "St John's");
});

test("an unmeasured tenant is reported as unmeasured, not as safe", () => {
  const report = runChecks(starter, profiles.soft, palettes.english, surfaces.bulletin, conservative);
  const surface = report.checks.find((c) => c.id === "surface");
  assert.equal(report.tenantMeasured, false);
  assert.equal(surface.status, "unknown");
  assert.match(surface.detail, /Nobody has run the probe/);
});

test("heading structure follows what the renderer actually emits", () => {
  const one = runChecks(starter, profiles.soft, palettes.english, surfaces.bulletin);
  const order = one.checks.find((c) => c.id === "heading-order");
  assert.equal(order.status, "pass");
  assert.match(order.detail, /One <h1> and 4 <h2>s/);

  const none = runChecks(
    [{ id: 9, type: "note", title: "Note", body: "Body" }],
    profiles.soft, palettes.english, surfaces.bulletin
  );
  assert.equal(none.checks.find((c) => c.id === "heading-order").status, "fail");

  const two = runChecks(
    [...starter, { id: 99, type: "hero", title: "Second", body: "" }],
    profiles.soft, palettes.english, surfaces.bulletin
  );
  const twoOrder = two.checks.find((c) => c.id === "heading-order");
  assert.equal(twoOrder.status, "fail");
  assert.deepEqual(twoOrder.blockIds, [99], "names the extra title, not the first");

  const late = runChecks(
    [{ id: 8, type: "note", title: "Note", body: "B" }, { id: 7, type: "hero", title: "Late", body: "" }],
    profiles.soft, palettes.english, surfaces.bulletin
  );
  assert.match(late.checks.find((c) => c.id === "heading-order").detail, /not the first block/);

  // R43 measured a heading surviving inside the disclosure control, so it now
  // contributes to the document outline.
  const disclosure = runChecks(
    [...starter, { id: 50, type: "details", title: "Answer key", body: "A" }],
    profiles.soft, palettes.english, surfaces.topic
  );
  assert.match(disclosure.checks.find((c) => c.id === "heading-order").detail, /One <h1> and 5 <h2>s/);
});

test("hidden blocks are checked exactly as the renderer treats them", () => {
  const hidden = runChecks(
    [...starter, { id: 60, type: "note", title: "Hidden", body: "x", hidden: true }],
    profiles.soft, palettes.english, surfaces.bulletin
  );
  for (const check of hidden.checks)
    assert.ok(!check.blockIds.includes(60), "a hidden block cannot be the cause of anything");
});

test("structure is checked against real output, not asserted", () => {
  const report = runChecks(starter, profiles.soft, palettes.english, surfaces.bulletin);
  const structure = report.checks.find((c) => c.id === "structure");
  assert.equal(structure.status, "pass");
  assert.match(structure.detail, /Every style is inline/);
});

test("every palette x profile x surface verdict is pinned", () => {
  // 54 combinations. A palette or profile tweak that quietly breaks contrast
  // fails here instead of shipping.
  const matrix = {};
  for (const p of profileKeys)
    for (const c of paletteKeys)
      for (const s of surfaceKeys)
        matrix[`${p}/${c}/${s}`] = runChecks(starter, profiles[p], palettes[c], surfaces[s])
          .checks.map((x) => `${x.id}:${x.status}`)
          .join(" ");
  snapshot("checks-matrix", matrix);
});

/* --------------------------------------------------------- ids and storage */

test("ids are unique even when minted in the same millisecond", () => {
  // Carried-forward bug #7. The old code stamped Date.now() per call and
  // stamp + i per batch, so a template expansion inside one tick could collide
  // with a block added in the same tick.
  const ids = [...nextIds(500), ...Array.from({ length: 500 }, () => nextId())];
  assert.equal(new Set(ids).size, 1000, "1000 ids, no duplicates");
  for (let i = 1; i < ids.length; i++) assert.ok(ids[i] > ids[i - 1], "ids only ever increase");
});

test("restored ids are reserved so new blocks cannot land on them", () => {
  const future = Date.now() + 5_000_000;
  reserveIds([future]);
  assert.ok(nextId() > future, "a workspace from a machine with a fast clock still round-trips");
});

test("a workspace round-trips through serialize and parse", () => {
  const workspace = migrate({ blocks: starter, postTitle: "Tuesday", styleKey: "arts", profileKey: "bold" });
  const { workspace: back, message } = parse(serialize(workspace));
  assert.deepEqual(back, workspace);
  assert.match(message, /Restored 6 blocks and 0 saved posts/);
});

test("migration accepts what the prototype wrote and rejects what it didn't", () => {
  assert.equal(migrate(null), null);
  assert.equal(migrate("not a workspace"), null);
  assert.equal(migrate({}), null, "nothing worth restoring leaves the defaults alone");
  assert.equal(parse("{ broken").workspace, null);
  assert.match(parse("{}").message, /doesn’t contain any posts/);

  const v0 = migrate({
    blocks: [{ id: 1, type: "hero", title: "T", body: "B", animation: "fade" }],
    postTitle: "Old post",
    styleKey: "science",
    surfaceKey: "nonsense",
    profileKey: "nonsense",
  });
  assert.equal(v0.version, 2);
  assert.equal("animation" in v0.blocks[0], false, "the prototype's animation field is dropped");
  assert.equal(v0.surfaceKey, "bulletin", "an unknown surface falls back rather than throwing");
  assert.equal(v0.profileKey, "soft");
  assert.equal(v0.classes.length, 1, "one flat style becomes one class");
  assert.equal(v0.classes[0].styleKey, "science");
  assert.equal(v0.activeClassId, v0.classes[0].id);

  const junk = migrate({ blocks: [{ id: 1, type: "nonexistent", title: "", body: "" }, ...starter] });
  assert.equal(junk.blocks.length, starter.length, "a block type this build doesn't have is dropped");
});

test("the pre-split fused customStyle migrates colour always, fonts only if chosen", () => {
  // Phase 2 split colour from type. The fused style held both, but its fonts
  // only ever applied when the teacher had actually selected the custom style —
  // carrying them over otherwise would silently restyle every class.
  const fused = { className: "My Class", primary: "#111111", accent: "#222222", surface: "#333333", focus: "#444444", heading: "Verdana, sans-serif", body: "Verdana, sans-serif" };

  const chosen = migrate({ blocks: starter, styleKey: "custom", customStyle: fused });
  assert.equal(chosen.classes[0].customPalette.primary, "#111111");
  assert.equal(chosen.classes[0].customPalette.className, "My Class");
  assert.equal(chosen.classes[0].fonts.heading, "Verdana, sans-serif", "they had picked it, so the fonts come too");

  const notChosen = migrate({ blocks: starter, styleKey: "english", customStyle: fused });
  assert.equal(notChosen.classes[0].customPalette.accent, "#222222", "the colours are still preserved");
  assert.deepEqual(notChosen.classes[0].fonts, defaultProfile.fonts, "but the fonts are not adopted");

  // A current workspace wins over a legacy one if somehow both are present.
  const both = migrate({ blocks: starter, customPalette: { ...palettes.arts, className: "New" }, customStyle: fused });
  assert.equal(both.classes[0].customPalette.primary, palettes.arts.primary);
});

test("a v2 workspace's classes survive migration, and an unknown active id falls back to the first", () => {
  const w = migrate({
    blocks: starter,
    profileKey: "bold",
    classes: [
      { id: 10, name: "Homeroom", styleKey: "math", customPalette: palettes.math, fonts: defaultProfile.fonts },
      { id: 11, name: "AP Bio", styleKey: "custom", customPalette: { ...palettes.science, className: "AP Bio" }, fonts: defaultProfile.fonts },
    ],
    activeClassId: 999,
  });
  assert.equal(w.classes.length, 2);
  assert.equal(w.classes[0].name, "Homeroom");
  assert.equal(w.classes[1].name, "AP Bio");
  assert.equal(w.activeClassId, w.classes[0].id, "an active id that names no class falls back to the first");

  const kept = migrate({ blocks: starter, classes: [{ id: 10, name: "Homeroom", styleKey: "math" }], activeClassId: 10 });
  assert.equal(kept.activeClassId, 10, "a known active id survives");

  const empty = migrate({ blocks: starter, classes: [] });
  assert.equal(empty.classes.length, 1, "a workspace can never end up with zero classes");
});

test("a class's default card type survives migration only when it names a real profile", () => {
  const w = migrate({
    blocks: starter,
    classes: [
      { id: 20, name: "With default", styleKey: "math", profileKey: "editorial" },
      { id: 21, name: "Unknown default", styleKey: "math", profileKey: "neon" },
      { id: 22, name: "No default", styleKey: "math" },
    ],
  });
  assert.equal(w.classes[0].profileKey, "editorial");
  assert.ok(!("profileKey" in w.classes[1]), "an unknown card type is dropped, not kept as garbage");
  assert.ok(!("profileKey" in w.classes[2]), "a class stored before defaults existed gains no field");
});

test("saved posts survive migration with their blocks cleaned", () => {
  const w = migrate({
    blocks: starter,
    savedPosts: [{ id: 7, title: "Week 1", blocks: [{ id: 2, type: "note", title: "N", body: "B", animation: "x" }] }, "garbage"],
  });
  assert.equal(w.savedPosts.length, 1);
  assert.equal("animation" in w.savedPosts[0].blocks[0], false);
});

test("the local adapter survives storage that is missing, full or corrupt", async () => {
  const original = globalThis.localStorage;
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v },
  };
  try {
    assert.equal(await localAdapter.load(), null, "nothing stored yet");

    const workspace = migrate({ blocks: starter, postTitle: "Saved" });
    assert.equal(await localAdapter.save(workspace), true);
    assert.deepEqual(await localAdapter.load(), workspace);

    store[STORAGE_KEY] = "{ not json";
    assert.equal(await localAdapter.load(), null, "corrupt storage starts clean instead of throwing");

    globalThis.localStorage = {
      getItem: () => { throw new Error("denied") },
      setItem: () => { throw new Error("quota") },
    };
    assert.equal(await localAdapter.load(), null);
    assert.equal(await localAdapter.save(workspace), false); // must not throw: losing an autosave beats crashing
  } finally {
    globalThis.localStorage = original;
  }
});

test("backup filenames are findable six months later", () => {
  // The prefix is our name, and a row in docs/naming.md — if a rename lands and
  // this assertion is not updated with it, that is the rename being incomplete.
  assert.equal(backupFilename("Tuesday’s class post", "2026-08-12"), "baudstyler-tuesday-s-class-post-2026-08-12.json");
  assert.equal(backupFilename("", "2026-08-12"), "baudstyler-workspace-2026-08-12.json");
});

test("what the teacher typed is what the student reads", () => {
  // The editor hands back serialised HTML; safeRich escapes a tagless value a
  // second time. Before harvestRich, typing "Tom & Jerry" published the visible
  // text "Tom &amp; Jerry" — but only in a body carrying no markup, so adding a
  // bold word appeared to fix it. Each case is (what was typed, what innerHTML
  // gives back for it); each must survive the round trip reading as it started.
  const typed = [
    ["Tom & Jerry", "Tom &amp; Jerry"],
    ["under 5 < 10", "under 5 &lt; 10"],
    ["a > b", "a &gt; b"],
    ["5 < 10 & rising", "5 &lt; 10 &amp; rising"],
    ["Tom & Jerry bold", 'Tom &amp; Jerry <strong>bold</strong>'],
  ];
  for (const [wasTyped, fromTheEditor] of typed) {
    const published = safeRich(harvestRich(fromTheEditor));
    const element = document.createElement("div");
    element.innerHTML = published;
    assert.equal(element.textContent, wasTyped, `typed ${JSON.stringify(wasTyped)} · published ${JSON.stringify(published)}`);
  }
});

test("a doubled or trailing space never reaches the export as a non-breaking one", () => {
  // The browser substitutes U+00A0 for the second of two spaces and for one at
  // the end of a line. It is never what was meant, and it stops the line
  // wrapping. Both the rich and the plain boundary drop it.
  const NBSP = String.fromCharCode(0xa0);
  assert.equal(harvestRich("Bring&nbsp; two pens&nbsp;"), "Bring  two pens ");
  assert.equal(harvestRich(`Bring${NBSP} two`), "Bring  two");
  assert.equal(harvestRich(`keep <strong>the${NBSP}markup</strong>`), "keep <strong>the markup</strong>");
  assert.equal(harvestText(`UNIT${NBSP}UPDATE `), "UNIT UPDATE");
  assert.ok(!safeRich(harvestRich("Bring&nbsp; two")).includes("nbsp"));
});

test("a literal &nbsp; a teacher actually typed is still shown to them", () => {
  // harvestRich decodes the entity, so what survives is the text they typed,
  // escaped exactly once — not a non-breaking space and not a double escape.
  const published = safeRich(harvestRich("&amp;nbsp; is the entity"));
  const element = document.createElement("div");
  element.innerHTML = published;
  assert.equal(element.textContent, "&nbsp; is the entity");
});
