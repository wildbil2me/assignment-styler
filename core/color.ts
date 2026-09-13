/**
 * Colour maths, and the one colour decision the renderer and the checker have
 * to agree on.
 *
 * It lives apart from both because `checks.ts` imports `render.ts` — it is
 * handed the markup it judges rather than producing it a second time — so
 * anything they share has to sit underneath the pair. Everything here was in
 * `checks.ts` until the eyebrow needed a readable colour at render time;
 * `checks.ts` re-exports it all, so nothing that imported it from there had to
 * move.
 */

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

/* ------------------------------------------------------- readable variants */

const toHsl = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0;
  if (d) h = (max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4) / 6;
  const l = (max + min) / 2;
  return [h, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
};

const toHex = ([h, s, l]: [number, number, number]): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const t = h * 6;
  const [r, g, b] = (t < 1 ? [c, x, 0] : t < 2 ? [x, c, 0] : t < 3 ? [0, c, x] : t < 4 ? [0, x, c] : t < 5 ? [x, 0, c] : [c, 0, x])
    .map((v) => Math.round((v + l - c / 2) * 255));
  return "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("").toUpperCase();
};

/**
 * The same colour, dark enough to read at small sizes on `background`.
 *
 * Every shipped accent is a mid-tone chosen for borders and fills, and the hero
 * eyebrow is 12px bold — small text, so WCAG wants 4.5:1 and all six palettes
 * came in between 2.65 and 3.49. Darkening the accents themselves would repaint
 * every card border, hero rule and class dot to fix one kicker, so only the text
 * moves, and only far enough.
 *
 * Lightness alone changes: the hue and saturation a teacher picked are the hue
 * and saturation they keep, which is why this is derived rather than a seventh
 * authored token — a custom palette gets the same treatment for free, and the
 * style editor stops reporting a failure it offered no way to fix.
 *
 * Returns the colour untouched when it already clears, or when it is not a hex
 * this can reason about — never a silent black.
 */
export function readableOn(color: string, background: string, required: number): string {
  const rgb = parseHex(color);
  const current = contrastRatio(color, background);
  if (!rgb || current === null || current >= required) return color;
  const [h, s, l0] = toHsl(rgb);
  for (let l = l0; l >= 0; l -= 0.005) {
    const candidate = toHex([h, s, l]);
    const ratio = contrastRatio(candidate, background);
    if (ratio !== null && ratio >= required) return candidate;
  }
  return color;
}
