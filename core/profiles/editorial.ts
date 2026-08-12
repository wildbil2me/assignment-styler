import type { Profile } from "../model.ts";

/**
 * Editorial — square corners, a rule over the hero, a thick left accent bar on
 * every card. Serif headings.
 *
 * Seeded from `ap-english-literature-style-profile.json` (2026-08-09, now
 * docs/ap-english-literature-style-profile.json), which described this look
 * before the rebuild plan existed. It is also, near enough, what the prototype
 * rendered — so the profile that ships as an alternate is the one a teacher
 * already using the tool will recognize.
 */
export const editorial: Profile = {
  id: "editorial",
  name: "Editorial",
  description: "Square, ruled, serif headings. The prototype's original look.",

  fonts: {
    heading: "Georgia, serif",
    body: "Arial, sans-serif",
  },
  fontSizes: {
    title: "26px",
    section: "14px",
    body: "14px",
    muted: "13px",
    label: "12px",
  },
  lineHeights: { heading: "1.25", body: "1.6" },
  fontWeights: { normal: "400", semibold: "600", bold: "700" },
  spacing: { xxs: "4px", xs: "8px", sm: "12px", md: "16px", lg: "22px", xl: "28px" },
  colors: { text: "#1F2937", mutedText: "#4B5563", border: "#E2E8F0" },

  card: {
    radius: "0",
    borderWidth: "1px",
    accentBar: "4px",
    shadow: "",
    padding: "16px",
    gap: "14px",
    gutter: "20px",
    minWidth: "260px",
  },

  hero: {
    rule: "top",
    ruleWidth: "5px",
    padding: "22px 0 16px",
    labelLetterSpacing: "1.5px",
    labelTransform: "none",
  },

  heading: {
    letterSpacing: "0",
    transform: "none",
    weight: "700",
    size: "14px",
  },

  tones: {
    neutral: { fill: "palette.surface", border: "#E2E8F0", label: "palette.primary" },
    focus: { fill: "palette.focus", border: "palette.accent", label: "palette.primary" },
    info: { fill: "#EFF6FF", border: "#93C5FD", label: "palette.primary" },
    attention: { fill: "#FEF3C7", border: "palette.accent", label: "palette.primary" },
    accent: { fill: "#F0F7FF", border: "palette.primary", label: "palette.primary" },
    study: { fill: "#F5F3FF", border: "#A78BFA", label: "palette.primary" },
    alert: { fill: "#FFF1F2", border: "#FB7185", label: "palette.primary" },
  },
};
