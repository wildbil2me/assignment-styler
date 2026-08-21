/**
 * What the composer can honestly say about a post before it is published.
 *
 * This replaces four hardcoded ✓ rows and a hardcoded `4/4`. The old panel
 * asserted "accessible color contrast" without looking at a single colour, and
 * that claim was false for all six shipped palettes — the hero eyebrow runs
 * 2.65:1 to 3.49:1 against a white page and needs 4.5:1.
 *
 * The design rule this file exists to enforce: **a check that could not be
 * computed must be impossible to render as a tick.** Hence three states, not
 * two. `unknown` carries the reason, and the score counts it separately from
 * both passes and failures.
 *
 * It mirrors `renderHtml`'s parameter order deliberately. The checker reads the
 * same inputs, in the same order, through the same `resolveTone` — so it cannot
 * drift from what was actually rendered.
 */

import type { Block, Palette, Profile, Surface } from "./model.ts";
import { blockMeta } from "./catalog.ts";
import { resolveTone } from "./profiles/index.ts";
import { guard } from "./degrade.ts";
import { renderHtml } from "./render.ts";
import { stJohns, supportsElement, supportsHeadingInSummary, supportsStyle, type CompatSpec } from "./compat.ts";

/* ------------------------------------------------------------------ types */

export type CheckStatus = "pass" | "fail" | "unknown";

export type Check = {
  id: string;
  /** What was examined, phrased as the thing itself, not as a claim about it. */
  label: string;
  status: CheckStatus;
  /** The evidence when checked; the reason when not. */
  detail: string;
  /** Blocks a teacher would have to edit to fix this. */
  blockIds: number[];
};

export type CheckReport = {
  checks: Check[];
  /** Passes over checks *attempted*. Unknowns are in neither. */
  passed: number;
  checked: number;
  unknown: number;
  failed: number;
  /** Whose Blackbaud these answers are about. */
  tenant: string;
  measured: string;
  /** False when running against `conservative` — nobody has probed this tenant. */
  tenantMeasured: boolean;
};

/**
 * WCAG needs a background to compare against, and the renderer never sets one:
 * cards are tinted, but the hero and intro sit directly on Blackbaud's own page
 * background, which we do not control and have not measured.
 *
 * Phase 4 decision D1: assume white, and say so in every row that depends on it.
 * White is almost certainly right and it keeps the largest text on the page
 * checkable; the alternative marks half the pairs permanently unknown. The
 * assumption is stated in the detail string rather than buried here.
 */
export const ASSUMED_PAGE_BACKGROUND = "#FFFFFF";

/* --------------------------------------------------------------- contrast */

/** `#abc` and `#aabbcc`. Anything else — `rgba()`, a named colour, junk from an
 *  imported style file — returns null, which becomes an `unknown`, not a pass. */
