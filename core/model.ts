/**
 * The domain model.
 *
 * Phase 2 split the prototype's `StylePreset` in two, which is the change the
 * whole phase turns on:
 *
 *   profile (feel)  ×  palette (subject)  ->  render
 *
 * A **profile** owns structure and treatment — type scale, spacing, radii,
 * shadow, how a card is drawn. A **palette** owns four subject colours. Three
 * profiles × six palettes is eighteen looks out of two small data files, and a
 * new look is data rather than a code change.
 *
 * The token vocabulary is the one from the root style-guide spec (now
 * docs/style-guide-spec.md), trimmed of the two things a flat block model cannot
 * use: `allowedChildren` and `groupingRules`.
 */

export type BlockType =
  | "hero"
  | "intro"
  | "reading"
  | "focus"
  | "homework"
  | "deadline"
  | "announcement"
  | "quiz"
  | "exam"
  | "note"
  | "steps"
  | "checklist"
  | "vocabulary"
  | "quote"
  | "resource"
  | "targets"
  | "details";

export type Block = {
  id: number;
  type: BlockType;
  title: string;
  body: string;
  label?: string;
  width?: "full" | "half";
  emoji?: string;
  hidden?: boolean;
  align?: "left" | "center" | "right" | "justify";
};

/**
 * Which of the palette's four colours (or which fixed semantic tint) a block
 * type is drawn in. Block types name a *role*; the profile decides what the role
 * looks like, so a new profile restyles every block without touching render.ts.
 */
export type ToneKey =
  | "neutral"
  | "focus"
  | "info"
  | "attention"
  | "accent"
  | "study"
  | "alert";

export type StyleKey =
  | "english"
  | "math"
  | "religion"
  | "science"
  | "language"
  | "arts"
  | "custom";

/** Four subject colours. Fonts and treatment moved to the profile in Phase 2. */
export type Palette = {
  name: string;
  className: string;
  primary: string;
  accent: string;
  surface: string;
  focus: string;
};

/**
 * A tone resolves to a fill and a border. Either may be a literal CSS colour or
 * a reference into the palette (`palette.accent`), so profiles can be authored
 * as plain JSON and still follow the subject colour.
 */
export type ToneSpec = { fill: string; border: string; label: string };

export type ProfileKey = "soft" | "editorial" | "bold";

export type Profile = {
  id: ProfileKey;
  name: string;
  description: string;

  fonts: { heading: string; body: string };
  /** `title` is the hero, `section` a card heading, `label` the hero eyebrow. */
  fontSizes: {
    title: string;
    section: string;
    body: string;
    muted: string;
    label: string;
  };
  lineHeights: { heading: string; body: string };
  fontWeights: { normal: string; semibold: string; bold: string };
  spacing: { xxs: string; xs: string; sm: string; md: string; lg: string; xl: string };
  colors: { text: string; mutedText: string; border: string };

  /** How a card is drawn. Every value is a CSS length or "" for "omit". */
  card: {
    radius: string;
    borderWidth: string;
    /** Left accent bar width, or "" for none. */
    accentBar: string;
    /** box-shadow value, or "" for none. Degrades to nothing where unsupported. */
    shadow: string;
    padding: string;
    /** Vertical gap below each card. */
    gap: string;
    /** Horizontal gutter between two half-width cards. */
    gutter: string;
    /** Below this the two halves stack, with no media query. */
    minWidth: string;
  };

  hero: {
    /** Where the hero's rule sits, and how thick. */
    rule: "top" | "bottom" | "none";
    ruleWidth: string;
    padding: string;
    labelLetterSpacing: string;
    labelTransform: string;
  };

  /** Card heading treatment. */
  heading: {
    letterSpacing: string;
    transform: string;
    weight: string;
    size: string;
  };

  tones: Record<ToneKey, ToneSpec>;
};

export type SurfaceKey = "bulletin" | "topic" | "assignment";

export type Surface = {
  key: SurfaceKey;
  name: string;
  width: number;
  note: string;
};
