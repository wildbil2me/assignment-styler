import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Block, Palette, Profile, ProfileKey, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, defaultProfile, withFonts } from "../core/profiles/index.ts";
import { surfaces } from "../core/surfaces.ts";
import { templates, starter } from "../core/templates.ts";
import { renderHtml } from "../core/render.ts";
import { runChecks } from "../core/checks.ts";
import { nextId, nextIds } from "../core/ids.ts";
import { duplicateIn, neighbourOf, removeFrom } from "../core/blocks.ts";
import {
  defaultAdapter, emptyCustomPalette, SCHEMA_VERSION,
  type SavedPost, type StorageAdapter, type Workspace,
} from "../core/storage.ts";

/**
 * Everything both shells need to be the same program.
 *
 * The full editor on Pages and the quick-post side panel differ only in how much
 * chrome they draw around this hook — same blocks, same schema, same render
 * call. A behaviour that lives here cannot drift between the two.
 *
 * Where the workspace is *kept* does differ, and `core/storage.ts` owns that:
 * the side panel gets `chrome.storage.local`, the web app gets `localStorage`,
 * and neither can see the other's. The shape is versioned and migrated in one
 * place rather than picked apart defensively here.
 */

export type { SavedPost };
export type ExportRecord = { date: string; title: string; html: string };

export type ComposerOptions = {
  /** What to show before storage is read. The panel opens on a template. */
  initialBlocks?: Block[];
  initialSelected?: number;
  initialTitle?: string;
  /** Injectable so tests and either shell can say where the workspace lives. */
  adapter?: StorageAdapter;
};

