import { useCallback, useEffect, useRef, useState } from "react";

import packageJson from "../package.json";
import { contrastRatio, requiredRatio, ASSUMED_PAGE_BACKGROUND } from "../core/checks.ts";
import { importHtml } from "../core/import.ts";
import { nextId, nextIds } from "../core/ids.ts";
import type { Palette, Profile, ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, profileKeys, defaultProfile } from "../core/profiles/index.ts";
import { surfaceArticle, surfaces, surfaceDescriptions } from "../core/surfaces.ts";
import { starter, templateGroups } from "../core/templates.ts";
import { BlockList } from "./blocklist.tsx";
import { Dialog } from "./dialog.tsx";
import { ExportPanel } from "./export.tsx";
import { Icon } from "./icon.tsx";
import { BlockFields, Checks } from "./inspector.tsx";
import { Preview, type Device } from "./preview.tsx";
import { useComposer, type SavedPost } from "./state.ts";

function contrastRows(palette: Palette, profile: Profile) {
  const size = (value: string) => parseFloat(value) || 0;
  const bold = size(profile.fontWeights.bold) || 700;
  const pairs = [
    { what: "Card heading on card", fg: palette.primary, bg: palette.surface, px: size(profile.heading.size), weight: size(profile.heading.weight) || bold },
    { what: "Body text on card", fg: profile.colors.text, bg: palette.surface, px: size(profile.fontSizes.body), weight: size(profile.fontWeights.normal) || 400 },
    { what: "Label on the page", fg: palette.accent, bg: ASSUMED_PAGE_BACKGROUND, px: size(profile.fontSizes.label), weight: bold },
  ];
  return pairs.map(pair => {
    const ratio = contrastRatio(pair.fg, pair.bg), required = requiredRatio(pair.px, pair.weight);
    return { what: pair.what, required, ratio: ratio === null ? "—" : `${ratio.toFixed(2)}:1`, ok: ratio !== null && ratio >= required };
  });
}

