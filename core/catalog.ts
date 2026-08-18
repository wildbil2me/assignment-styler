import type { BlockType, ToneKey } from "./model.ts";

/**
 * The block taxonomy — 17 types since Phase 2 promoted `details`.
 *
 * Labels double as fallback headings in render.ts and as inferred titles in
 * import.ts, so the strings are load-bearing.
 *
 * `tone` is the Phase 2 addition and the reason render.ts no longer contains a
 * single hex value: a block names the *role* it plays, and the active profile
 * decides what that role looks like against the active palette.
 */
export const blockMeta: Record<BlockType, { label: string; icon: string; tone: ToneKey }> = {
  hero: { label: "Page title", icon: "H", tone: "neutral" },
  intro: { label: "Introduction", icon: "¶", tone: "neutral" },
  reading: { label: "Reading", icon: "R", tone: "neutral" },
  focus: { label: "Focus questions", icon: "?", tone: "focus" },
  homework: { label: "Homework", icon: "✓", tone: "info" },
  deadline: { label: "Deadline", icon: "!", tone: "attention" },
  announcement: { label: "Announcement", icon: "A", tone: "accent" },
  quiz: { label: "Quiz notification", icon: "Q", tone: "study" },
  exam: { label: "Exam notification", icon: "E", tone: "alert" },
  note: { label: "Note", icon: "i", tone: "neutral" },
  steps: { label: "Steps", icon: "1", tone: "neutral" },
  checklist: { label: "Checklist", icon: "✓", tone: "neutral" },
  vocabulary: { label: "Vocabulary", icon: "V", tone: "neutral" },
  quote: { label: "Quote", icon: "“", tone: "neutral" },
  resource: { label: "Resource link", icon: "↗", tone: "neutral" },
  targets: { label: "Learning targets", icon: "◎", tone: "neutral" },
  /**
   * Native disclosure — `<details>`/`<summary>`, measured surviving on all three
   * surfaces (probe R40). No CSS, no accessibility cost, and the only
   * interaction primitive available in exported content now that motion is off.
   * Answer keys and long study guides are what it is for.
   */
  details: { label: "Collapsible section", icon: "▸", tone: "neutral" },
};

export const blockTypes = Object.keys(blockMeta) as BlockType[];
