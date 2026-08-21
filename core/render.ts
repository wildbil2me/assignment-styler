/**
 * The product: blocks × profile × palette × surface -> self-contained
 * inline-styled HTML.
 *
 * Phase 2 rewrote this against tokens. There is no hex value and no magic pixel
 * count left in this file — every visual decision now lives in a profile
 * (`core/profiles/`) or a palette (`core/palettes.ts`), and every declaration
 * passes through `degrade.style()`, which drops what the tenant's measured
 * compat spec says would be stripped.
 *
 * Five things here are load-bearing and worth not "tidying" by accident:
 *
 *  - **Half-width cards carry two layouts in one markup.** The row wrapper asks
 *    for `display:flex;flex-wrap:wrap`, and the cards themselves still carry
 *    `inline-block` + `calc()` + `min-width`. Where flex survives (probe R09)
 *    the cards stretch to equal heights, which is what soft cards visibly
 *    needs; where it is stripped — or where the tenant's spec has not measured
 *    it — they fall back to exactly the prototype's inline-block behaviour
 *    (R07). No media query either way; Blackbaud strips `<style>` (R06).
 *  - **`.join("")` emits no whitespace between siblings.** Two inline-blocks at
 *    `calc(50% - n)` only share a line because there is no whitespace text node
 *    between them.
 *  - **Only shorthand `margin` and `padding` are emitted.** The probe measured
 *    the shorthands (R01, R07, R27); it never isolated `margin-right` or
 *    `padding-left`. Using the shorthands means the renderer claims nothing the
 *    probe did not actually establish.
 *  - **Bodies are wrapped in `<div>`, not `<p>`.** The prototype used `<p>`, and
 *    a list block therefore emitted `<p><ul>…</ul></p>` — invalid nesting that
 *    browsers silently repair but a WYSIWYG round trip is exactly the thing to
 *    mangle. Any body can contain a list, because the rich editor allows one
 *    anywhere, so every body container is a `div`. Headings stay semantic.
 *  - **`data-layout` is the importer's structural signal** and survives a round
 *    trip (R15).
 *  - **Font stacks are single-quoted** (`fontStack`), because Blackbaud rewrites
 *    double quotes to single ones on save. Emitting them that way means a round
 *    trip produces no churn to review.
 */

import type { Block, Palette, Profile, Surface } from "./model.ts";
import { blockMeta } from "./catalog.ts";
import { esc, safeRich } from "./sanitize.ts";
import { fontStack, resolveTone } from "./profiles/index.ts";
import { style } from "./degrade.ts";
import { stJohns, supportsElement, supportsStyle, type CompatSpec } from "./compat.ts";

