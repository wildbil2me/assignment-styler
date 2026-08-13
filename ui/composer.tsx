import { useState } from "react";

import type { Palette, Profile, ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, profileKeys, defaultProfile } from "../core/profiles/index.ts";
import { surfaces, surfaceDescriptions } from "../core/surfaces.ts";
import { templateGroups } from "../core/templates.ts";
import { importHtml } from "../core/import.ts";
import { contrastRatio, requiredRatio, ASSUMED_PAGE_BACKGROUND } from "../core/checks.ts";
import { nextId, nextIds } from "../core/ids.ts";
import { backupFilename, parse, serialize } from "../core/storage.ts";
import { starter } from "../core/templates.ts";
import { BlockList } from "./blocklist.tsx";
import { BlockFields, Checks } from "./inspector.tsx";
import { ExportPanel } from "./export.tsx";
import { Preview, type Device } from "./preview.tsx";
import { useComposer, type SavedPost } from "./state.ts";

/**
 * What a teacher's colour choices do to the three pairs that matter, live, while
 * they are choosing. The eyebrow row is the one that earns its place: every
 * shipped accent already fails it against a white page, so the readout tells the
 * truth about our own defaults rather than only about custom ones.
 */
function contrastRows(palette: Palette, profile: Profile) {
  const size = (v: string) => parseFloat(v) || 0;
  const bold = size(profile.fontWeights.bold) || 700;
  const pairs = [
    { what: "Card heading on card", fg: palette.primary, bg: palette.surface, px: size(profile.heading.size), weight: size(profile.heading.weight) || bold },
    { what: "Body text on card", fg: profile.colors.text, bg: palette.surface, px: size(profile.fontSizes.body), weight: size(profile.fontWeights.normal) || 400 },
    { what: "Label on the page", fg: palette.accent, bg: ASSUMED_PAGE_BACKGROUND, px: size(profile.fontSizes.label), weight: bold },
  ];
  return pairs.map(p => {
    const ratio = contrastRatio(p.fg, p.bg), required = requiredRatio(p.px, p.weight);
    return { what: p.what, required, ratio: ratio === null ? "—" : `${ratio.toFixed(2)}:1`, ok: ratio !== null && ratio >= required };
  });
}

/**
 * The full editor, the Pages shell's only screen.
 *
 * Everything here that the side panel also does lives in `useComposer` or a
 * shared component; what is left in this file is the chrome the panel
 * deliberately drops — saved posts, the style editor, HTML import, templates,
 * and the desktop/mobile stage.
 */
