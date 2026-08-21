import type { ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, profileKeys } from "../core/profiles/index.ts";
import { surfaces } from "../core/surfaces.ts";
import { templateGroups, templates } from "../core/templates.ts";
import { BlockList } from "./blocklist.tsx";
import { ExportPanel } from "./export.tsx";
import { BlockFields } from "./inspector.tsx";
import { Preview } from "./preview.tsx";
import { useComposer } from "./state.ts";

/** Focused quick-post workflow for the MV3 side panel. */
export function QuickPost() {
  const initial = templates[templateGroups.bulletin[0]];
  const c = useComposer({ initialBlocks: initial, initialSelected: initial[0].id, initialTitle: templateGroups.bulletin[0] });
  const { styleKey, setStyleKey, profileKey, setProfileKey, customPalette, surfaceKey, setSurfaceKey, palette, announcement, ready, saveStatus } = c;

  if (!ready) return <main className="app-loading panel-loading" aria-busy="true"><div className="loading-brand"><span className="brandmark" aria-hidden="true">B</span><strong>Betterbaud</strong></div><div className="skel skel-title" /><div className="skel skel-row" /><div className="skel skel-row" /><span className="sr-only">Loading quick post</span></main>;

  return <main className="panel">
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    <header className="panel-bar">
      <div className="panel-brand"><span className="brandmark" aria-hidden="true">B</span><h1>Betterbaud</h1></div>
      <span className={`save-chip save-${saveStatus}`}>{saveStatus === "saving" ? "Saving" : saveStatus === "error" ? "Save failed" : "Saved locally"}</span>
      {/* conformance-ignore CODE-08 palette.accent is teacher-selected runtime data. */}
      <span className="class-dot" style={{ background: palette.accent }} aria-hidden="true" />
      {/* conformance-ignore FORM-05 aria-label explicitly names the destination select. */}
      <select value={surfaceKey} onChange={event => setSurfaceKey(event.target.value as SurfaceKey)} aria-label="Blackbaud destination">{(Object.keys(surfaces) as SurfaceKey[]).map(key => <option key={key} value={key}>{surfaces[key].name}</option>)}</select>
      {/* conformance-ignore FORM-05 aria-label explicitly names the class-style select. */}
      <select value={styleKey} onChange={event => setStyleKey(event.target.value as StyleKey)} aria-label="Class style">{Object.entries(palettes).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}<option value="custom">{customPalette.className}</option></select>
      {/* conformance-ignore FORM-05 aria-label explicitly names the visual-style select. */}
      <select value={profileKey} onChange={event => setProfileKey(event.target.value as ProfileKey)} aria-label="Visual style">{profileKeys.map(key => <option key={key} value={key}>{profiles[key].name}</option>)}</select>
    </header>
    <BlockList c={c} />
    <BlockFields c={c} />
    <Preview c={c} device="mobile" />
    <div className="panel-export"><ExportPanel c={c} label="Copy to clipboard" hint="Open Blackbaud’s HTML/source editor and paste from your clipboard." showHistory={false} /></div>
  </main>;
}
