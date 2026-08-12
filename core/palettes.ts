import type { Palette, StyleKey } from "./model.ts";

/**
 * Six subject palettes. Colour only — Phase 2 moved the font pairing and every
 * treatment decision into `core/profiles/`, so the same six subjects now render
 * three different ways.
 *
 * The four colours are the ones a tone can reference:
 *   primary  headings and the strongest accent block
 *   accent   the subject's signature colour
 *   surface  the neutral card fill
 *   focus    the highlight fill behind focus questions
 */
export const palettes: Record<Exclude<StyleKey, "custom">, Palette> = {
  english: {
    name: "English",
    className: "AP English Literature",
    primary: "#243B53",
    accent: "#C99700",
    surface: "#F8FAFC",
    focus: "#FFFBEB",
  },
  math: {
    name: "Math",
    className: "Mathematics",
    primary: "#173F5F",
    accent: "#2A9D8F",
    surface: "#F2F8FA",
    focus: "#E8F6F3",
  },
  religion: {
    name: "Religion",
    className: "Religion",
    primary: "#4B365F",
    accent: "#B8893B",
    surface: "#F8F5FA",
    focus: "#FBF5E9",
  },
  science: {
    name: "Science",
    className: "Science",
    primary: "#174C3C",
    accent: "#4A9D74",
    surface: "#F0F8F4",
    focus: "#E8F5ED",
  },
  language: {
    name: "Foreign Language",
    className: "Foreign Language",
    primary: "#7A3045",
    accent: "#D47B59",
    surface: "#FBF4F5",
    focus: "#FFF0E9",
  },
  arts: {
    name: "Arts",
    className: "Visual & Performing Arts",
    primary: "#49306B",
    accent: "#E05A8C",
    surface: "#F8F3FB",
    focus: "#FFF0F6",
  },
};

export const paletteKeys = Object.keys(palettes) as Exclude<StyleKey, "custom">[];
