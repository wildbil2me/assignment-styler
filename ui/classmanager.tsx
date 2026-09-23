import { useCallback, useEffect, useRef, useState } from "react";

import { ASSUMED_PAGE_BACKGROUND, contrastRatio, readableOn, requiredRatio } from "../core/checks.ts";
import type { Palette, Profile, SchoolClass, StyleKey } from "../core/model.ts";
import { palettes, paletteKeys } from "../core/palettes.ts";
import { defaultProfile, profiles } from "../core/profiles/index.ts";
import { emptyCustomPalette } from "../core/storage.ts";
import { Dialog } from "./dialog.tsx";
import { Icon } from "./icon.tsx";
import type { Composer } from "./state.ts";

function contrastRows(palette: Palette, profile: Profile) {
  const size = (value: string) => parseFloat(value) || 0;
  const bold = size(profile.fontWeights.bold) || 700;
  const pairs = [
    { what: "Card heading on card", fg: palette.primary, bg: palette.surface, px: size(profile.heading.size), weight: size(profile.heading.weight) || bold },
    { what: "Body text on card", fg: profile.colors.text, bg: palette.surface, px: size(profile.fontSizes.body), weight: size(profile.fontWeights.normal) || 400 },
    // The colour the eyebrow is rendered in, which for a mid-tone accent is a
    // darkened variant of it. This row reported a failure a teacher had no way
    // to act on until the renderer started deriving one.
    { what: "Label on the page", fg: readableOn(palette.accent, ASSUMED_PAGE_BACKGROUND, requiredRatio(size(profile.fontSizes.label), bold)), bg: ASSUMED_PAGE_BACKGROUND, px: size(profile.fontSizes.label), weight: bold },
  ];
  return pairs.map(pair => {
    const ratio = contrastRatio(pair.fg, pair.bg), required = requiredRatio(pair.px, pair.weight);
    return { what: pair.what, required, ratio: ratio === null ? "—" : `${ratio.toFixed(2)}:1`, ok: ratio !== null && ratio >= required };
  });
}

type Draft = { name: string; palette: Palette; fonts: Profile["fonts"] };

const draftFromClass = (cls: SchoolClass): Draft => ({ name: cls.name, palette: { ...cls.customPalette }, fonts: { ...cls.fonts } });
const blankDraft = (): Draft => ({ name: "", palette: emptyCustomPalette(), fonts: defaultProfile.fonts });

/**
 * Parses the same JSON shape the style editor has exported since Phase 4
 * (`{ palette, profile, fonts }`, or a bare palette). A file that fails this
 * is neither a class nor a style, so the caller reports it rather than the
 * draft silently keeping whatever it already had.
 */
async function parseClassFile(file: File): Promise<Draft | null> {
  try {
    const parsed = JSON.parse(await file.text());
    const source = parsed.palette || parsed;
    if (!source?.primary || !source?.accent) return null;
    const fontsIn = parsed.fonts || (source.heading && source.body ? { heading: source.heading, body: source.body } : null);
    const fallback = blankDraft().fonts;
    return {
      name: typeof parsed.name === "string" ? parsed.name : (typeof source.className === "string" ? source.className : ""),
      palette: { ...emptyCustomPalette(), ...source, name: "Custom" },
      fonts: fontsIn ? { heading: fontsIn.heading || fallback.heading, body: fontsIn.body || fallback.body } : fallback,
    };
  } catch {
    return null;
  }
}

/**
 * The "Add a class" chooser, the create/edit form, and the dialogs behind
 * both — everything a shell needs to let a teacher manage classes, dropped in
 * as one component so the composer and the side panel cannot drift.
 *
 * `compact` trims labels for the panel's narrower bar; the behaviour is
 * identical either way.
 */
