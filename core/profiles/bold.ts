import type { Profile } from "../model.ts";

/**
 * Bold — high contrast, tight radii, uppercase tracked headings, saturated
 * fills. Built for bulletin notices that have to be read from a phone in a
 * hallway rather than studied.
 *
 * Uses `text-transform` and `letter-spacing`, both measured surviving on all
 * three surfaces (probe R23, R17) and neither used by the prototype.
 */
export const bold: Profile = {
  id: "bold",
  name: "Bold",
  description: "High contrast, tracked uppercase headings, saturated fills.",

  fonts: {
    heading: "Verdana, sans-serif",
    body: "Verdana, sans-serif",
  },
  fontSizes: {
    title: "30px",
    section: "13px",
    body: "15px",
    muted: "14px",
    label: "12px",
  },
  lineHeights: { heading: "1.15", body: "1.6" },
  fontWeights: { normal: "400", semibold: "600", bold: "700" },
  spacing: { xxs: "4px", xs: "8px", sm: "12px", md: "16px", lg: "22px", xl: "28px" },
  colors: { text: "#111827", mutedText: "#374151", border: "#CBD5E1" },

  card: {
    radius: "4px",
    borderWidth: "2px",
    accentBar: "8px",
    shadow: "",
    padding: "16px 18px",
    gap: "16px",
    gutter: "20px",
    minWidth: "260px",
  },

  hero: {
    rule: "bottom",
    ruleWidth: "4px",
    padding: "8px 0 18px",
    labelLetterSpacing: "2px",
    labelTransform: "uppercase",
  },

  heading: {
    letterSpacing: "1px",
    transform: "uppercase",
    weight: "700",
    size: "13px",
  },

  tones: {
    neutral: { fill: "#F1F5F9", border: "#94A3B8", label: "palette.primary" },
    focus: { fill: "palette.focus", border: "palette.accent", label: "palette.primary" },
    info: { fill: "#DBEAFE", border: "#3B82F6", label: "#1E3A8A" },
    attention: { fill: "#FEF08A", border: "#CA8A04", label: "#713F12" },
    accent: { fill: "#CCFBF1", border: "palette.primary", label: "palette.primary" },
    study: { fill: "#EDE9FE", border: "#7C3AED", label: "#4C1D95" },
    alert: { fill: "#FFE4E6", border: "#E11D48", label: "#881337" },
  },
};
