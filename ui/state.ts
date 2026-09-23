import { useEffect, useMemo, useRef, useState } from "react";

import type { Block, Palette, Profile, ProfileKey, SchoolClass, StyleKey, SurfaceKey } from "../core/model.ts";
import { palettes } from "../core/palettes.ts";
import { profiles, defaultProfile, withFonts } from "../core/profiles/index.ts";
import { surfaces } from "../core/surfaces.ts";
import { templates, starter } from "../core/templates.ts";
import { renderHtml } from "../core/render.ts";
import { runChecks } from "../core/checks.ts";
import { nextId, nextIds } from "../core/ids.ts";
import {
  backupFilename, defaultAdapter, emptyCustomPalette, parse, serialize,
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
  const [classes, setClasses] = useState<SchoolClass[]>(() => [{
    id: nextId(),
    name: palettes.english.className,
    styleKey: "english",
    customPalette: emptyCustomPalette(),
    fonts: defaultProfile.fonts,
  }]);
  const [activeClassId, setActiveClassId] = useState<number>(() => classes[0].id);
  const [profileKey, setProfileKey] = useState<ProfileKey>(defaultProfile.id);
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
  // A class carries the colours and fonts a teacher picked for it; the visual
  // style (profile) is a workspace-wide preference every class shares.
  const activeClass = classes.find(c => c.id === activeClassId) ?? classes[0];
  const styleKey = activeClass.styleKey;
  const customPalette = activeClass.customPalette;
  const fonts = activeClass.fonts;
  const patchActiveClass = (patch: Partial<SchoolClass>) =>
    setClasses(list => list.map(c => (c.id === activeClass.id ? { ...c, ...patch } : c)));
  const setStyleKey = (value: StyleKey) => patchActiveClass({ styleKey: value });
  const setCustomPalette = (value: Palette) => patchActiveClass({ customPalette: value });
  const setFonts = (value: Profile["fonts"]) => patchActiveClass({ fonts: value });
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
    () => ({ version: 2, blocks, postTitle, surfaceKey, profileKey, classes, activeClassId, savedPosts }),
    [blocks, postTitle, surfaceKey, profileKey, classes, activeClassId, savedPosts]
  );

  /** Adopt a restored or imported workspace wholesale. */
  const restore = (w: Workspace) => {
    setBlocks(w.blocks);
    setPostTitle(w.postTitle);
    setSurfaceKey(w.surfaceKey);
    setProfileKey(w.profileKey);
    setClasses(w.classes);
    setActiveClassId(w.activeClassId);
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

  const updateBlock = (id: number, patch: Partial<Block>) => setBlocks(value => {
    let changed = false;
    const next = value.map(block => {
      if (block.id !== id || Object.entries(patch).every(([key, field]) => block[key as keyof Block] === field)) return block;
      changed = true;
      return { ...block, ...patch };
    });
    return changed ? next : value;
  });
  const update = (patch: Partial<Block>) => updateBlock(selected, patch);
  const format = (command: string, argument?: string) => formatterRef.current(command, argument);
  const move = (id: number, by: number) => setBlocks(v => { const i=v.findIndex(b=>b.id===id), j=i+by; if(j<0||j>=v.length)return v; const n=[...v]; [n[i],n[j]]=[n[j],n[i]]; return n; });
  const addBlock = () => {const id=nextId();setBlocks(v=>[...v,{id,type:"note",title:"Note",body:"Add your note here."}]);setSelected(id)};
  // Carried-forward bug #5: this used to call `setSelected(blocks[0]?.id)` against
  // the *pre-deletion* array, so deleting the first block re-selected the block it
  // had just removed and the inspector went blank. Select the neighbour instead —
  // the one that slid into its place, or the new last block.
  const deleteBlock = (id: number = selected) => {
    const i = blocks.findIndex(b => b.id === id);
    if (i < 0) return;
    const remaining = blocks.filter(b => b.id !== id);
    setBlocks(remaining);
    // The block list deletes any row, not only the selected one, so removing a
    // block elsewhere in the document has to leave the selection where the
    // teacher put it rather than swap the inspector out from under them.
    if (id === selected) setSelected(remaining[Math.min(i, remaining.length - 1)]?.id ?? 0);
  };
  const duplicateBlock = (id:number) => {const i=blocks.findIndex(b=>b.id===id);if(i<0)return;const copy={...blocks[i],id:nextId(),title:`${blocks[i].title} copy`};setBlocks(v=>[...v.slice(0,i+1),copy,...v.slice(i+1)]);setSelected(copy.id)};
  const dropBlock = (target:number) => {const source=dragged.current;if(source===null||source===target)return;setBlocks(v=>{const n=[...v],from=n.findIndex(b=>b.id===source),to=n.findIndex(b=>b.id===target);const [item]=n.splice(from,1);n.splice(to,0,item);return n});dragged.current=null};
  const announce = (message: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 20);
  };
  const copy = async () => { await navigator.clipboard.writeText(html); setExportHistory(v=>[{date:new Date().toLocaleString(),title:postTitle,html},...v].slice(0,10)); setCopied(true); announce("Copied the generated HTML to the clipboard."); setTimeout(()=>setCopied(false),1800); };
  /**
   * A whole workspace out to a file the teacher owns, and back in again.
   *
   * These live here rather than in either shell because the panel needs them
   * more than the composer does: its `chrome.storage.local` is a different
   * origin from the web app, so a downloaded backup is the only way a post
   * composed in the side panel ever reaches another browser — or survives an
   * uninstall. Two copies of "what a backup contains" is exactly the drift this
   * hook exists to prevent.
   */
  const backupWorkspace = () => {
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([serialize(workspace)], { type: "application/json" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFilename(postTitle, today);
    // Attached and revoked late on purpose. A detached anchor does not fire in
    // every browser, and revoking in the same tick can cancel the download
    // before it starts — survivable in the composer, which has other exits, and
    // not in the panel, where this file is the only one a teacher's work has.
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      anchor.remove();
    }, 1000);
    announce("Downloaded a permanent backup of the complete workspace.");
  };
  /** False when nothing was replaced, so a caller can leave its menu open. */
  const restoreFromFile = async (file?: File) => {
    if (!file) return false;
    const result = parse(await file.text());
    if (!result.workspace) {
      announce(result.message);
      return false;
    }
    if (!window.confirm(`${result.message}\n\nThis replaces everything currently in the composer. Continue?`)) return false;
    restore(result.workspace);
    announce("Restored the workspace from the selected backup.");
    return true;
  };
  const undo = () => {const prior=past.current.pop();if(!prior)return;future.current.push(blocks);historyAction.current=true;setBlocks(prior)};
  const redo = () => {const next=future.current.pop();if(!next)return;past.current.push(blocks);historyAction.current=true;setBlocks(next)};
  // Named `applyTemplate`, not `useTemplate`: the old name made every linter and
  // reader treat a plain callback as a React hook, and it was reported as a
  // rules-of-hooks violation for exactly that reason.
  const applyTemplate = (name:string) => {const source=templates[name];if(!source)return;const ids=nextIds(source.length),next=source.map((b,i)=>({...b,id:ids[i]}));setBlocks(next);setSelected(ids[0]);setPostTitle(name);};

  /** A brand-new class, switched to immediately — the "Create a new class" path. */
  const addClass = (input: { name: string; styleKey: StyleKey; customPalette: Palette; fonts: Profile["fonts"] }): SchoolClass => {
    const created: SchoolClass = { ...input, id: nextId(), name: input.name.trim() || "Untitled class" };
    setClasses(list => [...list, created]);
    setActiveClassId(created.id);
    return created;
  };
  const switchClass = (id: number) => setActiveClassId(id);
  const renameClass = (id: number, name: string) =>
    setClasses(list => list.map(c => (c.id === id ? { ...c, name: name.trim() || "Untitled class" } : c)));
  /** Refuses to empty the list — a workspace with no classes has no style to render with. */
  const removeClass = (id: number) => {
    if (classes.length <= 1) return;
    const remaining = classes.filter(c => c.id !== id);
    setClasses(remaining);
    if (activeClassId === id) setActiveClassId(remaining[0].id);
  };

  return {
    blocks, setBlocks, postTitle, setPostTitle, selected, setSelected, active,
    styleKey, setStyleKey, profileKey, setProfileKey, fonts, setFonts,
    customPalette, setCustomPalette, surfaceKey, setSurfaceKey,
    classes, activeClassId, activeClass, addClass, switchClass, renameClass, removeClass,
    savedPosts, setSavedPosts, exportHistory, palette, profile, surface, html, report,
    copied, announcement, ready, saveStatus, dragged, formatterRef, workspace, restore,
    announce, update, updateBlock, format, move, addBlock, deleteBlock, duplicateBlock, dropBlock, copy, undo, redo, applyTemplate,
    backupWorkspace, restoreFromFile,
  };
}

export type Composer = ReturnType<typeof useComposer>;