export function ClassManager({ c, compact = false }: { c: Composer; compact?: boolean }) {
  const {
    classes, activeClassId, switchClass, addClass, renameClass, removeClass,
    profileKey, palette, announce,
    setStyleKey, setCustomPalette, setFonts,
  } = c;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [message, setMessage] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuFileRef = useRef<HTMLInputElement>(null);
  const dialogFileRef = useRef<HTMLInputElement>(null);
  const closeEditor = useCallback(() => setEditorOpen(null), []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);

  const openCreate = () => { setDraft(blankDraft()); setMessage(""); setMenuOpen(false); setEditorOpen("create"); };
  const openEdit = () => {
    const active = classes.find(cls => cls.id === activeClassId);
    if (active) setDraft(draftFromClass(active));
    setMessage("");
    setMenuOpen(false);
    setEditorOpen("edit");
  };
  const chooseImport = () => { setMenuOpen(false); menuFileRef.current?.click(); };
  const applyPreset = (key: Exclude<StyleKey, "custom">) => setDraft(value => ({
    ...value,
    name: value.name || palettes[key].className,
    palette: { ...palettes[key], name: "Custom" },
  }));

  const handleMenuImport = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const result = await parseClassFile(file);
    if (!result) { announce("That file is not a valid BBStyler class or style."); return; }
    setDraft(result);
    setMessage("");
    setEditorOpen("create");
  };
  const handleDialogImport = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const result = await parseClassFile(file);
    if (!result) { setMessage("That file is not a valid BBStyler class or style. Choose a JSON file exported by BBStyler."); return; }
    setDraft(value => ({ name: value.name || result.name, palette: result.palette, fonts: result.fonts }));
    setMessage("");
    announce(`Imported ${file.name}.`);
  };

  const exportDraft = () => {
    const payload = { version: 2, name: draft.name || "Custom", palette: { ...draft.palette, name: "Custom" }, profile: profileKey, fonts: draft.fonts };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(draft.name || "class-style").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "class-style"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    announce("Exported the class as JSON.");
  };
  const saveDraft = () => {
    const name = draft.name.trim() || "Untitled class";
    const customPaletteOut = { ...draft.palette, name: "Custom" };
    if (editorOpen === "edit") {
      setStyleKey("custom");
      setCustomPalette(customPaletteOut);
      setFonts(draft.fonts);
      renameClass(activeClassId, name);
      announce(`Updated ${name}.`);
    } else {
      const created = addClass({ name, styleKey: "custom", customPalette: customPaletteOut, fonts: draft.fonts });
      announce(`Added the class ${created.name}.`);
    }
    setEditorOpen(null);
  };
  const deleteActive = () => {
    if (classes.length <= 1) return;
    const target = classes.find(cls => cls.id === activeClassId);
    if (!window.confirm(`Delete ${target?.name ?? "this class"}? This removes its saved colors and fonts.`)) return;
    removeClass(activeClassId);
    announce(`Deleted ${target?.name ?? "the class"}.`);
    setEditorOpen(null);
  };

  return <>
    <label className="class-picker">
      {/* conformance-ignore CODE-08 palette.accent is teacher-selected runtime data. */}
      <span className="class-dot" style={{ background: palette.accent }} aria-hidden="true" />
      {/* conformance-ignore FORM-05 Enclosing label and aria-label both name the class select. */}
      <select value={activeClassId} onChange={event => switchClass(Number(event.target.value))} aria-label="Class">
        {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
      </select>
    </label>
    <div className="class-add">
      <button ref={menuButtonRef} className="class-icon-button" aria-label="Add class" title="Add class" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><Icon name="add" /></button>
      {menuOpen && <div className="post-menu-popover" role="menu">
        <button role="menuitem" onClick={openCreate}><span aria-hidden="true"><Icon name="add" /></span><div><strong>Create a new class</strong><small>Start from a subject color or blank</small></div></button>
        <button role="menuitem" onClick={chooseImport}><span aria-hidden="true"><Icon name="upload" /></span><div><strong>Import a class</strong><small>From a class or style file someone shared</small></div></button>
      </div>}
      {/* conformance-ignore FORM-05 The adjacent Import a class menu item names and opens this hidden input. */}
      <input ref={menuFileRef} className="sr-only" tabIndex={-1} aria-label="Import class JSON" type="file" accept="application/json,.json" onChange={event => handleMenuImport(event.target)} />
    </div>
    {compact
      ? <button className="class-icon-button" aria-label="Edit class" title="Edit class" onClick={openEdit}><Icon name="more" /></button>
      : <button className="style-edit-button" onClick={openEdit}>Edit class</button>}

    {editorOpen && <Dialog labelledBy="class-editor-title" onClose={closeEditor}>
      <header>
        <div><span className="eyebrow">{editorOpen === "edit" ? "CLASS STYLE" : "NEW CLASS"}</span><h2 id="class-editor-title">{editorOpen === "edit" ? "Edit this class" : "Create a class"}</h2></div>
        <button onClick={closeEditor} aria-label="Close class editor" title="Close class editor"><Icon name="close" /></button>
      </header>
      <div className="style-form">
        {/* conformance-ignore FORM-05 The class-name input is nested directly in its visible label. */}
        <label>Class name<input value={draft.name} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} placeholder="e.g. AP Biology, 2nd period" /></label>
        <div className="preset-row">
          {/* conformance-ignore CODE-08 Each swatch is a live specimen of that subject's own colors. */}
          {paletteKeys.map(key => <button key={key} type="button" className="preset-swatch" style={{ background: palettes[key].accent, borderColor: palettes[key].primary }} title={`Start from ${palettes[key].name}`} onClick={() => applyPreset(key)}>{palettes[key].name}</button>)}
        </div>
        <div className="color-grid">
          <label>Primary color<span><input aria-label="Primary color" type="color" value={draft.palette.primary} onChange={event => setDraft(value => ({ ...value, palette: { ...value.palette, primary: event.target.value } }))} />{draft.palette.primary}</span></label>
          <label>Accent color<span><input aria-label="Accent color" type="color" value={draft.palette.accent} onChange={event => setDraft(value => ({ ...value, palette: { ...value.palette, accent: event.target.value } }))} />{draft.palette.accent}</span></label>
          <label>Surface color<span><input aria-label="Surface color" type="color" value={draft.palette.surface} onChange={event => setDraft(value => ({ ...value, palette: { ...value.palette, surface: event.target.value } }))} />{draft.palette.surface}</span></label>
          <label>Highlight color<span><input aria-label="Highlight color" type="color" value={draft.palette.focus} onChange={event => setDraft(value => ({ ...value, palette: { ...value.palette, focus: event.target.value } }))} />{draft.palette.focus}</span></label>
        </div>
        {/* conformance-ignore FORM-05 Enclosing label and aria-label both name the heading-font select. */}
        <label>Heading font<select aria-label="Heading font" value={draft.fonts.heading} onChange={event => setDraft(value => ({ ...value, fonts: { ...value.fonts, heading: event.target.value } }))}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label>
        {/* conformance-ignore FORM-05 Enclosing label and aria-label both name the body-font select. */}
        <label>Body font<select aria-label="Body font" value={draft.fonts.body} onChange={event => setDraft(value => ({ ...value, fonts: { ...value.fonts, body: event.target.value } }))}><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Trebuchet MS, sans-serif">Trebuchet</option><option value="Verdana, sans-serif">Verdana</option></select></label>
        {message && <p className="form-error" role="alert">{message}</p>}
        <div className="contrast-readout">{contrastRows(draft.palette, profiles[profileKey]).map(row => <div key={row.what} className={row.ok ? "contrast-ok" : "contrast-bad"}><span>{row.what}<br /><small>needs {row.required}:1</small></span><b>{row.ratio}</b></div>)}</div>
        <p className="import-help">Colors and fonts belong to this class. The visual style — {profiles[profileKey].name.toLowerCase()} — applies to every class.</p>
        {/* conformance-ignore CODE-08 The swatch is a live specimen of teacher-selected runtime colors and fonts. */}
        <div className="style-swatch" style={{ borderColor: draft.palette.accent, background: draft.palette.surface }}><strong style={{ color: draft.palette.primary, fontFamily: draft.fonts.heading }}>{draft.name || "Class style preview"}</strong><p style={{ fontFamily: draft.fonts.body }}>Clear, consistent content for this class.</p></div>
      </div>
      <footer>
        <button className="secondary" onClick={() => dialogFileRef.current?.click()}>Import JSON</button>
        {/* conformance-ignore FORM-05 The adjacent Import JSON button names and opens this hidden file input. */}
        <input ref={dialogFileRef} className="sr-only" tabIndex={-1} aria-label="Import class style JSON" type="file" accept="application/json,.json" onChange={event => handleDialogImport(event.target)} />
        <button className="secondary" onClick={exportDraft}>Export JSON</button>
        {editorOpen === "edit" && classes.length > 1 && <button className="secondary danger" onClick={deleteActive}>Delete class</button>}
        <span className="footer-spacer" />
        <button className="secondary" onClick={closeEditor}>Cancel</button>
        <button className="apply-style" onClick={saveDraft}>{editorOpen === "edit" ? "Save class" : "Create class"}</button>
      </footer>
    </Dialog>}
  </>;
}
