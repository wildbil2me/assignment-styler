/**
 * Compat-driven degradation: the layer between "what the profile asks for" and
 * "what this Blackbaud will keep".
 *
 * **It is much smaller than the plan scoped it, on purpose.** `degrade()` was
 * designed for a hostile target; Phase 0 measured a permissive one — 37 of 41
 * rows survive, including every property soft cards is made of. So against
 * St John's this file drops almost nothing, and the fallback table has three
 * entries rather than thirty.
 *
 * The mechanism stays because the mechanism is the portable part. Another
 * school runs the probe, gets a stricter `CompatSpec`, and the same build
 * degrades for them without a code change. Building fallbacks nothing currently
 * needs would be the mistake — see docs/blackbaud-compatibility.md.
 *
 * Three rules are structural rather than degradable, and `guard()` checks them:
 * never emit `<style>` (stripped everywhere, R06/R38 — it is the reason the
 * renderer inlines everything), never emit inline `<svg>` (stripped on
 * assignment, R37 — use a data-URI `<img>`), never emit animation (no
 * `@keyframes` without a style block, and SMIL cannot honour
 * `prefers-reduced-motion`).
 */

import { supportsStyle, type CompatSpec, type SurfaceKey } from "./compat.ts";
import { cssSafe } from "./sanitize.ts";

/** A declaration list, built by the renderer and serialized through the spec. */
export type Decls = Array<[property: string, value: string] | null | false | undefined>;

/**
 * What to emit instead when a property is unsupported. `null` means "drop it",
 * which is the right answer for every purely decorative property — a card
 * without its shadow is a card; a card with a fake shadow is worse than neither.
 */
const FALLBACKS: Record<string, (value: string) => [string, string] | null> = {
  // Rounded corners have no square-corner equivalent worth faking.
  "border-radius": () => null,
  // The border is already emitted alongside, so dropping the lift is enough.
  "box-shadow": () => null,
  // Where flex is stripped the children still carry inline-block + calc(), which
  // is exactly the prototype's layout. One markup, both outcomes, no fallback
  // to write.
  display: () => null,
};

/**
 * Serialize declarations, dropping what this tenant strips.
 *
 * Empty and `"0"`-valued decorative properties are skipped before the spec is
 * consulted, so a profile can opt out of a treatment with `""` rather than the
 * renderer branching on it.
 */
export function style(
  decls: Decls,
  spec: CompatSpec,
  surface: SurfaceKey
): string {
  let out = "";
  for (const decl of decls) {
    if (!decl) continue;
    const [prop, value] = decl;
    if (value === "" || value == null) continue;
    if (supportsStyle(spec, prop, surface)) {
      out += `${prop}:${cssSafe(value)};`;
      continue;
    }
    const fallback = FALLBACKS[prop]?.(value);
    if (fallback && supportsStyle(spec, fallback[0], surface))
      out += `${fallback[0]}:${cssSafe(fallback[1])};`;
  }
  return out;
}

/**
 * The structural rules, checked rather than trusted.
 *
 * Returns a list of violations — empty means clean. Tests assert on it, and
 * `checks.ts` reports it to the teacher as the "Blackbaud-safe structure" row —
 * which is what replaced the four hardcoded ticks the old panel showed.
 */
export function guard(html: string, spec: CompatSpec): string[] {
  const problems: string[] = [];
  if (/<style[\s>]/i.test(html))
    problems.push("emits a <style> block, which Blackbaud strips on every surface");
  if (/<svg[\s>]/i.test(html))
    problems.push("emits inline <svg>, which the assignment surface strips — use a data-URI <img>");
  if (/<(animate|animateTransform|set)[\s>]/i.test(html))
    problems.push("emits SMIL animation, which cannot honour prefers-reduced-motion");
  if (/@keyframes/i.test(html)) problems.push("emits @keyframes, which needs a <style> block");
  if (spec.animation === false && /animation\s*:/i.test(html))
    problems.push("emits a CSS animation property, which cannot work inline");
  return problems;
}
