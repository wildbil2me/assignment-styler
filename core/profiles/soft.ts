import type { Profile } from "../model.ts";

/**
 * Soft cards — the default, chosen in the Phase 0b direction review.
 *
 * Rounded, tinted, layered, emoji markers. Every property it is made of was
 * measured surviving on all three surfaces: `border-radius` (probe R02),
 * `box-shadow` (R03), tinted `background-color` (R04), `rgba()` (R05). Nothing
 * here is a gamble, and nothing here degrades against this tenant.
 *
 * The shadow is deliberately two layers at low alpha rather than one dark one:
 * against Blackbaud's white page a single 4px shadow reads as a smudge, two
 * reads as lift. It is also the first thing `degrade()` drops on a stricter
 * tenant, which is why nothing else depends on it.
 */
export const soft: Profile = {
  id: "soft",
  name: "Soft cards",
  description: "Rounded, tinted, layered. Emoji markers and generous spacing.",

  fonts: {
    heading: "Trebuchet MS, sans-serif",
    body: "Arial, sans-serif",
  },
  fontSizes: {
    title: "28px",
    section: "16px",
    body: "15px",
    muted: "14px",
    label: "12px",
  },
  lineHeights: { heading: "1.25", body: "1.65" },
  fontWeights: { normal: "400", semibold: "600", bold: "700" },
  spacing: { xxs: "4px", xs: "8px", sm: "12px", md: "16px", lg: "22px", xl: "28px" },
  colors: { text: "#1F2937", mutedText: "#4B5563", border: "#E2E8F0" },

  card: {
    radius: "14px",
    borderWidth: "1px",
    accentBar: "",
    shadow: "0 1px 2px rgba(15,23,42,0.04),0 4px 12px rgba(15,23,42,0.06)",
    padding: "18px 20px",
    gap: "16px",
    gutter: "24px",
    minWidth: "250px",
  },

  hero: {
    rule: "none",
    ruleWidth: "0",
    padding: "4px 0 20px",
    labelLetterSpacing: "1.5px",
    labelTransform: "uppercase",
  },

  heading: {
    letterSpacing: "0",
    transform: "none",
    weight: "700",
    size: "16px",
  },

  /**
   * Fills are translucent so a tone reads as a tint of the page rather than a
   * separate swatch, and so the same tone works over any palette surface.
   */
  tones: {
    neutral: { fill: "palette.surface", border: "#E2E8F0", label: "palette.primary" },
    focus: { fill: "palette.focus", border: "palette.accent", label: "palette.primary" },
    info: { fill: "#EFF6FF", border: "#BFDBFE", label: "#1D4ED8" },
    attention: { fill: "#FEF6E7", border: "palette.accent", label: "#92400E" },
    accent: { fill: "#F0F7FF", border: "palette.primary", label: "palette.primary" },
    study: { fill: "#F5F3FF", border: "#C4B5FD", label: "#6D28D9" },
    alert: { fill: "#FFF1F2", border: "#FDA4AF", label: "#BE123C" },
  },
};
