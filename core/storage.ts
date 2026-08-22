/**
 * A teacher's workspace: what it looks like, how older ones become current, and
 * where it is kept.
 *
 * Before this, the shape lived inline in a React effect and had no version
 * field, so the only way to change it was to guess what a stored blob might be
 * and pick fields off it defensively. A teacher's work also lived exclusively in
 * `localStorage` under one key, which means a cleared cache — or a school laptop
 * reimaged over the summer — took every post with it. Hence two things here:
 * a numbered schema with an explicit migration, and `serialize`/`parse` so a
 * whole workspace can leave the browser as a file the teacher owns.
 *
 * Nothing in this file touches the DOM. The adapters below are the only I/O, and
 * both are injectable, because the web app and the side panel keep their
 * workspaces in different places and neither can read the other's.
 */

import type { Block, MotionStyle, Palette, Profile, ProfileKey, StyleKey, SurfaceKey } from "./model.ts";
import { palettes } from "./palettes.ts";
import { profiles, defaultProfile } from "./profiles/index.ts";
import { surfaces } from "./surfaces.ts";
import { blockMeta } from "./catalog.ts";
import { reserveIds } from "./ids.ts";

export const STORAGE_KEY = "bcc-workspace";
export const SCHEMA_VERSION = 1;

export type SavedPost = { id: number; title: string; blocks: Block[] };

export type Workspace = {
  version: typeof SCHEMA_VERSION;
  blocks: Block[];
  postTitle: string;
  styleKey: StyleKey;
  surfaceKey: SurfaceKey;
  profileKey: ProfileKey;
  fonts: Profile["fonts"];
  customPalette: Palette;
  savedPosts: SavedPost[];
};

export const emptyCustomPalette = (): Palette => ({
  ...palettes.english,
  name: "Custom",
  className: "My Custom Style",
});

/* -------------------------------------------------------------- migration */

type Unknown = Record<string, unknown>;

const isObject = (v: unknown): v is Unknown => typeof v === "object" && v !== null;
const str = (v: unknown, fallback: string): string => (typeof v === "string" ? v : fallback);

/**
 * Blocks carried an unvalidated `animation` field in the early prototype. It is
 * dropped on the way in; the SVG-backed block instead preserves one of the
 * validated `motion` values below.
 */
function cleanBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((b): b is Block & { animation?: string } => isObject(b) && typeof b.type === "string" && b.type in blockMeta)
    .map(({ animation, align, motion, ...b }) => {
      const safeAlign = ["left", "center", "right", "justify"].includes(String(align)) ? align : undefined;
      const safeMotion = ["fade", "slide-up", "slide-left"].includes(String(motion)) ? motion as MotionStyle : undefined;
      return {
        ...b,
        id: Number(b.id),
        title: str(b.title, ""),
        body: str(b.body, ""),
        ...(safeAlign ? { align: safeAlign } : {}),
        ...(safeMotion ? { motion: safeMotion } : {}),
      };
    });
}

/**
 * Any stored shape becomes the current one, or `null` if there is nothing
 * usable in it.
 *
 * Two vintages exist. **v0** is anything without a `version` field: the shape
 * the prototype wrote, which may additionally predate Phase 2's split of colour
 * from type and carry one fused `customStyle` object. That split is the only
 * genuinely lossy migration in the tool's history — a fused style held both a
 * palette and a font pairing, and the font half only ever applied when the
 * teacher had actually selected the custom style, so it is carried over only in
 * that case. Guessing otherwise would silently restyle every class.
 */
export function migrate(raw: unknown): Workspace | null {
  if (!isObject(raw)) return null;

  const blocks = cleanBlocks(raw.blocks);
  const savedPosts: SavedPost[] = Array.isArray(raw.savedPosts)
    ? raw.savedPosts.filter(isObject).map((p) => ({
        id: Number(p.id) || 0,
        title: str(p.title, "Untitled"),
        blocks: cleanBlocks(p.blocks),
      }))
    : [];

  // Nothing worth restoring — let the caller keep its defaults rather than
  // clobbering them with an empty document.
  if (!blocks.length && !savedPosts.length) return null;

  const styleKey = (typeof raw.styleKey === "string" && (raw.styleKey in palettes || raw.styleKey === "custom")
    ? raw.styleKey
    : "english") as StyleKey;

  let customPalette = isObject(raw.customPalette)
    ? { ...emptyCustomPalette(), ...(raw.customPalette as Partial<Palette>), name: "Custom" }
    : emptyCustomPalette();
  let fonts: Profile["fonts"] = isObject(raw.fonts)
    ? { ...defaultProfile.fonts, ...(raw.fonts as Partial<Profile["fonts"]>) }
    : defaultProfile.fonts;

  // Pre-Phase-2 fused style.
  if (!isObject(raw.customPalette) && isObject(raw.customStyle)) {
    const c = raw.customStyle as Partial<Palette> & { heading?: string; body?: string };
    customPalette = {
      name: "Custom",
      className: str(c.className, "My Custom Style"),
      primary: str(c.primary, palettes.english.primary),
      accent: str(c.accent, palettes.english.accent),
      surface: str(c.surface, palettes.english.surface),
      focus: str(c.focus, palettes.english.focus),
    };
    if (styleKey === "custom" && (c.heading || c.body))
      fonts = {
        heading: c.heading || defaultProfile.fonts.heading,
        body: c.body || defaultProfile.fonts.body,
      };
  }

  const workspace: Workspace = {
    version: SCHEMA_VERSION,
    blocks,
    postTitle: str(raw.postTitle, "Untitled class post"),
    styleKey,
    surfaceKey: (typeof raw.surfaceKey === "string" && raw.surfaceKey in surfaces
      ? raw.surfaceKey
      : "bulletin") as SurfaceKey,
    profileKey: (typeof raw.profileKey === "string" && raw.profileKey in profiles
      ? raw.profileKey
      : defaultProfile.id) as ProfileKey,
    fonts,
    customPalette,
    savedPosts,
  };

  // Ids in a restored workspace may come from a clock ahead of this one.
  reserveIds([
    ...workspace.blocks.map((b) => b.id),
    ...workspace.savedPosts.flatMap((p) => [p.id, ...p.blocks.map((b) => b.id)]),
  ]);

  return workspace;
}

