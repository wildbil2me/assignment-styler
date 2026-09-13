import type { Surface, SurfaceKey } from "./model.ts";

/**
 * The three Blackbaud surfaces the composer targets, with the preview widths
 * the renderer uses as its outer max-width.
 *
 * Note there are three, not four — the v1 rebuild plan and an earlier CLAUDE.md
 * both claimed an "announcement" surface at 620px. `announcement` is a block
 * type, never a surface.
 *
 * Each surface carries its own `key` since Phase 2, because compatibility is
 * per-surface: the renderer resolves every style and element against the compat
 * spec for the surface being exported to.
 */
export const surfaces: Record<SurfaceKey, Surface> = {
  bulletin: {
    key: "bulletin",
    name: "Bulletin Board",
    width: 720,
    note: "Balanced layout for longer class pages.",
  },
  topic: {
    key: "topic",
    name: "Topic",
    width: 760,
    note: "Wider topic content with structured sections.",
  },
  assignment: {
    key: "assignment",
    name: "Assignment",
    width: 680,
    note: "Compact instructions with prominent actions and deadlines.",
  },
};

export const surfaceDescriptions: Record<SurfaceKey, string> = {
  assignment:
    "Focused instructions, requirements, and due dates for work students complete.",
  topic:
    "Structured, durable content that introduces or organizes a unit of learning.",
  bulletin: "Timely class communication, reminders, notices, and upcoming dates.",
};

export const surfaceKeys = Object.keys(surfaces) as SurfaceKey[];

/**
 * "a bulletin board", "a topic", "an assignment".
 *
 * Both shells build "Start with ... template" from the surface name, and both
 * read "a assignment" until this existed — a third of the time, on the surface
 * teachers use most.
 */
export const surfaceArticle = (surface: Surface): string =>
  /^[aeiou]/i.test(surface.name) ? "an" : "a";
