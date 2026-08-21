/**
 * Verifies the probe analyzer against fabricated versions of what Blackbaud
 * might hand back. Run: node --test tools/probe/
 *
 * The fixtures are deliberately adversarial — the analyzer's job is to tell
 * "survived" from "quietly rewritten", and the second is the one that would
 * otherwise ship as a false compatibility claim.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { analyze, analyzeRow, declOf, markerTargets, originalDecls, markerEl, subMarker } from "./analyze.mjs";
import { rows } from "./rows.mjs";

const parse = (html) => parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
const row = (id) => rows.find((r) => r.id === id);
const pristine = (id) => parse(row(id).html);
const verdictOf = (id, html) => analyze(parse(html), row(id), parse).verdict;

/* ---------------------------------------------------------------- helpers */

test("declOf reads one declaration without matching prefixes", () => {
  const s = "border:1px solid red;border-radius:16px;padding:4px;";
  assert.equal(declOf(s, "border-radius"), "border-radius:16px");
  assert.equal(declOf(s, "border"), "border:1px solid red");
  assert.equal(declOf(s, "margin"), null);
});

test("declOf tolerates whitespace and trailing semicolons", () => {
  assert.equal(declOf("  color : #FFF ; ", "color"), "color : #FFF");
  assert.equal(declOf("", "color"), null);
  assert.equal(declOf(null, "color"), null);
});

test("originalDecls finds what we sent, across multiple style attributes", () => {
  assert.deepEqual(originalDecls(row("R02"), "border-radius"), ["border-radius:16px"]);
  assert.deepEqual(originalDecls(row("R08"), "border-left"), ["border-left:6px solid #C99700"]);
});

test("markerEl returns the deepest element carrying the marker", () => {
  const doc = pristine("R35"); // three nested divs
  const el = markerEl(doc, "R35");
  assert.equal(el.tagName.toLowerCase(), "div");
  assert.equal(el.querySelectorAll("div").length, 0, "should be the innermost div");
});

test("markerEl matches suffixed markers like [R07a]", () => {
  assert.ok(markerEl(pristine("R07"), "R07"));
});

test("subMarker identifies which lettered variant an element carries", () => {
  assert.equal(subMarker("[R04c] dark fill with light text", "R04"), "R04c");
  assert.equal(subMarker("[R02] rounded?", "R02"), "R02");
});

test("each sub-marker is compared against its own declaration, not the row's first", () => {
  // R04 sends three different background-colors. R04c was sent #243B53; without
  // per-sub-marker matching this reported a false rewrite against #FFFBF0.
  assert.equal(analyze(pristine("R04"), row("R04"), parse).verdict, "survived");
  assert.equal(
    verdictOf("R04", '<div style="background-color:#000000;">[R04c] recoloured</div>'),
    "rewritten"
  );
  // R20 (Georgia / Arial) and R22 (28/19/14px) have the same shape.
  assert.equal(analyze(pristine("R20"), row("R20"), parse).verdict, "survived");
  assert.equal(analyze(pristine("R22"), row("R22"), parse).verdict, "survived");
});

test("a multi-value row evaluates every marker and reports the failing value", () => {
  assert.deepEqual(markerTargets(row("R48")), ["R48a", "R48b", "R48c", "R48d"]);
  assert.equal(analyzeRow(pristine("R48"), row("R48"), parse).verdict, "survived");

  const changed = row("R48").html.replace("text-align:center", "text-align:left");
  const result = analyzeRow(parse(changed), row("R48"), parse);
  assert.equal(result.verdict, "rewritten");
  assert.match(result.detail, /R48b: sent text-align:center · got text-align:left/);
  assert.match(result.detail, /R48d: text-align:justify/);
});

test("without a parser, any value the row sent counts — never a false rewrite", () => {
  assert.equal(analyze(pristine("R04"), row("R04")).verdict, "survived");
  assert.deepEqual(originalDecls(row("R22"), "font-size"), [
    "font-size:28px",
    "font-size:19px",
    "font-size:14px",
  ]);
});

/* ------------------------------------------------- every row on a clean doc */

test("every row reports survived (or manual) against its own pristine html", () => {
  for (const r of rows) {
    const { verdict, detail } = analyzeRow(parse(r.html), r, parse);
    const expected = r.check === "manual" ? "manual" : "survived";
    assert.equal(verdict, expected, `${r.id} ${r.name}: got ${verdict} — ${detail}`);
  }
});

test("every check kind is one the analyzer implements", () => {
  const kinds = new Set(rows.map((r) => r.check.split(":")[0]));
  assert.deepEqual([...kinds].sort(), ["attr", "doc", "has", "manual", "style", "tag"]);
});

