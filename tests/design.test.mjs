import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { contrastRatio } from "../core/checks.ts";

const tokens = JSON.parse(readFileSync(new URL("../design/tokens.json", import.meta.url), "utf8"));
const ratio = (foreground, background) => contrastRatio(foreground, background);

test("every admin-chrome text pair clears the WCAG 2.2 AA small-text floor", () => {
  const pairs = [
    [tokens.color.text.primary, tokens.color.surface.panel, "primary on panel"],
    [tokens.color.text.secondary, tokens.color.surface.panel, "secondary on panel"],
    [tokens.color.text.secondary, tokens.color.surface.barInset, "secondary on inset"],
    [tokens.color.onDark.text, tokens.color.chrome.gradientStart, "header text at gradient start"],
    [tokens.color.onDark.text, tokens.color.chrome.gradientMid, "header text at gradient midpoint"],
    [tokens.color.onDark.text, tokens.color.chrome.gradientEnd, "header text at gradient end"],
    [tokens.accent.positive.deep, tokens.accent.positive.wash, "positive text on wash"],
    [tokens.accent.interactive.deep, tokens.accent.interactive.wash, "interactive text on wash"],
    [tokens.accent.warning.deep, tokens.accent.warning.wash, "warning text on wash"],
    [tokens.accent.danger.deep, tokens.accent.danger.wash, "danger text on wash"],
    [tokens.accent.caution.deep, tokens.accent.caution.wash, "caution text on wash"],
  ];
  for (const [foreground, background, label] of pairs)
    assert.ok(ratio(foreground, background) >= 4.5, `${label}: ${ratio(foreground, background).toFixed(2)}:1`);
});

test("focus and selected boundaries clear the non-text contrast floor", () => {
  assert.ok(ratio(tokens.accent.interactive.strong, tokens.color.surface.panel) >= 3);
  assert.ok(ratio(tokens.accent.interactive.deep, tokens.color.surface.panel) >= 3);
  assert.equal(tokens.contrast.acceptedDebt["#e0e4ea on #fff"], 1.28, "the one low-contrast control boundary remains explicit debt");
});

test("reviewed conformance suppressions are complete and narrowly located", () => {
  const suppressions = JSON.parse(readFileSync(new URL("../design/suppressions.json", import.meta.url), "utf8"));
  assert.ok(suppressions.length > 0);
  for (const suppression of suppressions) {
    assert.match(suppression.rule, /^[A-Z]+-\d+(?:\/[A-Z]+-\d+)?$/);
    assert.match(suppression.source, /\.(?:tsx|js|html)/);
    assert.ok(suppression.reason.length >= 40);
    assert.ok(suppression.reviewer);
    assert.match(suppression.reviewDate, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test("the extension permission surface does not grow", () => {
  const manifest = JSON.parse(readFileSync(new URL("../apps/ext/public/manifest.json", import.meta.url), "utf8"));
  assert.deepEqual([...manifest.permissions].sort(), ["sidePanel", "storage"]);
});