export function Composer() {
  const c = useComposer();
  const { blocks, setBlocks, postTitle, setPostTitle, setSelected, styleKey, setStyleKey, profileKey, setProfileKey,
    fonts, setFonts, customPalette, setCustomPalette, surfaceKey, setSurfaceKey, savedPosts, setSavedPosts,
    palette, surface, applyTemplate, workspace, restore } = c;
  const [postMenu, setPostMenu] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [styleEditor, setStyleEditor] = useState(false);
  const [styleDraft, setStyleDraft] = useState<Palette>(customPalette);
  const [fontDraft, setFontDraft] = useState<Profile["fonts"]>(defaultProfile.fonts);
  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState("");
  const [importMessage, setImportMessage] = useState("");

  const savePost = () => {setSavedPosts(v=>[{id:Date.now(),title:postTitle,blocks:blocks.map(b=>({...b}))},...v].slice(0,12));setPostMenu(false)};
  const loadPost = (p:SavedPost) => {setPostTitle(p.title);setBlocks(p.blocks.map(b=>({...b})));setSelected(p.blocks[0]?.id);setPostMenu(false)};
  const chooseSurface = (key:SurfaceKey) => setSurfaceKey(key);
  // A shared style file is now { palette, profile, fonts } — colour, feel and
  // type, the three things Phase 2 separated. v1 files were one fused object;
  // they still import, so a style a colleague shared last month keeps working.
  const exportStyle = () => {const payload={version:2,palette:{...styleDraft,name:"Custom"},profile:profileKey,fonts:fontDraft};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${styleDraft.className.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"class-style"}.json`;a.click();URL.revokeObjectURL(url)};
  const importStyle = async (file?:File) => {if(!file)return;try{const parsed=JSON.parse(await file.text());const p=parsed.palette||parsed;if(!p.primary||!p.accent)throw new Error();setStyleDraft({...styleDraft,...p,name:"Custom"});const f=parsed.fonts||(p.heading&&p.body?{heading:p.heading,body:p.body}:null);if(f)setFontDraft({heading:f.heading||fontDraft.heading,body:f.body||fontDraft.body});if(parsed.profile&&parsed.profile in profiles)setProfileKey(parsed.profile)}catch{window.alert("That file is not a valid Betterbaud style.")}};
  const importExistingHtml = () => {
    const result = importHtml(importSource);
    if (!result.blocks.length) { setImportMessage(result.message); return }
    setBlocks(result.blocks);
    setSelected(result.blocks[0].id);
    if (result.postTitle) setPostTitle(result.postTitle);
    setImportMessage(result.message);
    setTimeout(()=>{setImportOpen(false);setImportMessage("");setImportSource("")},900);
  };
  const newPost = () => { const id=nextId(); setBlocks([{id,type:"hero",label:"CLASS UPDATE",title:"UNTITLED POST",body:"Add a subtitle"}]); setSelected(id); setPostTitle("Untitled class post"); setPostMenu(false); };
  const duplicatePost = () => { const ids=nextIds(blocks.length); const copies=blocks.map((b,i)=>({...b,id:ids[i]})); setBlocks(copies); setSelected(copies[0]?.id); setPostTitle(`${postTitle} — Copy`); setPostMenu(false); };
  /**
   * The whole workspace as a file the teacher owns. Everything else in this tool
   * lives in one browser's storage and dies with a cleared cache or a reimaged
   * school laptop; this is the only way any of it survives that.
   */
  const backupWorkspace = () => {
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([serialize(workspace)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = backupFilename(postTitle, today); a.click();
    URL.revokeObjectURL(url);
    setPostMenu(false);
  };
  const restoreWorkspace = async (file?: File) => {
    if (!file) return;
    const result = parse(await file.text());
    if (!result.workspace) { window.alert(result.message); return }
    if (!window.confirm(`${result.message}\n\nThis replaces everything currently in the composer. Continue?`)) return;
    restore(result.workspace);
    setPostMenu(false);
  };
  const restoreExample = () => { setBlocks(starter.map(b=>({...b}))); setSelected(3); setPostTitle("Tuesday’s class post"); setPostMenu(false); };

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brandmark">B</span><div><strong>Betterbaud</strong><small>for Blackbaud</small></div></div><div className="style-tools"><label className="class-picker"><span className="class-dot" style={{background:palette.accent}}/><select value={styleKey} onChange={e=>setStyleKey(e.target.value as StyleKey)} aria-label="Class style">{Object.entries(palettes).map(([key,p])=><option key={key} value={key}>{p.name} · {p.className}</option>)}<option value="custom">Custom · {customPalette.className}</option></select></label><label className="class-picker"><select value={profileKey} onChange={e=>setProfileKey(e.target.value as ProfileKey)} aria-label="Visual style">{profileKeys.map(key=><option key={key} value={key}>{profiles[key].name}</option>)}</select></label><button className="style-edit-button" onClick={()=>{setStyleDraft({...palette,name:"Custom"});setFontDraft(fonts);setStyleEditor(true)}}>Style editor</button></div><button className="avatar" aria-label="Account">WB</button></header>
    {/* Closing on a backdrop press is a target check, not a stopPropagation on
        the dialog: a dialog is not an interactive element, so hanging a mouse
        handler off it to swallow clicks was both a lint error and a thing that
        would have swallowed a keyboard user's events too. */}
    {styleEditor&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setStyleEditor(false)}}><section className="style-modal" role="dialog" aria-modal="true" aria-labelledby="style-editor-title"><header><div><span className="eyebrow">CLASS STYLE</span><h2 id="style-editor-title">Create a custom style</h2></div><button onClick={()=>setStyleEditor(false)} aria-label="Close">×</button></header><div className="style-form"><label>Style name<input value={styleDraft.className} onChange={e=>setStyleDraft(v=>({...v,className:e.target.value}))}/></label><div className="color-grid"><label>Primary color<span><input type="color" value={styleDraft.primary} onChange={e=>setStyleDraft(v=>({...v,primary:e.target.value}))}/>{styleDraft.primary}</span></label><label>Accent color<span><input type="color" value={styleDraft.accent} onChange={e=>setStyleDraft(v=>({...v,accent:e.target.value}))}/>{styleDraft.accent}</span></label><label>Surface color<span><input type="color" value={styleDraft.surface} onChange={e=>setStyleDraft(v=>({...v,surface:e.target.value}))}/>{styleDraft.surface}</span></label><label>Highlight color<span><input type="color" value={styleDraft.focus} onChange={e=>setStyleDraft(v=>({...v,focus:e.target.value}))}/>{styleDraft.focus}</span></label></div><label>Heading font<select value={fontDraft.heading} onChange={e=>setFontDraft(v=>({...v,heading:e.target.value}))}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label><label>Body font<select value={fontDraft.body} onChange={e=>setFontDraft(v=>({...v,body:e.target.value}))}><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label><div className="contrast-readout">{contrastRows(styleDraft, profiles[profileKey]).map(row=><div key={row.what} className={row.ok?"contrast-ok":"contrast-bad"}><span>{row.what}<br/><small>needs {row.required}:1</small></span><b>{row.ratio}</b></div>)}</div><p className="import-help">Colors and fonts belong to your class. The visual style — {profiles[profileKey].name.toLowerCase()} — is chosen in the toolbar and applies to every class.</p><div className="style-swatch" style={{borderColor:styleDraft.accent,background:styleDraft.surface}}><strong style={{color:styleDraft.primary,fontFamily:fontDraft.heading}}>Custom style preview</strong><p style={{fontFamily:fontDraft.body}}>Clear, consistent content for your class.</p></div></div><footer><label className="import-style">Import JSON<input type="file" accept="application/json,.json" onChange={e=>importStyle(e.target.files?.[0])}/></label><button className="secondary" onClick={exportStyle}>Export JSON</button><span className="footer-spacer"/><button className="secondary" onClick={()=>setStyleEditor(false)}>Cancel</button><button className="apply-style" onClick={()=>{setCustomPalette({...styleDraft,name:"Custom"});setStyleKey("custom");setFonts(fontDraft);setStyleEditor(false)}}>Apply custom style</button></footer></section></div>}
    {importOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setImportOpen(false)}}><section className="style-modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><header><div><span className="eyebrow">IMPORT</span><h2 id="import-title">Import existing Blackbaud HTML</h2></div><button onClick={()=>setImportOpen(false)} aria-label="Close">×</button></header><div className="style-form"><p className="import-help">Open the existing Blackbaud post’s HTML/source editor, copy all of its HTML, and paste it below. The importer removes scripts and converts recognizable sections into editable blocks.</p><label>Existing HTML<textarea className="html-import-source" value={importSource} onChange={e=>setImportSource(e.target.value)} placeholder="Paste existing Blackbaud HTML here…" /></label>{importMessage&&<p className="import-message">{importMessage}</p>}</div><footer><button className="secondary" onClick={()=>setImportOpen(false)}>Cancel</button><button className="apply-style" onClick={importExistingHtml} disabled={!importSource.trim()}>Create editable blocks</button></footer></section></div>}
    <section className="workspace">
      <aside className="rail">
        <div className="rail-head"><div className="post-name"><label htmlFor="post-title" className="eyebrow">COMPOSITION · AUTOSAVED</label><input id="post-title" value={postTitle} onChange={e=>setPostTitle(e.target.value)} aria-label="Composition name" /></div><div className="post-menu"><button className="icon-button" aria-label="Post actions" aria-expanded={postMenu} onClick={()=>setPostMenu(v=>!v)}>•••</button>{postMenu&&<div className="post-menu-popover"><button onClick={newPost}><span>＋</span><div><strong>New post</strong><small>Start with a blank composition</small></div></button><button onClick={duplicatePost}><span>▣</span><div><strong>Duplicate draft</strong><small>Make an editable copy</small></div></button><button onClick={savePost}><span>↓</span><div><strong>Save to My posts</strong><small>Keep a named snapshot</small></div></button><button onClick={restoreExample}><span>↺</span><div><strong>Restore example</strong><small>Return to the Macbeth sample</small></div></button><div className="saved-heading">EVERYTHING</div><button onClick={backupWorkspace}><span>⭳</span><div><strong>Back up to a file</strong><small>Every post and style, as JSON</small></div></button><label className="menu-file"><span>⭱</span><div><strong>Restore from a backup</strong><small>Replaces what’s in the composer</small></div><input type="file" accept="application/json,.json" onChange={e=>restoreWorkspace(e.target.files?.[0])}/></label>{savedPosts.length>0&&<div className="saved-heading">MY POSTS</div>}{savedPosts.slice(0,5).map(p=><button key={p.id} onClick={()=>loadPost(p)}><span>□</span><div><strong>{p.title}</strong><small>Open saved snapshot</small></div></button>)}</div>}</div></div>
        <div className="purpose-picker"><span className="eyebrow">CREATE FOR</span><div role="tablist" aria-label="Blackbaud destination">{(Object.keys(surfaces) as SurfaceKey[]).map(key=><button key={key} role="tab" aria-selected={surfaceKey===key} className={surfaceKey===key?"active":""} onClick={()=>chooseSurface(key)}><strong>{surfaces[key].name}</strong><small>{surfaceDescriptions[key]}</small></button>)}</div></div>
        <div className="draft-box"><label htmlFor="template">Start with a {surface.name.toLowerCase()} template</label><select id="template" key={surfaceKey} defaultValue="" onChange={e=>{if(e.target.value)applyTemplate(e.target.value);e.target.value=""}}><option value="" disabled>Choose a structure…</option>{templateGroups[surfaceKey].map(t=><option key={t}>{t}</option>)}</select><button className="import-button" onClick={()=>setImportOpen(true)}>Import existing Blackbaud HTML</button></div>
        <BlockList c={c} />
      </aside>

      <section className="stage">
        <Preview c={c} device={device} onDevice={setDevice} />
      </section>

      <aside className="inspector">
        <BlockFields c={c} />
        <Checks c={c} />
        <ExportPanel c={c} label="Copy for Blackbaud" hint="Paste into Blackbaud’s HTML editor, then preview before publishing." />
      </aside>
    </section>
  </main>;
}