export function renderHtml(
  blocks: Block[],
  profile: Profile,
  palette: Palette,
  surface: Surface,
  spec: CompatSpec = stJohns
): string {
  const s = (decls: Parameters<typeof style>[0]) => style(decls, spec, surface.key);
  const { card, hero, heading: head, fontSizes, spacing, lineHeights, colors } = profile;

  /** Half cards sit two to a row and share one gutter, so each gives up half. */
  const halfInset = px(card.gutter) / 2 + 4;

  /**
   * Flex is only worth asking for when the row can also wrap — without wrapping,
   * two cards at `min-width` overflow a phone instead of stacking. Where either
   * is unavailable the wrapper is omitted entirely and inline-block does the
   * whole job, exactly as it does today.
   */
  const canFlex =
    supportsStyle(spec, "display", surface.key) &&
    supportsStyle(spec, "flex-wrap", surface.key);

  const page = s([
    ["font-family", fontStack(profile.fonts.body)],
    ["color", colors.text],
    ["font-size", fontSizes.body],
    ["line-height", lineHeights.body],
    ["max-width", `${surface.width}px`],
    ["margin", "0 auto"],
  ]);

  const visible = blocks.filter((b) => !b.hidden);
  return `<div style="${page}">${rows(visible).map(renderRow).join("")}</div>`;

  /* ------------------------------------------------------------------ rows */

  /** A half-width block that is actually rendered as a card. */
  function isHalf(block: Block): boolean {
    return block.width === "half" && block.type !== "hero" && block.type !== "intro";
  }

  /**
   * Consecutive half-width blocks pair up; everything else stands alone.
   * Pairing runs of two is what stops a third half-width block from being
   * orphaned onto a line of its own with no partner.
   */
  function rows(list: Block[]): Block[][] {
    const out: Block[][] = [];
    for (const block of list) {
      const last = out[out.length - 1];
      if (isHalf(block) && last && last.length === 1 && isHalf(last[0])) last.push(block);
      else out.push([block]);
    }
    return out;
  }

  function renderRow(row: Block[]): string {
    const cards = row
      .map((b, i) => renderBlock(b, isHalf(b), isHalf(b) && i < row.length - 1))
      .join("");
    if (!isHalf(row[0]) || !canFlex) return cards;
    return `<div style="${s([
      ["display", "flex"],
      ["flex-wrap", "wrap"],
    ])}">${cards}</div>`;
  }

  /* ---------------------------------------------------------------- blocks */

  function renderBlock(b: Block, half: boolean, gutter: boolean): string {
    const title = esc(b.title);
    const icon = b.emoji ? `${esc(b.emoji)} ` : "";
    const body = renderBody(b);
    const alignment: [string, string] | null = b.align && b.align !== "left" ? ["text-align", b.align] : null;

    if (b.type === "hero") return renderHero(b, icon, title, body);

    if (b.type === "intro")
      return `<div style="${s([
        ["margin", `0 0 ${card.gap}`],
        ["font-size", fontSizes.body],
        ["line-height", lineHeights.body],
        alignment,
      ])}">${body}</div>`;

    const tone = resolveTone(profile, palette, blockMeta[b.type].tone);
    const label = title || blockMeta[b.type].label;

    const box = s([
      ["display", half ? "inline-block" : "block"],
      half && ["vertical-align", "top"],
      ["width", half ? `calc(50% - ${halfInset}px)` : "100%"],
      half && ["min-width", card.minWidth],
      ["margin", `0 ${gutter ? card.gutter : "0"} ${card.gap} 0`],
      ["padding", card.padding],
      ["background-color", tone.fill],
      ["border", `${card.borderWidth} solid ${tone.border}`],
      card.accentBar ? ["border-left", `${card.accentBar} solid ${tone.border}`] : null,
      ["border-radius", card.radius],
      ["box-shadow", card.shadow],
      alignment,
    ]);

    const headingStyle = s([
      ["margin", `0 0 ${spacing.xs}`],
      ["color", tone.label],
      ["font-family", fontStack(profile.fonts.heading)],
      ["font-size", head.size],
      ["font-weight", head.weight],
      ["letter-spacing", head.letterSpacing === "0" ? "" : head.letterSpacing],
      ["text-transform", head.transform === "none" ? "" : head.transform],
    ]);

    // Disclosure where the tenant keeps it (R40), an ordinary open card where it
    // does not — a compatibility decision must never hide a teacher's content.
    if (b.type === "details" && supportsElement(spec, "details", surface.key))
      return (
        `<details data-layout="${b.width || "full"}" style="${box}">` +
        `<summary style="${headingStyle}">${icon}${label}</summary>` +
        `<div style="${s([["margin", `${spacing.xs} 0 0`]])}">${body}</div>` +
        `</details>`
      );

    // A card heading is an `<h2>`, not a styled paragraph. Phase 4 decision D3:
    // the hero's `<h1>` was the only heading in the document, so a screen reader
    // heard one title and then a wall of paragraphs with no structure to skip
    // between. `h1`–`h4` are measured surviving on all three surfaces, and the
    // inline style already fixes size, weight and margin, so the tag changes and
    // the rendering does not.
    //
    // `<summary>` above is deliberately left alone. The spec permits a heading
    // inside it, but that nesting is unmeasured against Blackbaud, and this
    // renderer emits only what the probe verified.
    return (
      `<div data-layout="${b.width || "full"}" style="${box}">` +
      `<h2 style="${headingStyle}">${icon}${label}</h2>` +
      `<div style="${s([["margin", "0"]])}">${body}</div>` +
      `</div>`
    );
  }

  function renderHero(b: Block, icon: string, title: string, body: string): string {
    const rule = `${hero.ruleWidth} solid ${palette.accent}`;
    const alignment: [string, string] | null = b.align && b.align !== "left" ? ["text-align", b.align] : null;
    const frame = s([
      hero.rule === "top" ? ["border-top", rule] : null,
      hero.rule === "bottom" ? ["border-bottom", rule] : null,
      ["padding", hero.padding],
      ["margin", `0 0 ${card.gap}`],
      alignment,
    ]);

    const eyebrow = b.label?.trim()
      ? `<p style="${s([
          ["margin", `0 0 ${spacing.xxs}`],
          ["color", palette.accent],
          ["font-size", fontSizes.label],
          ["font-weight", profile.fontWeights.bold],
          ["letter-spacing", hero.labelLetterSpacing],
          ["text-transform", hero.labelTransform === "none" ? "" : hero.labelTransform],
        ])}">${esc(b.label)}</p>`
      : "";

    return (
      `<div style="${frame}">${eyebrow}` +
      `<h1 style="${s([
        ["margin", "0"],
        ["color", palette.primary],
        ["font-family", fontStack(profile.fonts.heading)],
        ["font-size", fontSizes.title],
        ["line-height", lineHeights.heading],
      ])}">${icon}${title}</h1>` +
      `<div style="${s([
        ["margin", `${spacing.xxs} 0 0`],
        ["color", colors.mutedText],
        ["font-size", fontSizes.muted],
      ])}">${body}</div>` +
      `</div>`
    );
  }

  /* ------------------------------------------------------------------ body */

  function renderBody(b: Block): string {
    const lines = b.body
      .split(/\n|<br\s*\/?\s*>/i)
      .map((x) => safeRich(x))
      .filter(Boolean);
    const list = s([
      ["margin", "0"],
      ["padding", `0 0 0 ${spacing.lg}`],
    ]);

    switch (b.type) {
      case "steps":
        return `<ol style="${list}">${lines.map((x) => `<li>${x}</li>`).join("")}</ol>`;
      case "checklist":
        return `<ul style="${s([
          ["margin", "0"],
          ["padding", `0 0 0 ${spacing.lg}`],
          ["list-style-type", "none"],
        ])}">${lines.map((x) => `<li>☐ ${x}</li>`).join("")}</ul>`;
      case "targets":
        return `<ul style="${list}">${lines.map((x) => `<li>${x}</li>`).join("")}</ul>`;
      case "quote":
        return `<blockquote style="${s([
          ["margin", "0"],
          ["font-family", fontStack(profile.fonts.heading)],
          ["font-style", "italic"],
        ])}">${safeRich(b.body)}</blockquote>`;
      default:
        return safeRich(b.body);
    }
  }
}

/** `"24px"` -> `24`. Profiles are authored in px; anything else falls back. */
function px(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}
