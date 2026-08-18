/**
 * Blackbaud compatibility rules, as data.
 *
 * Measured 2026-08-12 against one tenant across three surfaces — see
 * docs/blackbaud-compatibility.md for the method and the full result table.
 *
 * This is deliberately overridable. Another school's Blackbaud instance may be
 * stricter, and the only honest way to know is to run docs/compat-probe.html
 * against it. `render()` consults a spec; it never assumes this one.
 */

import type { SurfaceKey } from "./model.ts";

export type { SurfaceKey };

/** true / false everywhere, or per-surface where they disagree. */
export type Support = boolean | Partial<Record<SurfaceKey, boolean>>;

export interface CompatSpec {
  /** Identifies whose Blackbaud this describes. */
  readonly tenant: string;
  /** ISO date the probe was last run. */
  readonly measured: string;
  readonly surfaces: readonly SurfaceKey[];

  /** Inline style properties, by measured verdict. Absent means unmeasured. */
  readonly styles: Readonly<Record<string, Support>>;

  /**
   * What to do with a property that is not listed above.
   *
   * `"allow"` is only honest for a tenant whose probe showed **property-level
   * filtering does not happen** — St John's stripped four things, all of them
   * elements (`<style>`, inline `<svg>`), and re-serialized every style
   * attribute it kept without dropping a single declaration, including ones it
   * has no reason to know like `gap`. Against that evidence, denying an
   * unlisted property would invent a restriction the measurement contradicts.
   *
   * `"deny"` is the right default for a tenant nobody has measured: unmeasured
   * is not permission.
   */
  readonly unlistedStyles: "allow" | "deny";
  /** Elements safe to emit. */
  readonly elements: Readonly<Record<string, Support>>;

  /**
   * The three fields below are **measured facts, not switches.** Nothing reads
   * them; they are here so the spec records what the probe found rather than
   * leaving it implied by omission. Don't add a fourth without a consumer — see
   * the note on attributes at the foot of this comment block.
   *
   * Stripped on every surface measured so far, and the reason the renderer
   * inlines everything. Enforced by `guard()`, which greps the output for
   * `<style` rather than consulting this field.
   */
  readonly styleBlocks: false;
  /**
   * No @keyframes without a style block, and SMIL cannot honour reduced-motion.
   * The one fact here that *is* read: `guard()` checks `spec.animation`.
   */
  readonly animation: false;

  /**
   * Blackbaud re-serializes every style attribute: a space after each colon,
   * standalone colour longhands lowercased, double quotes normalized to single.
   * Nothing is semantically altered, but byte-exact comparison against stored
   * HTML will always differ — compare normalized, never raw.
   *
   * ---
   *
   * **Attributes are deliberately not modelled.** There used to be an
   * `attributes` map here, and a `supportsAttribute()` to read it, and nothing
   * ever called either — while `render.ts` emitted `style` and `data-layout`
   * unconditionally. So the spec advertised a safety net that did not exist,
   * which is worse than not advertising one. Every attribute the renderer emits
   * (`style`, `href`, `alt`, `target`, `rel`, `class`, `data-layout`) measured
   * true on all three surfaces — `data-layout` is R15, and it surviving a round
   * trip is what the importer's structural signal depends on. If a school ever
   * probes a tenant that strips one, add the map *and* the branch in `render.ts`
   * in the same change. Per `degrade.ts`: building fallbacks nothing currently
   * needs is the mistake.
   */
  readonly reserializesStyles: true;
}

export const stJohns: CompatSpec = {
  tenant: "St John's",
  measured: "2026-08-12",
  surfaces: ["bulletin", "topic", "assignment"],

  /** No inline style property was observed being stripped. See the field doc. */
  unlistedStyles: "allow",

  styles: {
    // Soft cards depends on these four. All verified on all three surfaces.
    "border-radius": true,
    "box-shadow": true,
    "background-color": true,
    color: true,

    "border": true,
    "border-left": true,
    "padding": true,
    "margin": true,
    "width": true,
    "min-width": true,
    "max-width": true,
    "display": true, // inline-block, flex and grid all survive

    /**
     * Listed explicitly despite `unlistedStyles: "allow"`, because it gates a
     * layout decision: render.ts only emits the half-width flex row when this is
     * true, and falls back to inline-block when it is not, so this line is the
     * one place to flip if a tenant turns out to strip it. Currently inferred
     * from R09 rather than isolated — probe row R42 settles it on the next run.
     */
    "flex-wrap": true,
    "float": true,
    "vertical-align": true,
    "font-family": true,
    "font-size": true,
    "font-weight": true,
    "font-style": true,
    "line-height": true,
    "letter-spacing": true,
    "text-align": true,
    "text-decoration": true,
    "text-transform": true,
    "list-style-type": true,
    "opacity": true,
    "background": true, // including linear-gradient()
  },

  elements: {
    div: true, p: true, span: true, br: true, a: true,
    h1: true, h2: true, h3: true, h4: true,
    ul: true, ol: true, li: true, blockquote: true,
    table: true, tbody: true, tr: true, td: true, th: true,
    img: true,

    /** Native disclosure, no CSS, no accessibility cost. Worth building on. */
    details: true,
    summary: true,

    /**
     * Assignment strips inline <svg>, bulletin and topic keep it. A data-URI
     * <img> carrying the same SVG survives everywhere — use that instead of
     * branching on surface.
     */
    svg: { bulletin: true, topic: true, assignment: false },
    animate: { bulletin: true, topic: true, assignment: false },

    /** Stripped everywhere. The premise of the whole inline-style design. */
    style: false,
  },

  styleBlocks: false,
  animation: false,
  reserializesStyles: true,
} as const;

/** Fallback for an unmeasured tenant: assume only what is near-universal. */
export const conservative: CompatSpec = {
  ...stJohns,
  tenant: "unmeasured",
  measured: "",
  /** Nobody has probed this tenant, so the list below is the whole permission. */
  unlistedStyles: "deny",
  styles: {
    "background-color": true,
    color: true,
    border: true,
    "border-left": true,
    "border-top": true,
    "border-bottom": true,
    padding: true,
    margin: true,
    width: true,
    "min-width": true,
    "max-width": true,
    display: true,
    "vertical-align": true,
    "font-family": true,
    "font-size": true,
    "font-weight": true,
    "font-style": true,
    "line-height": true,
    "text-align": true,
    // The soft-cards properties are the ones a stricter tenant is likeliest to
    // strip, so they are off until measured.
    "border-radius": false,
    "box-shadow": false,
    opacity: false,
    background: false,
    "letter-spacing": false,
    "text-transform": false,
    "list-style-type": false,
    float: false,
  },
  elements: {
    ...stJohns.elements,
    svg: false,
    animate: false,
    details: false,
  },
};

function resolve(support: Support | undefined, surface: SurfaceKey): boolean {
  if (support === undefined) return false; // unmeasured is not permission
  if (typeof support === "boolean") return support;
  return support[surface] ?? false;
}

export function supportsStyle(spec: CompatSpec, prop: string, surface: SurfaceKey): boolean {
  const listed = spec.styles[prop];
  if (listed === undefined) return spec.unlistedStyles === "allow";
  return resolve(listed, surface);
}

export function supportsElement(spec: CompatSpec, tag: string, surface: SurfaceKey): boolean {
  return resolve(spec.elements[tag.toLowerCase()], surface);
}
