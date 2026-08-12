import type { ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, profileKeys } from "../core/profiles/index.ts";
import { surfaces } from "../core/surfaces.ts";
import { templateGroups, templates } from "../core/templates.ts";
import { BlockList } from "./blocklist.tsx";
import { BlockFields } from "./inspector.tsx";
import { ExportPanel } from "./export.tsx";
import { Preview } from "./preview.tsx";
import { useComposer } from "./state.ts";

/**
 * Quick-post mode — the side panel's only screen.
 *
 * Open, edit, copy, done. What it drops relative to the full editor is what
 * makes it quick: no template picker, no style editor, no HTML import, no saved
 * posts, no export history. What it keeps is what would otherwise make the
 * output wrong: the Blackbaud surface, which changes the render, and the class
 * palette and profile, which the panel cannot inherit from the web app — the two
 * shells are separate origins and nothing reads across them by design.
 *
 * Cold start opens on the first bulletin template rather than the Macbeth
 * sample; after that, `useComposer` restores the panel's own last workspace.
 */
export function QuickPost() {
  const c = useComposer({ initialBlocks: templates[templateGroups.bulletin[0]], initialSelected: templates[templateGroups.bulletin[0]][0].id, initialTitle: templateGroups.bulletin[0] });
  const { styleKey, setStyleKey, profileKey, setProfileKey, customPalette, surfaceKey, setSurfaceKey, palette } = c;

  return <main className="panel">
    <header className="panel-bar">
      <span className="class-dot" style={{background:palette.accent}}/>
      <select value={surfaceKey} onChange={e=>setSurfaceKey(e.target.value as SurfaceKey)} aria-label="Blackbaud destination">{(Object.keys(surfaces) as SurfaceKey[]).map(key=><option key={key} value={key}>{surfaces[key].name}</option>)}</select>
      <select value={styleKey} onChange={e=>setStyleKey(e.target.value as StyleKey)} aria-label="Class style">{Object.entries(palettes).map(([key,p])=><option key={key} value={key}>{p.name}</option>)}<option value="custom">{customPalette.className}</option></select>
      <select value={profileKey} onChange={e=>setProfileKey(e.target.value as ProfileKey)} aria-label="Visual style">{profileKeys.map(key=><option key={key} value={key}>{profiles[key].name}</option>)}</select>
    </header>
    <BlockList c={c} />
    <BlockFields c={c} />
    <Preview c={c} device="mobile" />
    <div className="panel-export"><ExportPanel c={c} label="Copy to clipboard" hint="Open Blackbaud’s HTML/source editor and paste from your clipboard." showHistory={false} /></div>
  </main>;
}