export function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.x relative luminance. Internal — `contrastRatio` is the entry point. */
function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Null when either colour is not a hex the formula can take. */
export function contrastRatio(foreground: string, background: string): number | null {
  const [f, b] = [parseHex(foreground), parseHex(background)];
  if (!f || !b) return null;
  const [hi, lo] = [relativeLuminance(f), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * WCAG large text: 24px, or 18.66px at bold. Both thresholds come from the
 * profile's own tokens rather than constants in this file, so a new profile is
 * judged by its own type scale — and note that soft's 16px/700 card heading is
 * *not* large, and needs the full 4.5:1.
 */
export function isLargeText(sizePx: number, weight: number): boolean {
  return sizePx >= 24 || (weight >= 700 && sizePx >= 18.66);
}

export function requiredRatio(sizePx: number, weight: number): number {
  return isLargeText(sizePx, weight) ? 3 : 4.5;
}

function px(value: string): number {
  return parseFloat(value) || 0;
}

/* ----------------------------------------------------------------- pairs */

type Pair = {
  what: string;
  foreground: string;
  background: string;
  sizePx: number;
  weight: number;
  blockId: number;
};

/** One pair's verdict, or null when it could not be computed. */
function judge(pair: Pair): { ratio: number; required: number; ok: boolean } | null {
  const ratio = contrastRatio(pair.foreground, pair.background);
  if (ratio === null) return null;
  const required = requiredRatio(pair.sizePx, pair.weight);
  return { ratio, required, ok: ratio >= required };
}

/**
 * Fold a set of pairs into one check. The worst ratio is the headline, because
 * that is the one a student with low vision actually struggles with, and the
 * failing pairs are named so the teacher knows which block to open.
 */
function summarize(id: string, label: string, pairs: Pair[], note: string): Check {
  if (!pairs.length)
    return { id, label, status: "unknown", detail: "Nothing of this kind in the post.", blockIds: [] };

  const unreadable = pairs.filter((p) => judge(p) === null);
  if (unreadable.length === pairs.length)
    return {
      id,
      label,
      status: "unknown",
      detail: `Colours are not plain hex values (${unreadable[0].foreground} on ${unreadable[0].background}), so contrast cannot be computed.`,
      blockIds: unreadable.map((p) => p.blockId),
    };

  const judged = pairs.map((p) => ({ pair: p, verdict: judge(p) })).filter((x) => x.verdict);
  const failing = judged.filter((x) => !x.verdict!.ok);
  const worst = judged.reduce((a, b) => (a.verdict!.ratio <= b.verdict!.ratio ? a : b));
  const ratio = (n: number) => `${n.toFixed(2)}:1`;

  if (failing.length) {
    const names = [...new Set(failing.map((x) => x.pair.what))].join(", ");
    return {
      id,
      label,
      status: "fail",
      detail: `${names} — ${ratio(worst.verdict!.ratio)}, needs ${worst.verdict!.required}:1. ${note}`,
      blockIds: [...new Set(failing.map((x) => x.pair.blockId))],
    };
  }

  return {
    id,
    label,
    status: "pass",
    detail: `${judged.length} pair${judged.length === 1 ? "" : "s"} checked, lowest ${ratio(worst.verdict!.ratio)} against ${worst.verdict!.required}:1. ${note}`,
    blockIds: [],
  };
}

/* ----------------------------------------------------------------- checks */

export function runChecks(
  blocks: Block[],
  profile: Profile,
  palette: Palette,
  surface: Surface,
  spec: CompatSpec = stJohns,
  html?: string
): CheckReport {
  const visible = blocks.filter((b) => !b.hidden);
  const { fontSizes, fontWeights, colors, heading } = profile;
  const normal = px(fontWeights.normal) || 400;
  const bold = px(fontWeights.bold) || 700;
  const ground = ASSUMED_PAGE_BACKGROUND;
  const assumption = `Assumes a white page background — Blackbaud's own is not something the composer can see.`;

  /* Cards. `hero` and `intro` are not cards, so they are excluded exactly the
     way render.ts excludes them. */
  const cards = visible.filter((b) => b.type !== "hero" && b.type !== "intro");
  const bodyPairs: Pair[] = [];
  const headingPairs: Pair[] = [];
  for (const b of cards) {
    const tone = resolveTone(profile, palette, blockMeta[b.type].tone);
    const name = b.title || blockMeta[b.type].label;
    bodyPairs.push({
      what: `body text in “${name}”`,
      foreground: colors.text,
      background: tone.fill,
      sizePx: px(fontSizes.body),
      weight: normal,
      blockId: b.id,
    });
    headingPairs.push({
      what: `the heading “${name}”`,
      foreground: tone.label,
      background: tone.fill,
      sizePx: px(heading.size),
      weight: px(heading.weight) || bold,
      blockId: b.id,
    });
  }

  /* Everything sitting on the page itself. */
  const groundPairs: Pair[] = [];
  for (const b of visible) {
    if (b.type === "hero") {
      if (b.label?.trim())
        groundPairs.push({
          what: `the “${b.label.trim()}” label`,
          foreground: palette.accent,
          background: ground,
          sizePx: px(fontSizes.label),
          weight: bold,
          blockId: b.id,
        });
      groundPairs.push({
        what: "the page title",
        foreground: palette.primary,
        background: ground,
        sizePx: px(fontSizes.title),
        weight: normal,
        blockId: b.id,
      });
      if (b.body.trim())
        groundPairs.push({
          what: "the subtitle",
          foreground: colors.mutedText,
          background: ground,
          sizePx: px(fontSizes.muted),
          weight: normal,
          blockId: b.id,
        });
    }
    if (b.type === "intro")
      groundPairs.push({
        what: "the introduction",
        foreground: colors.text,
        background: ground,
        sizePx: px(fontSizes.body),
        weight: normal,
        blockId: b.id,
      });
  }

  const checks: Check[] = [
    summarize("contrast-body", "Body text against its card", bodyPairs, "Card fills are set by the profile."),
    summarize("contrast-heading", "Card headings against their card", headingPairs, `At ${heading.size}/${heading.weight} these are small text, so 4.5:1 applies.`),
    summarize("contrast-ground", "Text sitting on the page itself", groundPairs, assumption),
    headingOrder(visible, spec, surface),
    structure(html ?? renderHtml(blocks, profile, palette, surface, spec), spec),
    surfaceSupport(visible, spec, surface),
  ];

  const failed = checks.filter((c) => c.status === "fail").length;
  const passed = checks.filter((c) => c.status === "pass").length;
  const unknown = checks.filter((c) => c.status === "unknown").length;

  return {
    checks,
    passed,
    failed,
    unknown,
    checked: passed + failed,
    tenant: spec.tenant,
    measured: spec.measured,
    tenantMeasured: spec.measured !== "",
  };
}

/**
 * Heading structure. Since Phase 4 promoted card headings, a post is one `<h1>`
 * followed by `<h2>`s — which is the whole of what this renderer can produce, so
 * the only things worth flagging are a missing title, two titles, and a title
 * that isn't first.
 */
function headingOrder(visible: Block[], spec: CompatSpec, surface: Surface): Check {
  const heroes = visible.filter((b) => b.type === "hero");
  const id = "heading-order";
  const label = "Heading structure";

  if (!heroes.length)
    return {
      id,
      label,
      status: "fail",
      detail: "No page title, so the post starts at <h2> with nothing above it. Add a Page title block.",
      blockIds: [],
    };
  if (heroes.length > 1)
    return {
      id,
      label,
      status: "fail",
      detail: `${heroes.length} page titles, so the post has ${heroes.length} <h1>s. Keep one and make the others card headings.`,
      blockIds: heroes.slice(1).map((b) => b.id),
    };
  if (visible[0] !== heroes[0])
    return {
      id,
      label,
      status: "fail",
      detail: "The page title is not the first block, so the document opens below its own heading.",
      blockIds: [heroes[0].id],
    };

  const cards = visible.filter((b) => b.type !== "hero" && b.type !== "intro");
  // A disclosure contributes a heading only where R43 measured that nesting.
  const disclosures = cards.filter(
    (b) => b.type === "details" && supportsElement(spec, "details", surface.key) &&
      !supportsHeadingInSummary(spec, surface.key)
  );
  const detail = `One <h1> and ${cards.length - disclosures.length} <h2>${cards.length - disclosures.length === 1 ? "" : "s"}, in order.`;

  return {
    id,
    label,
    status: "pass",
    detail: disclosures.length
      ? `${detail} ${disclosures.length} collapsible section${disclosures.length === 1 ? " is" : "s are"} announced as a disclosure rather than a heading.`
      : detail,
    blockIds: [],
  };
}

/** The structural rules, run against the real output rather than asserted. */
function structure(html: string, spec: CompatSpec): Check {
  const problems = guard(html, spec);
  const inlineOnly = !/<style[\s>]/i.test(html) && !/\sclass=/i.test(html);
  if (problems.length)
    return {
      id: "structure",
      label: "Blackbaud-safe structure",
      status: "fail",
      detail: `The export ${problems.join("; ")}.`,
      blockIds: [],
    };
  return {
    id: "structure",
    label: "Blackbaud-safe structure",
    status: "pass",
    detail: inlineOnly
      ? "Every style is inline, no <style> block, no stylesheet class, no animation."
      : "No <style> block, no inline <svg>, no animation.",
    blockIds: [],
  };
}

/**
 * What this tenant does to what the post is made of. Everything here is derived
 * from the spec rather than retyped, so a school that runs the probe and swaps
 * `core/compat.ts` gets warnings about *their* Blackbaud.
 */
function surfaceSupport(visible: Block[], spec: CompatSpec, surface: Surface): Check {
  const notes: string[] = [];
  const affected: number[] = [];

  const disclosures = visible.filter((b) => b.type === "details");
  if (disclosures.length && !supportsElement(spec, "details", surface.key)) {
    notes.push(
      `collapsible sections render as ordinary open cards, because ${surface.name} strips <details>`
    );
    affected.push(...disclosures.map((b) => b.id));
  }

  const halves = visible.filter(
    (b) => b.width === "half" && b.type !== "hero" && b.type !== "intro"
  );
  if (halves.length && !supportsStyle(spec, "flex-wrap", surface.key)) {
    notes.push("half-width blocks fall back to inline-block, which still stacks on a phone");
    affected.push(...halves.map((b) => b.id));
  }

  if (spec.unlistedStyles === "deny")
    notes.push(
      "any style property this tenant has not measured is dropped, so the export is plainer than the preview"
    );

  if (!spec.measured)
    return {
      id: "surface",
      label: `What ${surface.name} keeps`,
      status: "unknown",
      detail: `Nobody has run the probe against ${spec.tenant}. These answers are assumptions, not measurements — run docs/compat-probe.html to replace them.`,
      blockIds: [],
    };

  // Substitutions are not failures. `degrade()` is built so that a compatibility
  // decision never hides a teacher's content — a stripped `<details>` becomes an
  // ordinary open card, a stripped `flex` falls back to inline-block. So this
  // check passes when everything survives *in some form*, and the detail says
  // which form. It would only fail if something were actually lost.
  return {
    id: "surface",
    label: `What ${surface.name} keeps`,
    status: "pass",
    detail: notes.length
      ? `Measured ${spec.measured} against ${spec.tenant}. ${notes.length === 1 ? "One thing changes" : `${notes.length} things change`} on the way out: ${notes.join("; ")}.`
      : `Measured ${spec.measured} against ${spec.tenant}: everything this post uses survives unchanged.`,
    blockIds: [...new Set(affected)],
  };
}
