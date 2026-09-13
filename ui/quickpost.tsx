import { useRef } from "react";

import type { ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, profileKeys } from "../core/profiles/index.ts";
import { surfaceArticle, surfaces } from "../core/surfaces.ts";
import { templateGroups, templates } from "../core/templates.ts";
import { BlockList } from "./blocklist.tsx";
import { ExportPanel } from "./export.tsx";
import { Icon } from "./icon.tsx";
import { BlockFields, Checks, TextFormatting } from "./inspector.tsx";
import { Preview } from "./preview.tsx";
import { useComposer } from "./state.ts";

/** Focused quick-post workflow for the MV3 side panel. */
export function QuickPost() {
  const initial = templates[templateGroups.bulletin[0]];
  const c = useComposer({ initialBlocks: initial, initialSelected: initial[0].id, initialTitle: templateGroups.bulletin[0] });
  const {
    styleKey, setStyleKey, profileKey, setProfileKey, customPalette,
    surfaceKey, setSurfaceKey, palette, surface, applyTemplate, active,
    report, undo, redo, backupWorkspace, restoreFromFile,
    announcement, ready, saveStatus,
  } = c;
  const backupFileRef = useRef<HTMLInputElement>(null);

  const restoreBackup = async (input: HTMLInputElement) => {
    await restoreFromFile(input.files?.[0]);
    // Clear it either way, or choosing the same file twice fires no change event.
    input.value = "";
  };

  if (!ready) return <main className="app-loading panel-loading" aria-busy="true"><div className="loading-brand"><span className="brandmark" aria-hidden="true">BB</span><strong>BBStyler</strong></div><div className="skel skel-title" /><div className="skel skel-row" /><div className="skel skel-row" /><span className="sr-only">Loading quick post</span></main>;

  // Never a bare tick: an unknown is its own word here, exactly as it is in the
  // rows underneath, so a collapsed panel cannot imply more than was checked.
  const verdict = report.failed > 0
    ? `${report.failed} to fix`
    : report.unknown > 0
      ? `${report.unknown} unchecked`
      : "All clear";

  return <main className="panel">
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    <header className="panel-bar">
      <div className="panel-brand"><span className="brandmark" aria-hidden="true">BB</span><h1>BBStyler</h1></div>
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

    {/*
      Templates were left out of the panel in Phase 3 because a cold start opened
      on one. Phase 4's persistent `chrome.storage.local` removed the cold start:
      the second time a teacher opens the panel they get last week's bulletin, and
      without this they would rebuild an assignment out of it by hand.

      `key` remounts the select when the destination changes, so the placeholder
      comes back rather than stranding a template name from another surface.
    */}
    <div className="panel-start">
      <select
        aria-label={`${surface.name} template`}
        key={surfaceKey}
        defaultValue=""
        onChange={event => { if (event.target.value) applyTemplate(event.target.value); event.target.value = "" }}
      >
        <option value="" disabled>Start with {surfaceArticle(surface)} {surface.name.toLowerCase()} template…</option>
        {templateGroups[surfaceKey].map(name => <option key={name}>{name}</option>)}
      </select>
      {/* Applying a template replaces every block. The composer can undo that
          from its stage bar; until this pair existed the panel could not. */}
      <span className="panel-history">
        <button onClick={undo} aria-label="Undo" title="Undo"><Icon name="undo" /></button>
        <button onClick={redo} aria-label="Redo" title="Redo"><Icon name="redo" /></button>
      </span>
    </div>

    <BlockList c={c} />

    {/*
      The toolbar sits against the words it formats. It used to live inside
      BlockFields, which put 500px of block type, width, icon and context label
      between the Bold button and the text — select, scroll up 350px, click,
      scroll back. The panel bar above stopped being sticky for the same reason:
      destination and class style are set once, and they were holding 126px of a
      860px panel hostage for the whole session.
    */}
    {active && <div className="panel-format"><TextFormatting c={c} /></div>}
    <Preview c={c} device="mobile" />

    <details className="panel-disclosure panel-settings">
      <summary><span>Block settings</span></summary>
      <BlockFields c={c} formatting={false} />
    </details>

    {/*
      The panel's `chrome.storage.local` is a different origin from the web app's
      `localStorage`, so a downloaded file is the only way a post composed here
      reaches another browser — or survives an uninstall. The README has told
      teachers to back up often since Phase 4; this is where the panel lets them.
    */}
    <details className="panel-disclosure panel-backup">
      <summary><span>Workspace backup</span></summary>
      <div className="panel-backup-body">
        <p>Posts composed here are stored in this browser only. The web app cannot see them, and removing the extension erases them.</p>
        <div className="panel-backup-actions">
          <button onClick={backupWorkspace}><Icon name="download" /> Back up</button>
          <button onClick={() => backupFileRef.current?.click()}><Icon name="upload" /> Restore</button>
          <input ref={backupFileRef} className="sr-only" tabIndex={-1} aria-label="Restore BBStyler backup" type="file" accept="application/json,.json" onChange={event => restoreBackup(event.target)} />
        </div>
      </div>
    </details>

    {/*
      Inside the sticky bar, directly above the button it qualifies.
      Below the preview — where this sat until it was looked at in a browser —
      the verdict was a thousand pixels down a scrolling document while
      "Copy to clipboard" floated in view the whole time, so a teacher could
      copy a post with a contrast failure in it and never once see the word.
      The checks are only worth computing if they are on screen at the moment
      the copy happens.
    */}
    <div className="panel-export">
      <details className="panel-disclosure panel-checks">
        <summary>
          <span>Compatibility · {surface.name}</span>
          <span className="panel-verdict">{verdict}</span>
          <span className={`score ${report.failed ? "score-fail" : ""}`}>{report.passed}/{report.checked}</span>
        </summary>
        <Checks c={c} heading={false} />
      </details>
      <ExportPanel c={c} label="Copy to clipboard" hint="Open Blackbaud’s HTML/source editor and paste from your clipboard." showHistory={false} />
    </div>
  </main>;
}