export function useComposer({
  initialBlocks = starter,
  initialSelected = 3,
  initialTitle = "Tuesday’s class post",
  adapter,
}: ComposerOptions = {}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [postTitle, setPostTitle] = useState(initialTitle);
  const [selected, setSelected] = useState(initialSelected);
  const [styleKey, setStyleKey] = useState<StyleKey>("english");
  const [profileKey, setProfileKey] = useState<ProfileKey>(defaultProfile.id);
  const [fonts, setFonts] = useState<Profile["fonts"]>(defaultProfile.fonts);
  const [customPalette, setCustomPalette] = useState<Palette>(emptyCustomPalette);
  const [surfaceKey, setSurfaceKey] = useState<SurfaceKey>("bulletin");
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saved");
  const past = useRef<Block[][]>([]), future = useRef<Block[][]>([]), previous = useRef<Block[]>(initialBlocks), historyAction = useRef(false);
  const dragged = useRef<number | null>(null);
  const formatterRef = useRef<(command: string, argument?: string) => void>(() => undefined);
  const palette = styleKey === "custom" ? customPalette : palettes[styleKey];
  // Profile is the feel, palette is the subject. The teacher's font choice is a
  // profile override rather than a fourth profile.
  const profile = useMemo(() => withFonts(profiles[profileKey], fonts), [profileKey, fonts]);
  const surface = surfaces[surfaceKey];
  const html = useMemo(() => renderHtml(blocks, profile, palette, surface), [blocks, profile, palette, surface]);
  // The checks read the same inputs as the render, and are handed the output
  // they just produced rather than rendering it a second time.
  const report = useMemo(
    () => runChecks(blocks, profile, palette, surface, undefined, html),
    [blocks, profile, palette, surface, html]
  );
  const active = blocks.find(b => b.id === selected);

  /** One object, one schema — the thing that is saved and the thing that is exported. */
  const workspace = useMemo<Workspace>(
    () => ({ version: SCHEMA_VERSION, blocks, postTitle, styleKey, surfaceKey, profileKey, fonts, customPalette, savedPosts }),
    [blocks, postTitle, styleKey, surfaceKey, profileKey, fonts, customPalette, savedPosts]
  );

  /** Adopt a restored or imported workspace wholesale. */
  const restore = (w: Workspace) => {
    setBlocks(w.blocks);
    setPostTitle(w.postTitle);
    setStyleKey(w.styleKey);
    setSurfaceKey(w.surfaceKey);
    setProfileKey(w.profileKey);
    setFonts(w.fonts);
    setCustomPalette(w.customPalette);
    setSavedPosts(w.savedPosts);
    setSelected(w.blocks[0]?.id ?? 0);
    // A restore is a new document, not an edit — undoing back into the previous
    // teacher's post would be a strange thing to offer.
    past.current = [];
    future.current = [];
    previous.current = w.blocks;
  };

  const store = useRef(adapter ?? defaultAdapter());
  const hydrated = useRef(false);

  useEffect(() => {
    let live = true;
    store.current.load().then(w => {
      if (live && w) restore(w);
    }).finally(() => {
      hydrated.current = true;
      if (live) setReady(true);
    });
    return () => { live = false };
  }, []);

  useEffect(()=>{const before=JSON.stringify(previous.current),after=JSON.stringify(blocks);if(before!==after){if(!historyAction.current){past.current.push(previous.current);if(past.current.length>50)past.current.shift();future.current=[]}previous.current=blocks;historyAction.current=false}},[blocks]);

  // Debounced autosave, and never before the first load has answered — an async
  // adapter means an early save would otherwise overwrite the stored workspace
  // with the defaults that were on screen while it was still loading.
  useEffect(() => {
    if (!hydrated.current) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      store.current.save(workspace).then(saved => setSaveStatus(saved ? "saved" : "error"));
    }, 250);
    return () => clearTimeout(timer);
  }, [workspace]);

  // Stable identity on purpose. The preview keys its inline editors off this
  // function, so a new one every render tore every editor down and rebuilt it
  // mid-edit — see the dirty-field note in ui/preview.tsx.
  const updateBlock = useCallback((id: number, patch: Partial<Block>) => setBlocks(value => {
    let changed = false;
    const next = value.map(block => {
      if (block.id !== id || Object.entries(patch).every(([key, field]) => block[key as keyof Block] === field)) return block;
      changed = true;
      return { ...block, ...patch };
    });
    return changed ? next : value;
  }), []);
  const update = (patch: Partial<Block>) => updateBlock(selected, patch);
  const format = (command: string, argument?: string) => formatterRef.current(command, argument);
  const move = (id: number, by: number) => setBlocks(v => { const i=v.findIndex(b=>b.id===id), j=i+by; if(j<0||j>=v.length)return v; const n=[...v]; [n[i],n[j]]=[n[j],n[i]]; return n; });
  const addBlock = () => {const id=nextId();setBlocks(v=>[...v,{id,type:"note",title:"Note",body:"Add your note here."}]);setSelected(id)};
  // The removal is functional so that an edit committed into the same batch —
  // the blur that the delete click itself caused — is not thrown away with a
  // whole-array write built from the pre-blur snapshot. Selection is still
  // derived from the rendered list, which is what the teacher was looking at.
  const deleteBlock = () => {
    if (!blocks.some(b => b.id === selected)) return;
    const target = selected;
    setBlocks(v => removeFrom(v, target));
    setSelected(neighbourOf(blocks, target));
  };
  // The copy is built inside the updater, from the array React actually holds.
  // Reading it from the closure meant duplicating a block whose open editor had
  // just been blurred by this very click produced a copy of the *pre-edit*
  // text — see core/blocks.ts.
  const duplicateBlock = useCallback((id: number) => {
    const newId = nextId();
    setBlocks(v => duplicateIn(v, id, newId));
    setSelected(newId);
  }, []);
  const dropBlock = (target:number) => {const source=dragged.current;if(source===null||source===target)return;setBlocks(v=>{const n=[...v],from=n.findIndex(b=>b.id===source),to=n.findIndex(b=>b.id===target);const [item]=n.splice(from,1);n.splice(to,0,item);return n});dragged.current=null};
  const announce = (message: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 20);
  };
  const copy = async () => { await navigator.clipboard.writeText(html); setExportHistory(v=>[{date:new Date().toLocaleString(),title:postTitle,html},...v].slice(0,10)); setCopied(true); announce("Copied the generated HTML to the clipboard."); setTimeout(()=>setCopied(false),1800); };
  const undo = () => {const prior=past.current.pop();if(!prior)return;future.current.push(blocks);historyAction.current=true;setBlocks(prior)};
  const redo = () => {const next=future.current.pop();if(!next)return;past.current.push(blocks);historyAction.current=true;setBlocks(next)};
  // Named `applyTemplate`, not `useTemplate`: the old name made every linter and
  // reader treat a plain callback as a React hook, and it was reported as a
  // rules-of-hooks violation for exactly that reason.
  const applyTemplate = (name:string) => {const source=templates[name];if(!source)return;const ids=nextIds(source.length),next=source.map((b,i)=>({...b,id:ids[i]}));setBlocks(next);setSelected(ids[0]);setPostTitle(name);};

  return {
    blocks, setBlocks, postTitle, setPostTitle, selected, setSelected, active,
    styleKey, setStyleKey, profileKey, setProfileKey, fonts, setFonts,
    customPalette, setCustomPalette, surfaceKey, setSurfaceKey,
    savedPosts, setSavedPosts, exportHistory, palette, profile, surface, html, report,
    copied, announcement, ready, saveStatus, dragged, formatterRef, workspace, restore,
    announce, update, updateBlock, format, move, addBlock, deleteBlock, duplicateBlock, dropBlock, copy, undo, redo, applyTemplate,
  };
}

export type Composer = ReturnType<typeof useComposer>;