/* ------------------------------------------------------------ export file */

/** Pretty-printed on purpose: this is a file a teacher may open and read. */
export function serialize(workspace: Workspace): string {
  return `${JSON.stringify(workspace, null, 2)}\n`;
}

export function parse(text: string): { workspace: Workspace | null; message: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { workspace: null, message: "That file isn’t valid JSON, so there was nothing to read." };
  }
  const workspace = migrate(raw);
  if (!workspace)
    return {
      workspace: null,
      message: "That file doesn’t contain any posts. Check it’s a BBStyler backup rather than a class style.",
    };
  const count = workspace.blocks.length;
  return {
    workspace,
    message: `Restored ${count} block${count === 1 ? "" : "s"} and ${workspace.savedPosts.length} saved post${workspace.savedPosts.length === 1 ? "" : "s"}.`,
  };
}

/**
 * A filename a teacher can find again in six months.
 *
 * The prefix is **our name**, so it moves with a rename — it is a row in
 * docs/naming.md. It said `content-composer-` until 2026-08-18, which was the
 * app's name two renames ago and meant a teacher's backup was labelled with a
 * product that no longer exists. Note that `STORAGE_KEY` above is the opposite
 * case and must never change: it is a lookup key, not a label.
 */
export function backupFilename(postTitle: string, today: string): string {
  const slug = postTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `bbstyler-${slug || "workspace"}-${today}.json`;
}

/* ---------------------------------------------------------------- adapters */

export interface StorageAdapter {
  load(): Promise<Workspace | null>;
  /** True only when the workspace reached its durable browser store. */
  save(workspace: Workspace): Promise<boolean>;
}

/** The web app. Synchronous underneath, promised here so both shells match. */
export const localAdapter: StorageAdapter = {
  async load() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      return raw ? migrate(JSON.parse(raw)) : null;
    } catch {
      return null; // corrupt or unavailable — start clean rather than throw
    }
  },
  async save(workspace) {
    try {
      if (!globalThis.localStorage) return false;
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      return true;
    } catch {
      // Quota or private mode. Losing an autosave is survivable; crashing the
      // composer mid-sentence is not.
      return false;
    }
  },
};

type ChromeArea = {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

/**
 * `chrome.storage.local` — the MV3 idiom, and more durable than a side panel's
 * `localStorage`, which browsers clear alongside ordinary site data.
 *
 * Typed structurally rather than by installing `@types/chrome` for two calls.
 */
function chromeArea(): ChromeArea | null {
  const api = (globalThis as { chrome?: { storage?: { local?: ChromeArea } } }).chrome;
  return api?.storage?.local ?? null;
}

export const chromeAdapter: StorageAdapter = {
  async load() {
    const area = chromeArea();
    if (!area) return null;
    try {
      const stored = await area.get(STORAGE_KEY);
      return stored?.[STORAGE_KEY] ? migrate(stored[STORAGE_KEY]) : null;
    } catch {
      return null;
    }
  },
  async save(workspace) {
    const area = chromeArea();
    if (!area) return false;
    try {
      await area.set({ [STORAGE_KEY]: workspace });
      return true;
    } catch {
      // See localAdapter.save.
      return false;
    }
  },
};

/**
 * The side panel gets `chrome.storage`, everything else gets `localStorage`.
 *
 * The panel additionally reads its old `localStorage` workspace once, so a
 * teacher who used it before this change does not open the panel to a blank
 * post. The read is one-way: nothing is written back to `localStorage`, and the
 * next save lands in `chrome.storage`.
 */
export function defaultAdapter(): StorageAdapter {
  const area = chromeArea();
  if (!area) return localAdapter;
  return {
    async load() {
      return (await chromeAdapter.load()) ?? (await localAdapter.load());
    },
    save: chromeAdapter.save,
  };
}
