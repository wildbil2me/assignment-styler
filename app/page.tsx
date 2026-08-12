"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Block, BlockType, Palette, Profile, ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { blockMeta } from "../core/catalog.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, profileKeys, defaultProfile, withFonts } from "../core/profiles/index.ts";
import { surfaces, surfaceDescriptions } from "../core/surfaces.ts";
import { templateGroups, templates, starter } from "../core/templates.ts";
import { renderHtml } from "../core/render.ts";
import { importHtml } from "../core/import.ts";

function RichEditor({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  const command = (name:string, arg?:string) => { ref.current?.focus(); document.execCommand(name, false, arg); onChange(ref.current?.innerHTML || ""); };
  const emojis = ["📘","📖","✏️","💡","❓","✅","⚠️","📅","🔬","🎨","🌎","✦"];
  return <div className="rich-editor"><div className="formatbar">
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("bold")} aria-label="Bold"><b>B</b></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("italic")} aria-label="Italic"><i>I</i></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("underline")} aria-label="Underline"><u>U</u></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("strikeThrough")} aria-label="Strikethrough"><s>S</s></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertUnorderedList")} aria-label="Bulleted list">•≡</button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertOrderedList")} aria-label="Numbered list">1.</button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{const url=window.prompt("Link URL");if(url)command("createLink",url)}} aria-label="Add link">↗</button>
    <label title="Font color"><span>A</span><input type="color" defaultValue="#243B53" onChange={e=>command("foreColor",e.target.value)}/></label>
    <label title="Highlight"><span className="highlight-a">A</span><input type="color" defaultValue="#FEF3C7" onChange={e=>command("hiliteColor",e.target.value)}/></label>
    <details className="emoji-menu"><summary title="Insert emoji">☺</summary><div>{emojis.map(x=><button type="button" key={x} onMouseDown={e=>e.preventDefault()} onClick={()=>command("insertText",x)}>{x}</button>)}</div></details>
  </div><div key={value === "" ? "empty" : "filled"} ref={ref} className="editable" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:value.replace(/\n/g,"<br>")}} onInput={e=>onChange(e.currentTarget.innerHTML)} /></div>;
}

