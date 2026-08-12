import { useEffect, useMemo, useRef, useState } from "react";

import type { Block, Palette, Profile, ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, defaultProfile, withFonts } from "../core/profiles/index.ts";
import { surfaces } from "../core/surfaces.ts";
import { templates, starter } from "../core/templates.ts";
import { renderHtml } from "../core/render.ts";

/**
 * Everything both shells need to be the same program.
 *
 * The full editor on Pages and the quick-post side panel differ only in how much
 * chrome they draw around this hook — same blocks, same storage key, same render
 * call. A behaviour that lives here cannot drift between the two.
 *
 * Storage is deliberately still `localStorage`, not `chrome.storage`: it works
 * identically in a side panel and on Pages, so one synchronous load path serves
 * both. Phase 4 owns versioning, migration and whole-workspace export, and that
 * is when an async adapter earns its cost.
 */

export type SavedPost = { id: number; title: string; blocks: Block[] };
export type ExportRecord = { date: string; title: string; html: string };

export type ComposerOptions = {
  /** What to show before storage is read. The panel opens on a template. */
  initialBlocks?: Block[];
  initialSelected?: number;
  initialTitle?: string;
};

export function useComposer({
  initialBlocks = starter,
  initialSelected = 3,
  initialTitle = "Tuesday’s class post",
}: ComposerOptions = {}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [postTitle, setPostTitle] = useState(initialTitle);
  const [selected, setSelected] = useState(initialSelected);
  const [styleKey, setStyleKey] = useState<StyleKey>("english");
  const [profileKey, setProfileKey] = useState<ProfileKey>(defaultProfile.id);
  const [fonts, setFonts] = useState<Profile["fonts"]>(defaultProfile.fonts);
  const [customPalette, setCustomPalette] = useState<Palette>({...palettes.english,name:"Custom",className:"My Custom Style"});
  const [surfaceKey, setSurfaceKey] = useState<SurfaceKey>("bulletin");
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const past = useRef<Block[][]>([]), future = useRef<Block[][]>([]), previous = useRef<Block[]>(initialBlocks), historyAction = useRef(false);
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
  const addBlock = () => {const id=Date.now();setBlocks(v=>[...v,{id,type:"note",title:"Note",body:"Add your note here."}]);setSelected(id)};
  const deleteBlock = () => {setBlocks(v=>v.filter(b=>b.id!==selected));setSelected(blocks[0]?.id)};
  const duplicateBlock = (id:number) => {const i=blocks.findIndex(b=>b.id===id);if(i<0)return;const copy={...blocks[i],id:Date.now(),title:`${blocks[i].title} copy`};setBlocks(v=>[...v.slice(0,i+1),copy,...v.slice(i+1)]);setSelected(copy.id)};
  const dropBlock = (target:number) => {const source=dragged.current;if(source===null||source===target)return;setBlocks(v=>{const n=[...v],from=n.findIndex(b=>b.id===source),to=n.findIndex(b=>b.id===target);const [item]=n.splice(from,1);n.splice(to,0,item);return n});dragged.current=null};
  const copy = async () => { await navigator.clipboard.writeText(html); setExportHistory(v=>[{date:new Date().toLocaleString(),title:postTitle,html},...v].slice(0,10)); setCopied(true); setTimeout(()=>setCopied(false),1800); };
  const undo = () => {const prior=past.current.pop();if(!prior)return;future.current.push(blocks);historyAction.current=true;setBlocks(prior)};
  const redo = () => {const next=future.current.pop();if(!next)return;past.current.push(blocks);historyAction.current=true;setBlocks(next)};
  const useTemplate = (name:string) => {const source=templates[name];if(!source)return;const stamp=Date.now(),next=source.map((b,i)=>({...b,id:stamp+i}));setBlocks(next);setSelected(stamp);setPostTitle(name);};

  return {
    blocks, setBlocks, postTitle, setPostTitle, selected, setSelected, active,
    styleKey, setStyleKey, profileKey, setProfileKey, fonts, setFonts,
    customPalette, setCustomPalette, surfaceKey, setSurfaceKey,
    savedPosts, setSavedPosts, exportHistory, palette, profile, surface, html,
    copied, dragged,
    update, move, addBlock, deleteBlock, duplicateBlock, dropBlock, copy, undo, redo, useTemplate,
  };
}

export type Composer = ReturnType<typeof useComposer>;