/** The full editor, shared core wrapped in the educator-suite application chrome. */
export function Composer() {
  const c = useComposer();
  const {
    blocks, setBlocks, postTitle, setPostTitle, setSelected,
    styleKey, setStyleKey, profileKey, setProfileKey, fonts, setFonts,
    customPalette, setCustomPalette, surfaceKey, setSurfaceKey,
    savedPosts, setSavedPosts, palette, surface, applyTemplate,
    announcement, announce, ready, saveStatus,
    backupWorkspace, restoreFromFile,
  } = c;
  const [postMenu, setPostMenu] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [styleEditor, setStyleEditor] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [styleDraft, setStyleDraft] = useState<Palette>(customPalette);
  const [fontDraft, setFontDraft] = useState<Profile["fonts"]>(defaultProfile.fonts);
  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [styleMessage, setStyleMessage] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const styleFileRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const closeStyleEditor = useCallback(() => setStyleEditor(false), []);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  useEffect(() => {
    if (!postMenu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPostMenu(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [postMenu]);

  const savePost = () => {
    setSavedPosts(value => [{ id: Date.now(), title: postTitle, blocks: blocks.map(block => ({ ...block })) }, ...value].slice(0, 12));
    setPostMenu(false);
    announce(`Temporarily saved a snapshot of ${postTitle} to My posts.`);
  };
  const loadPost = (post: SavedPost) => {
    setPostTitle(post.title);
    setBlocks(post.blocks.map(block => ({ ...block })));
    setSelected(post.blocks[0]?.id);
    setPostMenu(false);
    announce(`Opened the saved ${post.title} snapshot.`);
  };
  const exportStyle = () => {
    const payload = { version: 2, palette: { ...styleDraft, name: "Custom" }, profile: profileKey, fonts: fontDraft };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${styleDraft.className.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "class-style"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    announce("Exported the custom class style as JSON.");
  };
  const importStyle = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const nextPalette = parsed.palette || parsed;
      if (!nextPalette.primary || !nextPalette.accent) throw new Error();
      setStyleDraft({ ...styleDraft, ...nextPalette, name: "Custom" });
      const nextFonts = parsed.fonts || (nextPalette.heading && nextPalette.body ? { heading: nextPalette.heading, body: nextPalette.body } : null);
      if (nextFonts) setFontDraft({ heading: nextFonts.heading || fontDraft.heading, body: nextFonts.body || fontDraft.body });
      if (parsed.profile && parsed.profile in profiles) setProfileKey(parsed.profile);
      setStyleMessage("");
      announce(`Imported the style file ${file.name}.`);
    } catch {
      setStyleMessage("That file is not a valid BBStyler style. Choose a class-style JSON file exported by BBStyler.");
      announce("The selected file is not a valid BBStyler style.");
    }
  };
  const importExistingHtml = () => {
    const result = importHtml(importSource);
    if (!result.blocks.length) {
      setImportMessage(result.message);
      announce(result.message);
      return;
    }
    setBlocks(result.blocks);
    setSelected(result.blocks[0].id);
    if (result.postTitle) setPostTitle(result.postTitle);
    announce(result.message);
    closeImport();
    setImportMessage("");
    setImportSource("");
  };
  const newPost = () => {
    const id = nextId();
    setBlocks([{ id, type: "hero", label: "CLASS UPDATE", title: "UNTITLED POST", body: "Add a subtitle" }]);
    setSelected(id);
    setPostTitle("Untitled class post");
    setPostMenu(false);
    announce("Created a new blank post.");
  };
  const duplicatePost = () => {
    const ids = nextIds(blocks.length);
    const copies = blocks.map((block, index) => ({ ...block, id: ids[index] }));
    setBlocks(copies);
    setSelected(copies[0]?.id);
    setPostTitle(`${postTitle} — Copy`);
    setPostMenu(false);
    announce("Duplicated the current draft.");
  };
  // Both shells share the file round trip itself; the composer only adds
  // closing its menu afterwards. See `useComposer`.
  const downloadBackup = () => {
    backupWorkspace();
    setPostMenu(false);
  };
  const restoreWorkspace = async (input: HTMLInputElement) => {
    const restored = await restoreFromFile(input.files?.[0]);
    // Clear it either way, or choosing the same file twice fires no change event.
    input.value = "";
    if (restored) setPostMenu(false);
  };
  const restoreExample = () => {
    setBlocks(starter.map(block => ({ ...block })));
    setSelected(3);
    setPostTitle("Tuesday’s class post");
    setPostMenu(false);
    announce("Restored the example post.");
  };

  if (!ready) return <main className="app-loading" aria-busy="true"><div className="loading-brand"><span className="brandmark" aria-hidden="true">BB</span><strong>BBStyler</strong></div><div className="skel skel-title" /><div className="skel skel-row" /><div className="skel skel-row" /><span className="sr-only">Loading the composer</span></main>;

  const saveLabel = saveStatus === "saving" ? "SAVING TEMPORARILY" : saveStatus === "error" ? "TEMPORARY SAVE FAILED" : "TEMPORARILY SAVED";

  return <main className="app-shell">
    <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
    <header className="topbar">
      <div className="brand"><span className="brandmark" aria-hidden="true">BB</span><div><h1>BBStyler</h1><small>for Blackbaud</small></div></div>
      <div className="style-tools">
        {/* conformance-ignore FORM-05 Enclosing label and aria-label name this select; conformance-ignore CODE-08 palette.accent is user-selected runtime data. */}
        <label className="class-picker"><span className="class-dot" style={{ background: palette.accent }} aria-hidden="true" /><select value={styleKey} onChange={event => setStyleKey(event.target.value as StyleKey)} aria-label="Class style">{Object.entries(palettes).map(([key, value]) => <option key={key} value={key}>{value.name} · {value.className}</option>)}<option value="custom">Custom · {customPalette.className}</option></select></label>
        {/* conformance-ignore FORM-05 Enclosing label and aria-label both name the visual-style select. */}
        <label className="class-picker"><select value={profileKey} onChange={event => setProfileKey(event.target.value as ProfileKey)} aria-label="Visual style">{profileKeys.map(key => <option key={key} value={key}>{profiles[key].name}</option>)}</select></label>
        <button className="style-edit-button" onClick={() => { setStyleDraft({ ...palette, name: "Custom" }); setFontDraft(fonts); setStyleEditor(true) }}>Style editor</button>
      </div>
      <button className="about-button" onClick={() => setAboutOpen(true)}>About</button>
    </header>

    {aboutOpen && <Dialog labelledBy="about-title" onClose={closeAbout} className="about-modal">
      <header><div><span className="eyebrow">ABOUT</span><h2 id="about-title">BBStyler</h2></div><button onClick={closeAbout} aria-label="Close About dialog" title="Close About dialog"><Icon name="close" /></button></header>
      <div className="about-content">
        <p className="about-version">Version {packageJson.version}</p>
        <p>BBStyler helps educators create structured class content and export inline-styled HTML designed to survive Blackbaud’s editor.</p>
        <section><h3>Private by design</h3><p>There are no accounts, analytics, or backend services. Browser saves are temporary because clearing browser data can erase them. Back up your workspace often for a permanent copy.</p></section>
        <section><h3>Independent software</h3><p>BBStyler is not affiliated with, endorsed by, or produced by Blackbaud.</p></section>
        <a className="about-source" href="https://github.com/wildbil2me/assignment-styler" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
      </div>
      <footer><button className="apply-style" onClick={closeAbout}>Done</button></footer>
    </Dialog>}

    {styleEditor && <Dialog labelledBy="style-editor-title" onClose={closeStyleEditor}>
      <header><div><span className="eyebrow">CLASS STYLE</span><h2 id="style-editor-title">Create a custom style</h2></div><button onClick={closeStyleEditor} aria-label="Close style editor" title="Close style editor"><Icon name="close" /></button></header>
      <div className="style-form">
        {/* conformance-ignore FORM-05 The style-name input is nested directly in its visible label. */}
        <label>Style name<input value={styleDraft.className} onChange={event => setStyleDraft(value => ({ ...value, className: event.target.value }))} /></label>
        <div className="color-grid">
          <label>Primary color<span><input aria-label="Primary color" type="color" value={styleDraft.primary} onChange={event => setStyleDraft(value => ({ ...value, primary: event.target.value }))} />{styleDraft.primary}</span></label>
          <label>Accent color<span><input aria-label="Accent color" type="color" value={styleDraft.accent} onChange={event => setStyleDraft(value => ({ ...value, accent: event.target.value }))} />{styleDraft.accent}</span></label>
          <label>Surface color<span><input aria-label="Surface color" type="color" value={styleDraft.surface} onChange={event => setStyleDraft(value => ({ ...value, surface: event.target.value }))} />{styleDraft.surface}</span></label>
          <label>Highlight color<span><input aria-label="Highlight color" type="color" value={styleDraft.focus} onChange={event => setStyleDraft(value => ({ ...value, focus: event.target.value }))} />{styleDraft.focus}</span></label>
        </div>
        {/* conformance-ignore FORM-05 Enclosing label and aria-label both name the heading-font select. */}
        <label>Heading font<select aria-label="Heading font" value={fontDraft.heading} onChange={event => setFontDraft(value => ({ ...value, heading: event.target.value }))}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label>
        {/* conformance-ignore FORM-05 Enclosing label and aria-label both name the body-font select. */}
        <label>Body font<select aria-label="Body font" value={fontDraft.body} onChange={event => setFontDraft(value => ({ ...value, body: event.target.value }))}><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label>
        {styleMessage && <p className="form-error" role="alert">{styleMessage}</p>}
        <div className="contrast-readout">{contrastRows(styleDraft, profiles[profileKey]).map(row => <div key={row.what} className={row.ok ? "contrast-ok" : "contrast-bad"}><span>{row.what}<br /><small>needs {row.required}:1</small></span><b>{row.ratio}</b></div>)}</div>
        <p className="import-help">Colors and fonts belong to your class. The visual style — {profiles[profileKey].name.toLowerCase()} — applies to every class.</p>
        {/* conformance-ignore CODE-08 The swatch is a live specimen of teacher-selected runtime colors and fonts. */}
        <div className="style-swatch" style={{ borderColor: styleDraft.accent, background: styleDraft.surface }}><strong style={{ color: styleDraft.primary, fontFamily: fontDraft.heading }}>Custom style preview</strong><p style={{ fontFamily: fontDraft.body }}>Clear, consistent content for your class.</p></div>
      </div>
      <footer>
        <button className="secondary" onClick={() => styleFileRef.current?.click()}>Import JSON</button>
        {/* conformance-ignore FORM-05 The adjacent Import JSON button names and opens this hidden file input. */}
        <input ref={styleFileRef} className="sr-only" tabIndex={-1} aria-label="Import class style JSON" type="file" accept="application/json,.json" onChange={event => importStyle(event.target.files?.[0])} />
        <button className="secondary" onClick={exportStyle}>Export JSON</button><span className="footer-spacer" />
        <button className="secondary" onClick={closeStyleEditor}>Cancel</button>
        <button className="apply-style" onClick={() => { setCustomPalette({ ...styleDraft, name: "Custom" }); setStyleKey("custom"); setFonts(fontDraft); closeStyleEditor(); announce("Applied the custom class style.") }}>Apply custom style</button>
      </footer>
    </Dialog>}

    {importOpen && <Dialog labelledBy="import-title" onClose={closeImport} className="import-modal">
      <header><div><span className="eyebrow">IMPORT</span><h2 id="import-title">Import existing Blackbaud HTML</h2></div><button onClick={closeImport} aria-label="Close import dialog" title="Close import dialog"><Icon name="close" /></button></header>
      {/* conformance-ignore FORM-05 The HTML textarea is nested directly in its visible Existing HTML label. */}
      <div className="style-form"><p className="import-help">Open the existing Blackbaud post’s HTML/source editor, copy all of its HTML, and paste it below. The importer removes scripts and converts recognizable sections into editable blocks.</p><label>Existing HTML<textarea className="html-import-source" value={importSource} onChange={event => setImportSource(event.target.value)} placeholder="Paste existing Blackbaud HTML here…" /></label>{importMessage && <p className="import-message">{importMessage}</p>}</div>
      <footer><button className="secondary" onClick={closeImport}>Cancel</button><button className="apply-style" onClick={importExistingHtml} disabled={!importSource.trim()}>Create editable blocks</button></footer>
    </Dialog>}

    <section className="workspace">
      <aside className="rail">
        <div className="rail-head"><div className="post-name"><label htmlFor="post-title" className={`eyebrow save-${saveStatus}`}>COMPOSITION · {saveLabel}</label><input id="post-title" value={postTitle} onChange={event => setPostTitle(event.target.value)} aria-label="Composition name" /></div><div className="post-menu">
          <button ref={menuButtonRef} className="icon-button" aria-label="Post actions" title="Post actions" aria-haspopup="menu" aria-expanded={postMenu} onClick={() => setPostMenu(value => !value)}><Icon name="more" /></button>
          {postMenu && <div ref={menuRef} className="post-menu-popover" role="menu">
            <button role="menuitem" onClick={newPost}><span aria-hidden="true"><Icon name="add" /></span><div><strong>New post</strong><small>Start with a blank composition</small></div></button>
            <button role="menuitem" onClick={duplicatePost}><span aria-hidden="true"><Icon name="duplicate" /></span><div><strong>Duplicate draft</strong><small>Make an editable copy</small></div></button>
            <button role="menuitem" onClick={savePost}><span aria-hidden="true"><Icon name="save" /></span><div><strong>Save temporarily to My posts</strong><small>Browser data can erase this snapshot</small></div></button>
            <button role="menuitem" onClick={restoreExample}><span aria-hidden="true"><Icon name="restore" /></span><div><strong>Restore example</strong><small>Return to the Macbeth sample</small></div></button>
            <div className="saved-heading">PERMANENT WORKSPACE BACKUP</div>
            <button role="menuitem" onClick={downloadBackup}><span aria-hidden="true"><Icon name="download" /></span><div><strong>Back up workspace</strong><small>Download every post and style permanently</small></div></button>
            <button role="menuitem" onClick={() => backupFileRef.current?.click()}><span aria-hidden="true"><Icon name="upload" /></span><div><strong>Restore workspace backup</strong><small>Replaces this browser’s temporary workspace</small></div></button>
            {/* conformance-ignore FORM-05 The adjacent Restore workspace backup menu item names and opens this hidden input. */}
            <input ref={backupFileRef} className="sr-only" tabIndex={-1} aria-label="Restore BBStyler backup" type="file" accept="application/json,.json" onChange={event => restoreWorkspace(event.target)} />
            <div className="saved-heading">TEMPORARY MY POSTS</div>
            {savedPosts.length === 0 && <p className="empty-state compact">No temporary snapshots yet. Save one to My posts for reuse in this browser.</p>}
            {savedPosts.slice(0, 5).map(post => <button role="menuitem" key={post.id} onClick={() => loadPost(post)}><span aria-hidden="true">□</span><div><strong>{post.title}</strong><small>Open temporary snapshot</small></div></button>)}
          </div>}
        </div></div>
        <div className="purpose-picker"><span className="eyebrow">CREATE FOR</span><div role="tablist" aria-label="Blackbaud destination">{(Object.keys(surfaces) as SurfaceKey[]).map(key => <button key={key} role="tab" aria-selected={surfaceKey === key} className={surfaceKey === key ? "active" : ""} onClick={() => setSurfaceKey(key)}><strong>{surfaces[key].name}</strong><small>{surfaceDescriptions[key]}</small></button>)}</div></div>
        {/* conformance-ignore FORM-05 htmlFor and the computed aria-label both name the template select. */}
        <div className="draft-box"><label htmlFor="template">Start with {surfaceArticle(surface)} {surface.name.toLowerCase()} template</label><select aria-label={`${surface.name} template`} id="template" key={surfaceKey} defaultValue="" onChange={event => { if (event.target.value) applyTemplate(event.target.value); event.target.value = "" }}><option value="" disabled>Choose a structure…</option>{templateGroups[surfaceKey].map(template => <option key={template}>{template}</option>)}</select><button className="import-button" onClick={() => setImportOpen(true)}>Import existing Blackbaud HTML</button></div>
        <BlockList c={c} />
      </aside>
      <section className="stage" aria-label="Post preview"><Preview c={c} device={device} onDevice={setDevice} /></section>
      <aside className="inspector"><ExportPanel c={c} label="Copy for Blackbaud" hint="Paste into Blackbaud’s HTML editor, then preview before publishing." /><BlockFields c={c} /><Checks c={c} /></aside>
    </section>
    <footer className="app-footer">
      <div className="footer-grid">
        <section className="footer-block footer-brand" aria-label="BBStyler">
          <span className="brandmark" aria-hidden="true">BB</span>
          <div><strong>BBStyler</strong><small>for Blackbaud</small></div>
        </section>
        <section className="footer-block footer-note" aria-label="About BBStyler">
          <strong>Build clearer class posts.</strong>
          <small>Independent, private-by-design software for educators.</small>
        </section>
        <section className="footer-block footer-support" aria-label="Support BBStyler">
          <a href="https://ko-fi.com/O1F623ASR1" target="_blank" rel="noreferrer"><img height="36" src={`${import.meta.env.BASE_URL}kofi6.png`} alt="Buy Me a Coffee at ko-fi.com" /></a>
        </section>
      </div>
    </footer>
  </main>;
}