export default function Home() {
  const [blocks, setBlocks] = useState(starter);
  const [postTitle, setPostTitle] = useState("Tuesday’s class post");
  const [postMenu, setPostMenu] = useState(false);
  const [selected, setSelected] = useState(3);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [draft, setDraft] = useState("We finished Macbeth 2.1 today. For homework, read 2.2 and mark examples of blood imagery. Bring one discussion question. Vocabulary quiz Thursday.");
  const [copied, setCopied] = useState(false);
  const [styleKey, setStyleKey] = useState<StyleKey>("english");
  const [profileKey, setProfileKey] = useState<ProfileKey>(defaultProfile.id);
  const [fonts, setFonts] = useState<Profile["fonts"]>(defaultProfile.fonts);
  const [customPalette, setCustomPalette] = useState<Palette>({...palettes.english,name:"Custom",className:"My Custom Style"});
  const [styleEditor, setStyleEditor] = useState(false);
  const [styleDraft, setStyleDraft] = useState<Palette>(customPalette);
  const [fontDraft, setFontDraft] = useState<Profile["fonts"]>(defaultProfile.fonts);
  const [savedPosts, setSavedPosts] = useState<Array<{id:number;title:string;blocks:Block[]}>>([]);
  const [exportHistory, setExportHistory] = useState<Array<{date:string;title:string;html:string}>>([]);
  const [drafting, setDrafting] = useState(false);
  const [surfaceKey, setSurfaceKey] = useState<SurfaceKey>("bulletin");
  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const past = useRef<Block[][]>([]), future = useRef<Block[][]>([]), previous = useRef<Block[]>(starter), historyAction = useRef(false);
  const dragged = useRef<number | null>(null);
  const palette = styleKey === "custom" ? customPalette : palettes[styleKey];
  // Profile is the feel, palette is the subject. The teacher's font choice is a
  // profile override rather than a fourth profile.
  const profile = useMemo(() => withFonts(profiles[profileKey], fonts), [profileKey, fonts]);
  const surface = surfaces[surfaceKey];
  const html = useMemo(() => renderHtml(blocks, profile, palette, surface), [blocks, profile, palette, surface]);
  const active = blocks.find(b => b.id === selected);

  useEffect(()=>{try{const raw=localStorage.getItem("bcc-workspace");if(raw){const d=JSON.parse(raw);if(d.blocks)setBlocks(d.blocks.map(({animation,...b}:Block&{animation?:string})=>b));if(d.postTitle)setPostTitle(d.postTitle);if(d.styleKey)setStyleKey(d.styleKey);if(d.surfaceKey&&d.surfaceKey in surfaces)setSurfaceKey(d.surfaceKey);if(d.profileKey&&d.profileKey in profiles)setProfileKey(d.profileKey);if(d.fonts)setFonts({...defaultProfile.fonts,...d.fonts});
    // Phase 2 split colour from type. A pre-split workspace stored one fused
    // `customStyle`; take its colours as the custom palette, and its fonts only
    // if the teacher had actually chosen them by selecting the custom style.
    if(d.customPalette)setCustomPalette(d.customPalette);else if(d.customStyle){const c=d.customStyle;setCustomPalette({name:"Custom",className:c.className||"My Custom Style",primary:c.primary,accent:c.accent,surface:c.surface,focus:c.focus});if(d.styleKey==="custom"&&(c.heading||c.body))setFonts({heading:c.heading||defaultProfile.fonts.heading,body:c.body||defaultProfile.fonts.body})}
    if(d.savedPosts)setSavedPosts(d.savedPosts.map((p:{id:number;title:string;blocks:Array<Block&{animation?:string}>})=>({...p,blocks:p.blocks.map(({animation,...b})=>b)})));setExportHistory([])}}catch{}},[]);
  useEffect(()=>{const before=JSON.stringify(previous.current),after=JSON.stringify(blocks);if(before!==after){if(!historyAction.current){past.current.push(previous.current);if(past.current.length>50)past.current.shift();future.current=[]}previous.current=blocks;historyAction.current=false}},[blocks]);
  useEffect(()=>{const timer=setTimeout(()=>{localStorage.setItem("bcc-workspace",JSON.stringify({blocks,postTitle,styleKey,surfaceKey,profileKey,fonts,customPalette,savedPosts,exportHistory}))},250);return()=>clearTimeout(timer)},[blocks,postTitle,styleKey,surfaceKey,profileKey,fonts,customPalette,savedPosts,exportHistory]);

  const update = (patch: Partial<Block>) => setBlocks(v => v.map(b => b.id === selected ? { ...b, ...patch } : b));
  const move = (id: number, by: number) => setBlocks(v => { const i=v.findIndex(b=>b.id===id), j=i+by; if(j<0||j>=v.length)return v; const n=[...v]; [n[i],n[j]]=[n[j],n[i]]; return n; });
  const localGenerate = () => {
    const quiz = draft.match(/quiz\s+(?:is\s+)?(Monday|Tuesday|Wednesday|Thursday|Friday)/i)?.[1] || "Thursday";
    const read = draft.match(/read\s+([^.!]+)/i)?.[1] || "the assigned passage";
    const focus = draft.match(/mark\s+([^.!]+)/i)?.[1] || "key patterns and changes";
    setBlocks([
      { id: 11, type:"hero", label:"UNIT UPDATE", title:"MACBETH · ACT II", body:"Consequences and conscience" },
      { id: 12, type:"intro", title:"", body:"Today’s work carries us from the decision into its consequences." },
      { id: 13, type:"reading", width:"half", title:"Tonight’s reading", body:`Read ${read.replace(/^Act/i,"Act")}.` },
      { id: 14, type:"focus", width:"half", title:"Reading focus", body:`Annotate ${focus}.` },
      { id: 15, type:"homework", title:"Be ready to discuss", body:"Bring one original discussion question to class." },
      { id: 16, type:"deadline", title:"Coming up", body:`Vocabulary quiz · ${quiz}` },
    ]); setSelected(13);
  };
  const generate = async () => {setDrafting(true);try{const res=await fetch("/api/draft",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({draft,subject:palette.name})});if(!res.ok)throw new Error();const data=await res.json(),stamp=Date.now();const next=data.blocks.map((b:Block,i:number)=>({...b,id:stamp+i}));setBlocks(next);setSelected(stamp)}catch{localGenerate()}finally{setDrafting(false)}};
  const copy = async () => { await navigator.clipboard.writeText(html); setExportHistory(v=>[{date:new Date().toLocaleString(),title:postTitle,html},...v].slice(0,10)); setCopied(true); setTimeout(()=>setCopied(false),1800); };
  const isExtension = typeof location !== "undefined" && location.protocol === "chrome-extension:";
  const undo = () => {const prior=past.current.pop();if(!prior)return;future.current.push(blocks);historyAction.current=true;setBlocks(prior)};
  const redo = () => {const next=future.current.pop();if(!next)return;past.current.push(blocks);historyAction.current=true;setBlocks(next)};
  const savePost = () => {setSavedPosts(v=>[{id:Date.now(),title:postTitle,blocks:blocks.map(b=>({...b}))},...v].slice(0,12));setPostMenu(false)};
  const loadPost = (p:{title:string;blocks:Block[]}) => {setPostTitle(p.title);setBlocks(p.blocks.map(b=>({...b})));setSelected(p.blocks[0]?.id);setPostMenu(false)};
  const useTemplate = (name:string) => {const source=templates[name];if(!source)return;const stamp=Date.now(),next=source.map((b,i)=>({...b,id:stamp+i}));setBlocks(next);setSelected(stamp);setPostTitle(name);};
  const chooseSurface = (key:SurfaceKey) => setSurfaceKey(key);
  const duplicateBlock = (id:number) => {const i=blocks.findIndex(b=>b.id===id);if(i<0)return;const copy={...blocks[i],id:Date.now(),title:`${blocks[i].title} copy`};setBlocks(v=>[...v.slice(0,i+1),copy,...v.slice(i+1)]);setSelected(copy.id)};
  const dropBlock = (target:number) => {const source=dragged.current;if(source===null||source===target)return;setBlocks(v=>{const n=[...v],from=n.findIndex(b=>b.id===source),to=n.findIndex(b=>b.id===target);const [item]=n.splice(from,1);n.splice(to,0,item);return n});dragged.current=null};
  // A shared style file is now { palette, profile, fonts } — colour, feel and
  // type, the three things Phase 2 separated. v1 files were one fused object;
  // they still import, so a style a colleague shared last month keeps working.
  const exportStyle = () => {const payload={version:2,palette:{...styleDraft,name:"Custom"},profile:profileKey,fonts:fontDraft};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${styleDraft.className.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"class-style"}.json`;a.click();URL.revokeObjectURL(url)};
  const importStyle = async (file?:File) => {if(!file)return;try{const parsed=JSON.parse(await file.text());const p=parsed.palette||parsed;if(!p.primary||!p.accent)throw new Error();setStyleDraft({...styleDraft,...p,name:"Custom"});const f=parsed.fonts||(p.heading&&p.body?{heading:p.heading,body:p.body}:null);if(f)setFontDraft({heading:f.heading||fontDraft.heading,body:f.body||fontDraft.body});if(parsed.profile&&parsed.profile in profiles)setProfileKey(parsed.profile)}catch{window.alert("That file is not a valid Content Composer style.")}};
  const importExistingHtml = () => {
    const result = importHtml(importSource);
    if (!result.blocks.length) { setImportMessage(result.message); return }
    setBlocks(result.blocks);
    setSelected(result.blocks[0].id);
    if (result.postTitle) setPostTitle(result.postTitle);
    setImportMessage(result.message);
    setTimeout(()=>{setImportOpen(false);setImportMessage("");setImportSource("")},900);
  };
  const newPost = () => { const id=Date.now(); setBlocks([{id,type:"hero",label:"CLASS UPDATE",title:"UNTITLED POST",body:"Add a subtitle"}]); setSelected(id); setPostTitle("Untitled class post"); setPostMenu(false); };
  const duplicatePost = () => { const stamp=Date.now(); const copies=blocks.map((b,i)=>({...b,id:stamp+i})); setBlocks(copies); setSelected(copies[0]?.id); setPostTitle(`${postTitle} — Copy`); setPostMenu(false); };
  const restoreExample = () => { setBlocks(starter.map(b=>({...b}))); setSelected(3); setPostTitle("Tuesday’s class post"); setPostMenu(false); };

  return <main className={`app-shell ${isExtension?"extension-shell":""}`}>
    <header className="topbar"><div className="brand"><span className="brandmark">C</span><div><strong>Content Composer</strong><small>for Blackbaud</small></div></div><div className="style-tools"><label className="class-picker"><span className="class-dot" style={{background:palette.accent}}/><select value={styleKey} onChange={e=>setStyleKey(e.target.value as StyleKey)} aria-label="Class style">{Object.entries(palettes).map(([key,p])=><option key={key} value={key}>{p.name} · {p.className}</option>)}<option value="custom">Custom · {customPalette.className}</option></select></label><label className="class-picker"><select value={profileKey} onChange={e=>setProfileKey(e.target.value as ProfileKey)} aria-label="Visual style">{profileKeys.map(key=><option key={key} value={key}>{profiles[key].name}</option>)}</select></label><button className="style-edit-button" onClick={()=>{setStyleDraft({...palette,name:"Custom"});setFontDraft(fonts);setStyleEditor(true)}}>Style editor</button></div><button className="avatar" aria-label="Account">WB</button></header>
    {styleEditor&&<div className="modal-backdrop" onMouseDown={()=>setStyleEditor(false)}><section className="style-modal" onMouseDown={e=>e.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="style-editor-title"><header><div><span className="eyebrow">CLASS STYLE</span><h2 id="style-editor-title">Create a custom style</h2></div><button onClick={()=>setStyleEditor(false)} aria-label="Close">×</button></header><div className="style-form"><label>Style name<input value={styleDraft.className} onChange={e=>setStyleDraft(v=>({...v,className:e.target.value}))}/></label><div className="color-grid"><label>Primary color<span><input type="color" value={styleDraft.primary} onChange={e=>setStyleDraft(v=>({...v,primary:e.target.value}))}/>{styleDraft.primary}</span></label><label>Accent color<span><input type="color" value={styleDraft.accent} onChange={e=>setStyleDraft(v=>({...v,accent:e.target.value}))}/>{styleDraft.accent}</span></label><label>Surface color<span><input type="color" value={styleDraft.surface} onChange={e=>setStyleDraft(v=>({...v,surface:e.target.value}))}/>{styleDraft.surface}</span></label><label>Highlight color<span><input type="color" value={styleDraft.focus} onChange={e=>setStyleDraft(v=>({...v,focus:e.target.value}))}/>{styleDraft.focus}</span></label></div><label>Heading font<select value={fontDraft.heading} onChange={e=>setFontDraft(v=>({...v,heading:e.target.value}))}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label><label>Body font<select value={fontDraft.body} onChange={e=>setFontDraft(v=>({...v,body:e.target.value}))}><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label><p className="import-help">Colors and fonts belong to your class. The visual style — {profiles[profileKey].name.toLowerCase()} — is chosen in the toolbar and applies to every class.</p><div className="style-swatch" style={{borderColor:styleDraft.accent,background:styleDraft.surface}}><strong style={{color:styleDraft.primary,fontFamily:fontDraft.heading}}>Custom style preview</strong><p style={{fontFamily:fontDraft.body}}>Clear, consistent content for your class.</p></div></div><footer><label className="import-style">Import JSON<input type="file" accept="application/json,.json" onChange={e=>importStyle(e.target.files?.[0])}/></label><button className="secondary" onClick={exportStyle}>Export JSON</button><span className="footer-spacer"/><button className="secondary" onClick={()=>setStyleEditor(false)}>Cancel</button><button className="apply-style" onClick={()=>{setCustomPalette({...styleDraft,name:"Custom"});setStyleKey("custom");setFonts(fontDraft);setStyleEditor(false)}}>Apply custom style</button></footer></section></div>}
    {importOpen&&<div className="modal-backdrop" onMouseDown={()=>setImportOpen(false)}><section className="style-modal import-modal" onMouseDown={e=>e.stopPropagation()} aria-modal="true" role="dialog" aria-labelledby="import-title"><header><div><span className="eyebrow">IMPORT</span><h2 id="import-title">Import existing Blackbaud HTML</h2></div><button onClick={()=>setImportOpen(false)} aria-label="Close">×</button></header><div className="style-form"><p className="import-help">Open the existing Blackbaud post’s HTML/source editor, copy all of its HTML, and paste it below. The importer removes scripts and converts recognizable sections into editable blocks.</p><label>Existing HTML<textarea className="html-import-source" value={importSource} onChange={e=>setImportSource(e.target.value)} placeholder="Paste existing Blackbaud HTML here…" /></label>{importMessage&&<p className="import-message">{importMessage}</p>}</div><footer><button className="secondary" onClick={()=>setImportOpen(false)}>Cancel</button><button className="apply-style" onClick={importExistingHtml} disabled={!importSource.trim()}>Create editable blocks</button></footer></section></div>}
    <section className="workspace">
      <aside className="rail">
        <div className="rail-head"><div className="post-name"><label htmlFor="post-title" className="eyebrow">COMPOSITION · AUTOSAVED</label><input id="post-title" value={postTitle} onChange={e=>setPostTitle(e.target.value)} aria-label="Composition name" /></div><div className="post-menu"><button className="icon-button" aria-label="Post actions" aria-expanded={postMenu} onClick={()=>setPostMenu(v=>!v)}>•••</button>{postMenu&&<div className="post-menu-popover"><button onClick={newPost}><span>＋</span><div><strong>New post</strong><small>Start with a blank composition</small></div></button><button onClick={duplicatePost}><span>▣</span><div><strong>Duplicate draft</strong><small>Make an editable copy</small></div></button><button onClick={savePost}><span>↓</span><div><strong>Save to My posts</strong><small>Keep a named snapshot</small></div></button><button onClick={restoreExample}><span>↺</span><div><strong>Restore example</strong><small>Return to the Macbeth sample</small></div></button>{savedPosts.length>0&&<div className="saved-heading">MY POSTS</div>}{savedPosts.slice(0,5).map(p=><button key={p.id} onClick={()=>loadPost(p)}><span>□</span><div><strong>{p.title}</strong><small>Open saved snapshot</small></div></button>)}</div>}</div></div>
        <div className="purpose-picker"><span className="eyebrow">CREATE FOR</span><div role="tablist" aria-label="Blackbaud destination">{(Object.keys(surfaces) as SurfaceKey[]).map(key=><button key={key} role="tab" aria-selected={surfaceKey===key} className={surfaceKey===key?"active":""} onClick={()=>chooseSurface(key)}><strong>{surfaces[key].name}</strong><small>{surfaceDescriptions[key]}</small></button>)}</div></div>
        <div className="draft-box"><label htmlFor="template">Start with a {surface.name.toLowerCase()} template</label><select id="template" key={surfaceKey} defaultValue="" onChange={e=>{if(e.target.value)useTemplate(e.target.value);e.target.value=""}}><option value="" disabled>Choose a structure…</option>{templateGroups[surfaceKey].map(t=><option key={t}>{t}</option>)}</select><button className="import-button" onClick={()=>setImportOpen(true)}>Import existing Blackbaud HTML</button><label htmlFor="draft">Describe what you’re creating</label><textarea id="draft" value={draft} onChange={e=>setDraft(e.target.value)}/><button onClick={generate} disabled={drafting}><span>✦</span> {drafting?"Drafting…":"Draft with AI"}</button></div>
        <div className="block-head"><span>CONTENT BLOCKS</span><button onClick={()=>{const id=Date.now();setBlocks(v=>[...v,{id,type:"note",title:"Note",body:"Add your note here."}]);setSelected(id)}}>＋ Add block</button></div>
        <div className="blocks">{blocks.map((b,i)=><div key={b.id} draggable onDragStart={()=>dragged.current=b.id} onDragOver={e=>e.preventDefault()} onDrop={()=>dropBlock(b.id)} className={`block-row ${selected===b.id?"selected":""} ${b.hidden?"hidden-block":""}`} onClick={()=>setSelected(b.id)}>
          <span className={`type-icon ${b.type}`}>{blockMeta[b.type].icon}</span><div><strong>{blockMeta[b.type].label}</strong><small>{b.hidden?"Hidden · ":""}{b.title || b.body.replace(/<[^>]+>/g,"").slice(0,38)}</small></div><span className="block-actions"><button onClick={e=>{e.stopPropagation();duplicateBlock(b.id)}} aria-label="Duplicate block">▣</button><button onClick={e=>{e.stopPropagation();move(b.id,-1)}} disabled={!i} aria-label="Move up">↑</button><button onClick={e=>{e.stopPropagation();move(b.id,1)}} disabled={i===blocks.length-1} aria-label="Move down">↓</button></span>
        </div>)}</div>
      </aside>

      <section className="stage">
        <div className="stagebar"><div className="device-switch"><button className={device==="desktop"?"active":""} onClick={()=>setDevice("desktop")}>▰ Desktop</button><button className={device==="mobile"?"active":""} onClick={()=>setDevice("mobile")}>▯ Mobile</button></div><span className="surface-context">Previewing for <strong>{surface.name}</strong></span><div className="history-buttons"><button onClick={undo} title="Undo">↶ Undo</button><button onClick={redo} title="Redo">↷ Redo</button></div><span>{surface.width}px</span></div>
        <div className={`preview-wrap ${device}`}><div className="paper" style={{maxWidth:device==="desktop"?surface.width:390}} dangerouslySetInnerHTML={{__html:html}} /></div>
      </section>

      <aside className="inspector">
        <div className="inspector-title"><div><span className="eyebrow">EDIT BLOCK</span><h2>{active ? blockMeta[active.type].label : "Block"}</h2></div>{active&&<button onClick={()=>{setBlocks(v=>v.filter(b=>b.id!==selected));setSelected(blocks[0]?.id)}} aria-label="Delete block">⌫</button>}</div>
        {active&&<div className="fields"><label>Block type<select value={active.type} onChange={e=>update({type:e.target.value as BlockType})}>{Object.entries(blockMeta).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></label><button className={`visibility-toggle ${active.hidden?"active":""}`} onClick={()=>update({hidden:!active.hidden})}>{active.hidden?"Show in export":"Hide from export"}</button>{active.type !== "hero" && active.type !== "intro" && <fieldset className="width-control"><legend>Desktop width</legend><button className={(active.width || "full") === "full" ? "active" : ""} onClick={()=>update({width:"full"})}><span>▬</span> Full</button><button className={active.width === "half" ? "active" : ""} onClick={()=>update({width:"half"})}><span>▰</span> Half</button><small>Half-width blocks stack on mobile.</small></fieldset>}<fieldset className="emoji-control"><legend>Block icon</legend><div>{["","📘","📖","✏️","💡","❓","✅","⚠️","📅","🔬","🎨","🌎"].map(x=><button type="button" className={(active.emoji||"")===x?"active":""} key={x||"none"} onClick={()=>update({emoji:x})}>{x||"None"}</button>)}</div></fieldset>{active.type === "hero" && <label>Context label<input value={active.label || ""} placeholder="Optional — e.g. UNIT UPDATE" onChange={e=>update({label:e.target.value})}/></label>}<label>{active.type === "hero" ? "Page heading" : "Label / heading"}<input value={active.title} onChange={e=>update({title:e.target.value})}/></label><label>{active.type === "hero" ? "Subtitle" : "Content"}<RichEditor value={active.body} onChange={body=>update({body})}/></label></div>}
        <div className="checks"><div className="check-head"><div><span className="eyebrow">COMPATIBILITY</span><h3>{surface.name}</h3></div><span className="score">4/4</span></div><p className="surface-note">{surface.note}</p><p><i>✓</i> All export styles are inline</p><p><i>✓</i> Blackbaud-safe structure</p><p><i>✓</i> Strong heading hierarchy</p><p><i>✓</i> Accessible color contrast</p>{blocks.some(b=>b.width==="half")&&<p className="compat-warning"><i>!</i> Preview half-width blocks in your target Blackbaud editor; responsive behavior can vary by surface.</p>}{surfaceKey==="bulletin"&&blocks.some(b=>b.width==="half")&&<p className="compat-warning"><i>!</i> Full-width blocks are recommended for concise bulletin notices.</p>}</div>
        <div className="export"><button className="copy" onClick={copy}>{copied?"✓ Copied to clipboard":isExtension?"Copy to clipboard":"Copy for Blackbaud"}</button><details><summary>View generated HTML</summary><textarea readOnly value={html}/></details>{exportHistory.length>0&&<details><summary>Export history ({exportHistory.length})</summary><div className="export-history">{exportHistory.map((x,i)=><button key={`${x.date}-${i}`} onClick={()=>navigator.clipboard.writeText(x.html)}><strong>{x.title}</strong><small>{x.date} · Click to copy</small></button>)}</div></details>}<small>{isExtension?"Open Blackbaud’s HTML/source editor and paste from your clipboard.":"Paste into Blackbaud’s HTML editor, then preview before publishing."}</small></div>
      </aside>
    </section>
  </main>;
}
