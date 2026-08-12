import type { Palette, Profile, ProfileKey, ToneKey, ToneSpec } from "../model.ts";
import { soft } from "./soft.ts";
import { editorial } from "./editorial.ts";
import { bold } from "./bold.ts";

export { soft, editorial, bold };

/** Soft cards is first because it is the default. */
export const profiles: Record<ProfileKey, Profile> = { soft, editorial, bold };

export const profileKeys = Object.keys(profiles) as ProfileKey[];

export const defaultProfile: Profile = soft;

/**
 * Resolve a tone's `palette.*` references against the chosen subject palette.
 *
 * This indirection is the whole point of the split: a tone says *what role* a
 * block plays, the profile says how that role is drawn, and the palette says
 * which subject it belongs to. A literal colour in a profile stays literal —
 * semantic tints (blue for homework, rose for exams) should not shift when the
 * subject does.
 */
export function resolveTone(profile: Profile, palette: Palette, tone: ToneKey): ToneSpec {
  const spec = profile.tones[tone] ?? profile.tones.neutral;
  return {
    fill: resolveColor(spec.fill, palette),
    border: resolveColor(spec.border, palette),
    label: resolveColor(spec.label, palette),
  };
}

const PALETTE_KEYS = ["primary", "accent", "surface", "focus"] as const;

function resolveColor(value: string, palette: Palette): string {
  if (!value.startsWith("palette.")) return value;
  const key = value.slice("palette.".length);
  return (PALETTE_KEYS as readonly string[]).includes(key)
    ? palette[key as (typeof PALETTE_KEYS)[number]]
    : value;
}

/**
 * Normalize a font stack to the form Blackbaud stores.
 *
 * Blackbaud re-serializes every style attribute and rewrites double quotes to
 * single ones — `font-family:Poppins,"Trebuchet MS",sans-serif` comes back as
 * `font-family: Poppins,'Trebuchet MS',sans-serif`. Emitting single quotes up
 * front means a round trip produces no gratuitous churn to review.
 *
 * Any family that is not a bare identifier gets quoted, which also fixes the
 * prototype's unquoted `Trebuchet MS,sans-serif` — invalid CSS that browsers
 * happened to forgive.
 */
export function fontStack(value: string): string {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^["']|["']$/g, "").replace(/["']/g, ""))
    .filter(Boolean)
    .map((family) => (/^[A-Za-z][A-Za-z0-9-]*$/.test(family) ? family : `'${family}'`))
    .join(",");
}

/**
 * A profile with different fonts. The composer's style editor lets a teacher
 * pair any font with any profile, and this keeps that a data change rather than
 * a fourth profile.
 */
export function withFonts(
  profile: Profile,
  fonts: Partial<Profile["fonts"]>
): Profile {
  return { ...profile, fonts: { ...profile.fonts, ...fonts } };
}