test("row ids are unique and every row carries its own marker", () => {
  const ids = rows.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate row id");
  for (const r of rows) {
    if (r.check === "doc") continue;
    assert.ok(r.html.includes(`[${r.id}`), `${r.id} has no [${r.id}] marker in its html`);
  }
});

/* ------------------------------------------------ the four damage scenarios */

test("stripped: the property is removed but the element and marker remain", () => {
  assert.equal(
    verdictOf("R02", '<div style="background-color:#F1F5FA;padding:14px;">[R02] rounded?</div>'),
    "stripped"
  );
});

test("stripped: the style attribute is removed entirely", () => {
  assert.equal(verdictOf("R02", "<div>[R02] rounded?</div>"), "stripped");
});

test("rewritten: the value is changed — the failure mode that must not read as survived", () => {
  const res = analyze(
    parse('<div style="border-radius:4px;padding:14px;">[R02] rounded?</div>'),
    row("R02")
  );
  assert.equal(res.verdict, "rewritten");
  assert.match(res.detail, /border-radius:16px/, "should show what we sent");
  assert.match(res.detail, /border-radius:4px/, "should show what came back");
});

test("rewritten is insensitive to whitespace and quote-style reformatting", () => {
  assert.equal(
    verdictOf("R02", '<div style="border-radius: 16px ; padding:14px;">[R02] rounded?</div>'),
    "survived"
  );
});

test("missing: the marker is gone, so the content itself was dropped", () => {
  assert.equal(verdictOf("R02", "<div>something else entirely</div>"), "missing");
});

test("style found on an ancestor still counts, and says where", () => {
  const res = analyze(
    parse('<div style="border-radius:16px;"><span>[R02] rounded?</span></div>'),
    row("R02")
  );
  assert.equal(res.verdict, "survived");
  assert.match(res.detail, /ancestor \+1/);
});

/* ------------------------------------------------------ non-style checks */

test("doc: the style-block rows key off surviving <style> content", () => {
  assert.equal(verdictOf("R06", row("R06").html), "survived");
  assert.equal(
    verdictOf("R06", '<p class="probe-styled">[R06] style block gone</p>'),
    "stripped",
    "class kept but the rule dropped is still a strip"
  );
  assert.equal(verdictOf("R38", "<p>[R38] no keyframes here</p>"), "stripped");
});

test("attr: data-* and class removal is detected", () => {
  assert.equal(verdictOf("R15", '<div style="padding:12px;">[R15] no data attr</div>'), "stripped");
  assert.equal(verdictOf("R14", '<div class="probe-class-marker">[R14] kept</div>'), "survived");
});

test("attr: a stripped href is caught even though the link text survives", () => {
  assert.equal(verdictOf("R30", "<p><a>[R30] unlinked</a></p>"), "stripped");
});

test("tag: an h1 downgraded to a styled paragraph reads as rewritten, not survived", () => {
  const res = analyze(
    parse('<p style="font-size:30px;font-weight:700;">[R24] was an h1</p>'),
    row("R24")
  );
  assert.equal(res.verdict, "rewritten");
  assert.match(res.detail, /marker now sits in <p>/);
});

test("tag: blockquote unwrapped to a plain div", () => {
  assert.equal(verdictOf("R26", "<div>[R26] no longer quoted</div>"), "rewritten");
});

test("has: a dropped <img> is detected while the surrounding text survives", () => {
  assert.equal(verdictOf("R36", "<p>[R36] image follows: </p>"), "stripped");
  assert.equal(verdictOf("R39", "<p>[R39] <svg><circle></circle></svg></p>"), "stripped");
});

/* ------------------------------------------------------- realistic sweeps */

test("a tenant that strips all inline styles: no row falsely reports survived", () => {
  const naked = rows.map((r) => r.html.replace(/ style="[^"]*"/g, "")).join("");
  const doc = parse(naked);
  for (const r of rows) {
    if (r.check.startsWith("style:")) {
      assert.equal(analyze(doc, r, parse).verdict, "stripped", `${r.id} should be stripped`);
    }
  }
});

test("a tenant that keeps everything: the style rows all pass together", () => {
  const doc = parse(rows.map((r) => r.html).join(""));
  for (const r of rows) {
    if (r.check.startsWith("style:")) {
      assert.equal(analyze(doc, r, parse).verdict, "survived", `${r.id} should survive`);
    }
  }
});

test("markers stay distinguishable when every row shares one document", () => {
  const doc = parse(rows.map((r) => r.html).join(""));
  for (const r of rows) {
    if (r.check === "manual" || r.check === "doc") continue;
    const el = markerEl(doc, r.id);
    assert.ok(el, `${r.id} marker not found in the combined document`);
    assert.match(el.textContent, new RegExp(`\\[${r.id}`), `${r.id} matched the wrong element`);
  }
});
